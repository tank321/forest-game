import { CONFIG } from '../config';
import { BUILDINGS, buildingGap, countOf, isActive, NEEDS, workersOf, type BuildingKind } from '../core/buildings';
import { linkedBuildings } from '../core/roads';
import { hireVillager, togglePause, upgrade } from '../core/commands';
import { canAfford, commission, maxLevel, popCap, upgradeCost, villagerCost, type UpgradeKind } from '../core/economy';
import { getStats, type Stats } from '../core/stats';
import { jobResource } from '../core/systems/workplace';
import type { Building, Cost, GameState, HireResource, Job, ResourceKey } from '../core/types';
import type { World } from '../core/world';
import { seasonName } from './seasonInfo';
import { BUILDING_TEXT, fmt, icon } from './text';

export interface Action {
  label: string;
  cost: Cost | null;
  enabled: boolean;
  run: () => void;
  thumb?: BuildingKind | 'road'; // shown as a parchment card with the building's (or a road's) sprite
  refund?: Cost;
  secondary?: boolean;
  danger?: boolean;
  hint?: string;
  upgrade?: {
    title: string;
    level: number;
    max: number;
    scope: string;
    rows: { label: string; current: string; next: string | null }[];
  };
}

type Selected = (w: World, b: Building) => Action[];
type Info = (w: World, b: Building) => string;

function hire(w: World, res: HireResource): Action {
  const s = w.state;
  const full = s.villagers.length >= popCap(s);
  const cost = villagerCost(s, res);
  return {
    label: full ? `Hire with ${res} (need a house)` : `Hire villager with ${res}`,
    cost,
    enabled: !full && canAfford(s, cost),
    run: () => hireVillager(w, res),
  };
}

/** Upgrade button with a before→after preview of the stats it touches. */
function upgradeAction(w: World, kind: UpgradeKind, title: string, preview: (st: Stats) => { label: string; value: string }[]): Action {
  const s = w.state;
  const lvl = s.upgrades[kind];
  const cost = upgradeCost(s, kind, lvl);
  const nxt: GameState = { ...s, upgrades: { ...s.upgrades, [kind]: lvl + 1 } };
  const current = preview(getStats(s));
  const next = cost ? preview(getStats(nxt)) : null;
  return {
    label: cost ? `Upgrade to level ${lvl + 1}` : 'Fully upgraded',
    cost,
    enabled: cost !== null && canAfford(s, cost),
    run: () => upgrade(w, kind),
    upgrade: {
      title,
      level: lvl,
      max: maxLevel(kind),
      scope: SCOPE[kind],
      rows: current.map((row, i) => ({ label: row.label, current: row.value, next: next?.[i].value ?? null })),
    },
  };
}

const SCOPE: Record<UpgradeKind, string> = {
  axe: 'Per lumberjack',
  farm: 'Shown for a farmer · orchardists, herders and pickers improve too',
  pick: 'Per miner',
  coats: 'Whole town · firewood is burned in winter',
  barrow: 'Every villager walks faster · every gatherer carries the same extra amount',
};

const perSec = (n: number, unit: string) => `${n.toFixed(2)} ${unit}/s`;

function pauseAction(w: World, b: Building): Action {
  const active = !w.state.paused.includes(b.id);
  return {
    label: active ? 'Pause production' : 'Resume production',
    hint: active ? 'Workers finish deliveries, then return to chopping.' : 'Available villagers will return to this workplace.',
    cost: null,
    enabled: true,
    run: () => togglePause(w, b.id),
  };
}

/** Actions offered when a building of each kind is selected. New buildings add an entry here. */
export const ACTIONS: Partial<Record<BuildingKind, Selected>> = {
  townCenter: (w) => [
    hire(w, 'wood'),
    hire(w, 'food'),
    hire(w, 'cloth'),
    upgradeAction(w, 'barrow', 'Wheelbarrow', (st) => [
      { label: 'Walking', value: `${st.speed.toFixed(2)} tiles/s` },
      { label: 'Extra carry', value: `+${st.carryBonus}` },
    ]),
    upgradeAction(w, 'coats', 'Coats', (st) => [{ label: 'Winter firewood', value: perSec(st.winterBurn, 'wood') }]),
  ],
  lumberCamp: (w) => [
    upgradeAction(w, 'axe', 'Axe upgrades', (st) => [
      { label: 'Speed', value: perSec(st.chopRate, 'wood') },
      { label: 'Carry', value: `${Math.round(st.carry)} wood` },
    ]),
  ],
  barn: (w) => [
    upgradeAction(w, 'farm', 'Farm upgrades', (st) => [
      { label: 'Speed', value: perSec(st.farmRate, 'food') },
      { label: 'Carry', value: `${Math.round(st.farmCarry)} food` },
    ]),
  ],
  farm: (w, b) => [pauseAction(w, b)],
  orchard: (w, b) => [pauseAction(w, b)],
  quarry: (w, b) => [
    upgradeAction(w, 'pick', 'Pick upgrades', (st) => [
      { label: 'Speed', value: perSec(st.mineRate, 'stone') },
      { label: 'Carry', value: `${Math.round(st.mineCarry)} stone` },
    ]),
    pauseAction(w, b),
  ],
  sheepFarm: (w, b) => [pauseAction(w, b)],
  cottonPlantation: (w, b) => [pauseAction(w, b)],
  tradingPost: (w, b) => [pauseAction(w, b)],
};

/**
 * Lifetime counter for the selected building: what its workers produced (workplaces) or what it
 * collected (drop-offs, the Tax Office). Undefined for buildings that gather nothing.
 */
export function tallyHtml(b: Building): string | undefined {
  const d = BUILDINGS[b.kind];
  const base: readonly ResourceKey[] = d.job ? [jobResource(d.job)] : d.dropoff.length ? d.dropoff : b.kind === 'taxOffice' ? ['gold'] : [];
  if (!base.length) return undefined;
  // Extras show once they have been gathered, like a sheep farm's food from Fertile Herding.
  const res = [...new Set([...base, ...(Object.keys(b.tally) as ResourceKey[])])];
  const chips = res.map((r) => `<span class="chip" title="${r}">${icon(r)}${fmt(b.tally[r] ?? 0)}</span>`).join('');
  return `<span>Total ${d.job ? 'produced' : 'collected'}</span>${chips}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Staffing line for a workplace. */
function staffInfo(w: World, b: Building, worker: string): string {
  const s = w.state;
  if (s.paused.includes(b.id)) return 'Production paused.';
  const needs = NEEDS[b.kind];
  if (!isActive(s, b, linkedBuildings(s)) && needs) return `Needs a ${BUILDING_TEXT[needs].name} connected by road to work.`;
  const n = s.villagers.filter((v) => v.workplace === b.id).length;
  const max = workersOf(s, b);
  return `${n} of ${max} ${worker}${max === 1 ? '' : 's'} assigned.${n < max ? ' Waiting for an empty-handed villager.' : ''}`;
}

/** Live status line for the selected building (falls back to its description). */
export const INFO: Partial<Record<BuildingKind, Info>> = {
  townCenter: (w) => {
    const n = (job: Job) => w.state.villagers.filter((v) => v.job === job).length;
    const st = getStats(w.state);
    const jobs = `${plural(n('lumber'), 'lumberjack')} · ${plural(n('farm'), 'farmer')} · ${plural(n('orchard'), 'orchardist')} · ${plural(n('mine'), 'miner')} · ${plural(n('herd'), 'herder')} · ${plural(n('cotton'), 'picker')} · ${plural(n('trade'), 'trader')}`;
    return st.eat ? `${jobs} · Upkeep: ${perSec(st.eat, 'food')}, ${perSec(st.winterBurn, 'wood')} in winter` : jobs;
  },
  farm: (w, b) => {
    const st = getStats(w.state);
    const well = st.wellFarms.has(b.id) ? ` · Well: harvest ×${st.wellHarvest}, carry ×${st.wellCarry}` : '';
    const season = CONFIG.seasons.farm[st.season];
    const name = seasonName(st.season);
    const note = season === 0 ? ` · ${name}: the fields lie fallow.` : season !== 1 ? ` · ${name}: harvest ×${season}` : '';
    return staffInfo(w, b, 'farmer') + well + note;
  },
  orchard: (w, b) => {
    const st = getStats(w.state);
    const season = CONFIG.seasons.farm[st.season];
    const note = season === 0 ? ` · ${seasonName(st.season)}: no fruit until spring.` : '';
    return `${staffInfo(w, b, 'orchardist')} · Each walks ${st.orchardSpeed.toFixed(1)} tiles/s, picks ${perSec(st.orchardRate, 'food')} and carries ${Math.round(st.orchardCarry)}${note}`;
  },
  quarry: (w, b) => staffInfo(w, b, 'miner'),
  sheepFarm: (w, b) => {
    const st = getStats(w.state);
    return staffInfo(w, b, 'herder') + (st.herdFood ? ' · Fertile Herding: +1 food per cloth' : '');
  },
  cottonPlantation: (w, b) => {
    const st = getStats(w.state);
    return `${staffInfo(w, b, 'picker')} · Each picks ${perSec(st.cottonRate, 'cloth')} and carries ${Math.round(st.cottonCarry)}`;
  },
  market: (w) => {
    const c = commission(w.state);
    const posts = countOf(w.state, 'tradingPost');
    return `Selling pays ${Math.round(100 * (1 - c))}% of value, buying costs ${Math.round(100 * (1 + c))}% · ${plural(posts, 'trading post')} deliver${posts === 1 ? 's' : ''} here`;
  },
  taxOffice: (w) => {
    const st = getStats(w.state);
    return `${plural(st.taxedHouses.size, 'house')} taxed by all Tax Offices · +${fmt(st.tax * 60)} gold/min`;
  },
  tradingPost: (w, b) => {
    const s = w.state;
    const st = getStats(s);
    const load = st.tradeLoads.get(b.id);
    if (load === undefined) return staffInfo(w, b, 'trader');
    const gap = Math.min(...s.buildings.filter((m) => m.kind === 'market' && st.linked.has(m.id)).map((m) => buildingGap(b, m)));
    return `${staffInfo(w, b, 'trader')} · ${plural(gap, 'tile')} to the nearest Market · ${load.toFixed(1)} gold per trip`;
  },
};

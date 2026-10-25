import { CONFIG } from '../config';
import { BUILDINGS, buildingGap, countOf, isActive, mulesOf, NEEDS, workersOf, type BuildingKind } from '../core/buildings';
import { linkedBuildings } from '../core/roads';
import { blast, blastWait, buyMule, hireVillager, togglePause, upgrade } from '../core/commands';
import { canAfford, commission, maxLevel, muleCost, popCap, upgradeCost, villagerCost, type UpgradeKind } from '../core/economy';
import { lvl } from '../core/skills';
import { getStats, type Stats } from '../core/stats';
import { jobResource } from '../core/systems/workplace';
import type { Building, Cost, GameState, HireResource, Job, ResourceKey } from '../core/types';
import type { World } from '../core/world';
import { seasonName } from './seasonInfo';
import { BUILDING_TEXT, duration, fmt, icon } from './text';

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
  compact?: string; // on a phone: a short label for the header row beside Move and Remove (its hint is left out)
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

function hire(w: World, res: HireResource, at?: number): Action {
  const s = w.state;
  const full = s.villagers.length >= popCap(s);
  const cost = villagerCost(s, res);
  return {
    label: full ? `Hire with ${res} (need a house)` : `Hire villager with ${res}`,
    cost,
    enabled: !full && canAfford(s, cost),
    run: () => hireVillager(w, res, at),
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
  shoes: 'Every villager walks faster',
  backpack: 'Every gatherer carries the same extra amount',
  satchel: 'Every tax collector',
};

const perSec = (n: number, unit: string) => `${n < 100 ? n.toFixed(2) : fmt(n)} ${unit}/s`;

function pauseAction(w: World, b: Building): Action {
  const active = !w.state.paused.includes(b.id);
  const mule = b.kind === 'tradingPost';
  const one = mulesOf(b) === 1;
  return {
    label: active ? 'Pause production' : 'Resume production',
    compact: active ? 'Pause' : 'Resume',
    hint: mule
      ? (active
        ? (one ? 'The mule finishes its delivery, then waits at the post.' : 'The mules finish their deliveries, then wait at the post.')
        : (one ? 'The mule will start loading again.' : 'The mules will start loading again.'))
      : (active ? 'Workers finish deliveries, then return to chopping.' : 'Available villagers will return to this workplace.'),
    cost: null,
    enabled: true,
    run: () => togglePause(w, b.id),
  };
}

/** Another pack mule for this Trading Post, up to the most a post keeps. */
function muleAction(w: World, b: Building): Action {
  const s = w.state;
  const cost = muleCost(s, b);
  const n = mulesOf(b);
  const { max } = CONFIG.mules;
  return {
    label: cost ? `Buy a pack mule (${n} of ${max})` : `Pack mules: ${n} of ${max}`,
    hint: cost ? 'Another mule on this route. The longer the route, the more each one brings in.' : 'This post keeps as many mules as it can.',
    cost,
    enabled: cost !== null && canAfford(s, cost),
    run: () => buyMule(w, b.id),
  };
}

/** Dynamite: blast the Quarry, then wait out its cooldown. */
function blastAction(w: World, b: Building): Action {
  const wait = blastWait(w, b.id);
  const linked = linkedBuildings(w.state).has(b.id);
  return {
    label: wait > 0 ? `Blast (ready in ${Math.ceil(wait)} s)` : 'Blast!',
    hint: linked ? 'A burst of stone, and the trees around the quarry take a heavy hit.' : 'Connect the quarry by road to blast.',
    cost: null,
    enabled: linked && wait === 0,
    run: () => blast(w, b.id),
  };
}

/** Actions offered when a building of each kind is selected. New buildings add an entry here. */
export const ACTIONS: Partial<Record<BuildingKind, Selected>> = {
  townCenter: (w) => [
    hire(w, 'wood'),
    hire(w, 'food'),
    hire(w, 'cloth'),
  ],
  tailor: (w) => [
    upgradeAction(w, 'shoes', 'Shoes', (st) => [{ label: 'Walking', value: `${st.speed.toFixed(2)} tiles/s` }]),
    upgradeAction(w, 'backpack', 'Backpack', (st) => [{ label: 'Extra carry', value: `+${fmt(Math.round(st.carryBonus))}` }]),
    upgradeAction(w, 'coats', 'Coats', (st) => [{ label: 'Winter firewood', value: perSec(st.winterBurn, 'wood') }]),
  ],
  lumberCamp: (w) => [
    upgradeAction(w, 'axe', 'Axe upgrades', (st) => [
      { label: 'Speed', value: perSec(st.chopRate, 'wood') },
      { label: 'Carry', value: `${fmt(Math.round(st.carry))} wood` },
    ]),
  ],
  barn: (w) => [
    upgradeAction(w, 'farm', 'Farm upgrades', (st) => [
      { label: 'Speed', value: perSec(st.farmRate, 'food') },
      { label: 'Carry', value: `${fmt(Math.round(st.farmCarry))} food` },
    ]),
  ],
  outpost: (w, b) => [
    hire(w, 'wood', b.id),
    hire(w, 'food', b.id),
    hire(w, 'cloth', b.id),
  ],
  farm: (w, b) => [pauseAction(w, b)],
  orchard: (w, b) => [pauseAction(w, b)],
  quarry: (w, b) => [
    upgradeAction(w, 'pick', 'Pick upgrades', (st) => [
      { label: 'Speed', value: perSec(st.mineRate, 'stone') },
      { label: 'Carry', value: `${fmt(Math.round(st.mineCarry))} stone` },
    ]),
    ...(lvl(w.state, 'dynamite') ? [blastAction(w, b)] : []),
    pauseAction(w, b),
  ],
  sheepFarm: (w, b) => [pauseAction(w, b)],
  cottonPlantation: (w, b) => [pauseAction(w, b)],
  tradingPost: (w, b) => [muleAction(w, b), pauseAction(w, b)],
  taxOffice: (w, b) => [
    upgradeAction(w, 'satchel', 'Satchel', (st) => [{ label: 'Houses per round', value: `${st.taxStops}` }]),
    pauseAction(w, b),
  ],
};

/**
 * Lifetime counter for the selected building: what its workers produced (workplaces) or what it
 * collected (drop-offs, the Tax Office). Undefined for buildings that gather nothing.
 */
export function tallyHtml(b: Building): string | undefined {
  const d = BUILDINGS[b.kind];
  const mule = b.kind === 'tradingPost';
  const base: readonly ResourceKey[] = d.job ? [jobResource(d.job)] : mule ? ['gold'] : d.dropoff;
  if (!base.length) return undefined;
  // Extras show once they have been gathered, like a sheep farm's food from Fertile Herding.
  const res = [...new Set([...base, ...(Object.keys(b.tally) as ResourceKey[])])];
  const chips = res.map((r) => `<span class="chip" title="${r}">${icon(r)}${fmt(b.tally[r] ?? 0)}</span>`).join('');
  return `<span>Total ${mule || (d.job && d.job !== 'tax') ? 'produced' : 'collected'}</span>${chips}`;
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

/** Growing Families: when the next villager is born, or what it waits for. */
function birthInfo(s: GameState, st: Stats): string {
  if (!st.birthRate) return '';
  if (s.villagers.length >= popCap(s)) return ' · Births wait for room';
  if (!st.surplus) return ` · Births wait for ${fmt(CONFIG.skills.wellFed.perVillager * s.villagers.length)} food in stock`;
  return ` · Next birth in ${duration((1 - s.births) / st.birthRate)}`;
}

/** Live status line for the selected building (falls back to its description). */
export const INFO: Partial<Record<BuildingKind, Info>> = {
  townCenter: (w) => {
    const n = (job: Job) => w.state.villagers.filter((v) => v.job === job).length;
    const st = getStats(w.state);
    const jobs = `${plural(n('lumber'), 'lumberjack')} · ${plural(n('farm'), 'farmer')} · ${plural(n('orchard'), 'orchardist')} · ${plural(n('mine'), 'miner')} · ${plural(n('herd'), 'herder')} · ${plural(n('cotton'), 'picker')} · ${plural(n('tax'), 'tax collector')}`;
    const upkeep = st.eat ? ` · Upkeep: ${perSec(st.eat, 'food')}, ${perSec(st.winterBurn, 'wood')} in winter` : '';
    return jobs + upkeep + birthInfo(w.state, st);
  },
  farm: (w, b) => {
    const st = getStats(w.state);
    const well = st.wellFarms.has(b.id) ? ` · Well: harvest ×${st.wellHarvest}, carry ×${st.wellCarry}` : '';
    const crop = st.cropBonus.get(b.id);
    const rotation = crop ? ` · Crop Rotation: harvest ×${crop}` : '';
    const season = st.farmSeason[st.season];
    const name = seasonName(st.season);
    const note = season === 0 ? ` · ${name}: the fields lie fallow.` : season !== 1 ? ` · ${name}: harvest ×${season}` : '';
    return staffInfo(w, b, 'farmer') + well + rotation + note;
  },
  orchard: (w, b) => {
    const st = getStats(w.state);
    const season = st.farmSeason[st.season];
    const note = season === 0 ? ` · ${seasonName(st.season)}: no fruit until spring.` : '';
    return `${staffInfo(w, b, 'orchardist')} · Each walks ${st.orchardSpeed.toFixed(1)} tiles/s, picks ${perSec(st.orchardRate, 'food')} and carries ${Math.round(st.orchardCarry)}${note}`;
  },
  quarry: (w, b) => {
    const vein = getStats(w.state).veinBonus.get(b.id);
    return staffInfo(w, b, 'miner') + (vein ? ` · Rich Veins: stone ×${vein.toFixed(2)}` : '');
  },
  sheepFarm: (w, b) => {
    const st = getStats(w.state);
    const pasture = st.pastureBonus.get(b.id);
    return staffInfo(w, b, 'herder') + (st.herdFood ? ' · Fertile Herding: +1 food per cloth' : '') +
      (pasture ? ` · Open Pastures: wool ×${pasture.toFixed(2)}` : '');
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
  taxOffice: (w, b) => {
    const s = w.state;
    const st = getStats(s);
    const owed = s.buildings.reduce((n, h) => n + (st.taxedHouses.has(h.id) ? h.due ?? 0 : 0), 0);
    return `${staffInfo(w, b, 'collector')} · ${plural(st.taxedHouses.size, 'house')} owe +${fmt(st.tax * 60)} gold/min, up to ${fmt(st.taxHold)} each · ` +
      `${fmt(owed)} gold waiting · ${plural(st.taxStops, 'house')} per round`;
  },
  tradingPost: (w, b) => {
    const s = w.state;
    const st = getStats(s);
    const one = mulesOf(b) === 1;
    if (s.paused.includes(b.id)) return `Production paused. ${one ? 'The mule waits' : 'The mules wait'} at the post.`;
    if (!st.linked.has(b.id)) return `Connect the post by road for ${one ? 'its mule' : 'its mules'} to work.`;
    const load = st.tradeLoads.get(b.id);
    if (load === undefined) return `Needs a ${BUILDING_TEXT.market.name} connected by road to work.`;
    const gap = Math.min(...s.buildings.filter((m) => m.kind === 'market' && st.linked.has(m.id)).map((m) => buildingGap(b, m)));
    const mine = s.mules.filter((m) => m.post === b.id);
    const DOING = { load: 'loading', toMarket: 'on the way to the Market', toPost: 'heading back', idle: 'waiting' } as const;
    const doing = mine.length === 1
      ? `The mule is ${DOING[mine[0].state]}`
      : mine.length
        ? `${mine.length} mules: ${(Object.keys(DOING) as (keyof typeof DOING)[])
          .map((k) => [mine.filter((m) => m.state === k).length, DOING[k]] as const)
          .filter(([n]) => n).map(([n, what]) => `${n} ${what}`).join(', ')}`
        : '';
    return `${doing ? `${doing} · ` : ''}${plural(gap, 'tile')} to the nearest Market · ${load.toFixed(1)} gold per trip`;
  },
};

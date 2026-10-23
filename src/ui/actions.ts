import { isActive, workersOf, type BuildingKind } from '../core/buildings';
import { hireVillager, togglePause, upgrade } from '../core/commands';
import { canAfford, maxLevel, popCap, upgradeCost, villagerCost, type UpgradeKind } from '../core/economy';
import { getStats, type Stats } from '../core/stats';
import type { Building, Cost, GameState, HireResource, Job } from '../core/types';
import type { World } from '../core/world';

export interface Action {
  label: string;
  cost: Cost | null;
  enabled: boolean;
  run: () => void;
  thumb?: BuildingKind; // shown as a parchment card with the building's sprite
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
      scope: kind === 'farm' ? 'Per farmer or herder · Well bonuses apply to farms only' : kind === 'axe' ? 'Per lumberjack' : 'Per miner',
      rows: current.map((row, i) => ({ label: row.label, current: row.value, next: next?.[i].value ?? null })),
    },
  };
}

function pauseAction(w: World, b: Building): Action {
  const active = isActive(w.state, b);
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
  townCenter: (w) => [hire(w, 'wood'), hire(w, 'food'), hire(w, 'leather')],
  lumberCamp: (w) => [
    upgradeAction(w, 'axe', 'Axe upgrades', (st) => [
      { label: 'Chopping', value: `${st.chopRate.toFixed(2)} wood/s` },
      { label: 'Carry', value: `${Math.round(st.carry)} wood` },
    ]),
  ],
  barn: (w) => [
    upgradeAction(w, 'farm', 'Farm upgrades', (st) => [
      { label: 'Harvest', value: `${st.farmRate.toFixed(2)} food/s` },
      { label: 'Carry', value: `${Math.round(st.farmCarry)} food` },
      { label: 'Herding', value: `${st.herdRate.toFixed(2)} leather/s` },
      { label: 'Herder carry', value: `${Math.round(st.herdCarry)} leather` },
    ]),
  ],
  farm: (w, b) => [pauseAction(w, b)],
  quarry: (w, b) => [
    upgradeAction(w, 'pick', 'Pick upgrades', (st) => [
      { label: 'Mining', value: `${st.mineRate.toFixed(2)} stone/s` },
      { label: 'Carry', value: `${Math.round(st.mineCarry)} stone` },
    ]),
    pauseAction(w, b),
  ],
  sheepFarm: (w, b) => [pauseAction(w, b)],
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Staffing line for a workplace. */
function staffInfo(w: World, b: Building, worker: string): string {
  const s = w.state;
  if (!isActive(s, b)) return 'Production paused.';
  const n = s.villagers.filter((v) => v.workplace === b.id).length;
  const max = workersOf(s, b);
  return `${n} of ${max} ${worker}${max === 1 ? '' : 's'} assigned.${n < max ? ' Waiting for an empty-handed villager.' : ''}`;
}

/** Live status line for the selected building (falls back to its description). */
export const INFO: Partial<Record<BuildingKind, Info>> = {
  townCenter: (w) => {
    const n = (job: Job) => w.state.villagers.filter((v) => v.job === job).length;
    return `${plural(n('lumber'), 'lumberjack')} · ${plural(n('farm'), 'farmer')} · ${plural(n('mine'), 'miner')} · ${plural(n('herd'), 'herder')}`;
  },
  farm: (w, b) => {
    const st = getStats(w.state);
    const well = st.wellFarms.has(b.id) ? ` · Well: harvest ×${st.wellHarvest}, carry ×${st.wellCarry}` : '';
    return staffInfo(w, b, 'farmer') + well;
  },
  quarry: (w, b) => staffInfo(w, b, 'miner'),
  sheepFarm: (w, b) => {
    const st = getStats(w.state);
    return staffInfo(w, b, 'herder') + (st.herdFood ? ' · Fertile Herding: +1 food per leather' : '');
  },
};

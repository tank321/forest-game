import { isActive, workersOf, type BuildingKind } from '../core/buildings';
import { hireVillager, togglePause, upgrade } from '../core/commands';
import { canAfford, maxLevel, popCap, upgradeCost, villagerCost, type UpgradeKind } from '../core/economy';
import { getStats, type Stats } from '../core/stats';
import type { Building, Cost, GameState, Job } from '../core/types';
import type { World } from '../core/world';

export interface Action {
  label: string;
  cost: Cost | null;
  enabled: boolean;
  run: () => void;
}

type Selected = (w: World, b: Building) => Action[];
type Info = (w: World, b: Building) => string;

function hire(w: World, res: 'wood' | 'food'): Action {
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
function upgradeAction(w: World, kind: UpgradeKind, name: string, preview: (st: Stats) => string): Action {
  const s = w.state;
  const lvl = s.upgrades[kind];
  const cost = upgradeCost(s, kind, lvl);
  if (!cost) return { label: `${name} Lv ${lvl} (max)`, cost: null, enabled: false, run: () => {} };
  const nxt: GameState = { ...s, upgrades: { ...s.upgrades, [kind]: lvl + 1 } };
  const [a, b] = [preview(getStats(s)), preview(getStats(nxt))];
  return {
    label: `${name} Lv ${lvl} → ${lvl + 1}/${maxLevel(kind)} · ${a} → ${b}`,
    cost,
    enabled: canAfford(s, cost),
    run: () => upgrade(w, kind),
  };
}

function pauseAction(w: World, b: Building, workers: string): Action {
  return {
    label: isActive(w.state, b) ? `Pause (frees its ${workers})` : 'Resume',
    cost: null,
    enabled: true,
    run: () => togglePause(w, b.id),
  };
}

/** Actions offered when a building of each kind is selected. New buildings add an entry here. */
export const ACTIONS: Partial<Record<BuildingKind, Selected>> = {
  townCenter: (w) => [hire(w, 'wood'), hire(w, 'food')],
  lumberCamp: (w) => [
    upgradeAction(w, 'axe', 'Axe', (st) => `${st.chopRate.toFixed(2)}/s, carry ${Math.round(st.carry)}`),
  ],
  barn: (w) => [
    upgradeAction(w, 'farm', 'Farms', (st) => `${st.farmRate.toFixed(2)}/s, carry ${Math.round(st.farmCarry)}`),
  ],
  farm: (w, b) => [pauseAction(w, b, 'farmer')],
  quarry: (w, b) => [
    pauseAction(w, b, 'miners'),
    upgradeAction(w, 'pick', 'Picks', (st) => `${st.mineRate.toFixed(2)}/s, carry ${Math.round(st.mineCarry)}`),
  ],
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Staffing line for a workplace. */
function staffInfo(w: World, b: Building, worker: string): string {
  const s = w.state;
  if (!isActive(s, b)) return 'Paused.';
  const n = s.villagers.filter((v) => v.workplace === b.id).length;
  const max = workersOf(s, b);
  return `${n}/${max} ${worker}${max === 1 ? '' : 's'}${n < max ? ' — waiting for an empty-handed lumberjack' : ''}`;
}

/** Live status line for the selected building (falls back to its description). */
export const INFO: Partial<Record<BuildingKind, Info>> = {
  townCenter: (w) => {
    const n = (job: Job) => w.state.villagers.filter((v) => v.job === job).length;
    return `${plural(n('lumber'), 'lumberjack')} · ${plural(n('farm'), 'farmer')} · ${plural(n('mine'), 'miner')}`;
  },
  farm: (w, b) => {
    const st = getStats(w.state);
    const well = st.wellFarms.has(b.id) ? ` · Well: harvest ×${st.wellHarvest}, carry ×${st.wellCarry}` : '';
    return staffInfo(w, b, 'farmer') + well;
  },
  quarry: (w, b) => staffInfo(w, b, 'miner'),
};

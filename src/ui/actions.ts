import { CONFIG } from '../config';
import { BUILDINGS, isActive, type BuildingKind } from '../core/buildings';
import { hireVillager, togglePause, upgrade } from '../core/commands';
import { axeCost, canAfford, farmUpgradeCost, popCap, villagerCost } from '../core/economy';
import { getStats, type Stats } from '../core/stats';
import type { Building, Cost, GameState } from '../core/types';
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
function upgradeAction(
  w: World,
  kind: 'axe' | 'farm',
  name: string,
  costOf: (lvl: number) => Cost | null,
  preview: (st: Stats) => string,
): Action {
  const s = w.state;
  const lvl = s.upgrades[kind];
  const cost = costOf(lvl);
  if (!cost) return { label: `${name} Lv ${lvl} (max)`, cost: null, enabled: false, run: () => {} };
  const nxt: GameState = { ...s, upgrades: { ...s.upgrades, [kind]: lvl + 1 } };
  const [a, b] = [preview(getStats(s)), preview(getStats(nxt))];
  return {
    label: `${name} Lv ${lvl} → ${lvl + 1}/${CONFIG[kind].costs.length} · ${a} → ${b}`,
    cost,
    enabled: canAfford(s, cost),
    run: () => upgrade(w, kind),
  };
}

/** Actions offered when a building of each kind is selected. New buildings add an entry here. */
export const ACTIONS: Partial<Record<BuildingKind, Selected>> = {
  townCenter: (w) => [hire(w, 'wood'), hire(w, 'food')],
  lumberCamp: (w) => [
    upgradeAction(w, 'axe', 'Axe', axeCost, (st) => `${st.chopRate.toFixed(2)}/s, carry ${Math.round(st.carry)}`),
  ],
  barn: (w) => [
    upgradeAction(w, 'farm', 'Farms', farmUpgradeCost, (st) => `${st.farmRate.toFixed(2)}/s, carry ${Math.round(st.farmCarry)}`),
  ],
  farm: (w, b) => [
    {
      label: isActive(w.state, b) ? 'Pause (frees its farmer)' : 'Resume',
      cost: null,
      enabled: true,
      run: () => togglePause(w, b.id),
    },
  ],
};

/** Live status line for the selected building (falls back to its description). */
export const INFO: Partial<Record<BuildingKind, Info>> = {
  townCenter: (w) => {
    const vs = w.state.villagers;
    const farmers = vs.filter((v) => v.job === 'farm').length;
    const n = vs.length - farmers;
    return `${n} lumberjack${n === 1 ? '' : 's'} · ${farmers} farmer${farmers === 1 ? '' : 's'}`;
  },
  farm: (w, b) => {
    const s = w.state;
    if (!isActive(s, b)) return 'Paused.';
    const n = s.villagers.filter((v) => v.workplace === b.id).length;
    return `${n}/${BUILDINGS.farm.workers} farmer${n ? '' : ' — waiting for an empty-handed lumberjack'}`;
  },
};

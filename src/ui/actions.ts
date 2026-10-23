import type { BuildingKind } from '../core/buildings';
import { hireVillager, upgradeAxe } from '../core/commands';
import { axeCost, canAfford, popCap, villagerCost } from '../core/economy';
import { getStats } from '../core/stats';
import type { Cost } from '../core/types';
import type { World } from '../core/world';
import { CONFIG } from '../config';

export interface Action {
  label: string;
  cost: Cost | null;
  enabled: boolean;
  run: () => void;
}

/** Actions offered when a building of each kind is selected. New buildings add an entry here. */
export const ACTIONS: Partial<Record<BuildingKind, (w: World) => Action[]>> = {
  townCenter: (w) => {
    const s = w.state;
    const n = s.villagers.length;
    const full = n >= popCap(s);
    const cost = villagerCost(s);
    return [
      {
        label: full ? 'Hire villager (need a house)' : 'Hire villager',
        cost,
        enabled: !full && canAfford(s, cost),
        run: () => hireVillager(w),
      },
    ];
  },
  lumberCamp: (w) => {
    const s = w.state;
    const lvl = s.upgrades.axe;
    const cost = axeCost(lvl);
    if (!cost) return [{ label: `Axe Lv ${lvl} (max)`, cost: null, enabled: false, run: () => {} }];
    const cur = getStats(s);
    const nxt = getStats({ ...s, upgrades: { ...s.upgrades, axe: lvl + 1 } });
    return [
      {
        label: `Axe Lv ${lvl} → ${lvl + 1}/${CONFIG.axe.costs.length} · chop ${cur.chopRate.toFixed(2)}→${nxt.chopRate.toFixed(2)}/s · carry ${Math.round(cur.carry)}→${Math.round(nxt.carry)}`,
        cost,
        enabled: canAfford(s, cost),
        run: () => upgradeAxe(w),
      },
    ];
  },
};

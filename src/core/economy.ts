import { CONFIG } from '../config';
import { BUILDINGS, countOf, type BuildingKind } from './buildings';
import { lvl } from './skills';
import type { Cost, GameState, ResourceKey } from './types';

const { villagerCosts, villagerCostGrowth, foodHireOffset, basePop, popPerHouse } = CONFIG.economy;

/** Multiplies every non-zero amount (rounded, at least 1); zero entries are dropped. */
const scale = (c: Cost, f: number): Cost =>
  Object.fromEntries(Object.entries(c).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.max(1, Math.round(v * f))]));

/** Base price of the villager after `owned` (table, then ×growth). */
export function baseVillagerCost(owned: number): number {
  const last = villagerCosts.length - 1;
  return owned <= last ? villagerCosts[owned] : Math.round(villagerCosts[last] * villagerCostGrowth ** (owned - last));
}

/** Next villager paid in `res`; each resource has its own price track. */
export function villagerCost(s: GameState, res: 'wood' | 'food' = 'wood'): Cost {
  const n = res === 'wood' ? s.hires.wood : s.hires.food + foodHireOffset;
  return scale({ [res]: baseVillagerCost(n) }, 0.85 ** lvl(s, 'recruiters'));
}

export const buildingCost = (s: GameState, kind: BuildingKind): Cost =>
  scale(BUILDINGS[kind].cost(countOf(s, kind)), lvl(s, 'masterBuilders') ? 0.8 : 1);

export const popCap = (s: GameState) => basePop + (popPerHouse + lvl(s, 'roomyHouses')) * countOf(s, 'house');

const tableCost = (t: { costs: readonly number[]; foodCosts: readonly number[] }, level: number): Cost | null =>
  level < t.costs.length ? scale({ wood: t.costs[level], food: t.foodCosts[level] }, 1) : null;

/** Next level's cost, or null at max level. */
export const axeCost = (level: number) => tableCost(CONFIG.axe, level);
export const farmUpgradeCost = (level: number) => tableCost(CONFIG.farm, level);

const entries = (c: Cost) => Object.entries(c) as [ResourceKey, number][];

export const canAfford = (s: GameState, c: Cost) => entries(c).every(([k, v]) => s.resources[k] >= v);

/** Deducts `c` if affordable; returns whether it did. */
export function pay(s: GameState, c: Cost): boolean {
  if (!canAfford(s, c)) return false;
  for (const [k, v] of entries(c)) s.resources[k] -= v;
  return true;
}

/** Adds gathered resources to the stockpile and lifetime totals. */
export function gain(s: GameState, r: ResourceKey, n: number): void {
  s.resources[r] += n;
  s.totals[r] += n;
}

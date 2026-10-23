import { CONFIG } from '../config';
import { BUILDINGS, countOf, type BuildingKind } from './buildings';
import { lvl } from './skills';
import type { Cost, GameState, Resources } from './types';

const { villagerCosts, villagerCostGrowth, basePop, popPerHouse } = CONFIG.economy;

const scale = (c: Cost, f: number): Cost =>
  Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.max(1, Math.round(v * f))]));

/** Base price of the villager after `owned` (table, then ×growth). */
export function baseVillagerCost(owned: number): number {
  const last = villagerCosts.length - 1;
  return owned <= last ? villagerCosts[owned] : Math.round(villagerCosts[last] * villagerCostGrowth ** (owned - last));
}

export const villagerCost = (s: GameState): Cost =>
  scale({ wood: baseVillagerCost(s.villagers.length) }, 0.85 ** lvl(s, 'recruiters'));

export const buildingCost = (s: GameState, kind: BuildingKind): Cost =>
  scale(BUILDINGS[kind].cost(countOf(s, kind)), lvl(s, 'masterBuilders') ? 0.8 : 1);

export const popCap = (s: GameState) => basePop + (popPerHouse + lvl(s, 'roomyHouses')) * countOf(s, 'house');

/** Next axe level's cost, or null at max level. */
export const axeCost = (level: number): Cost | null =>
  level < CONFIG.axe.costs.length ? { wood: CONFIG.axe.costs[level] } : null;

export const canAfford = (s: GameState, c: Cost) =>
  (Object.keys(c) as (keyof Resources)[]).every((k) => s.resources[k] >= (c[k] ?? 0));

/** Deducts `c` if affordable; returns whether it did. */
export function pay(s: GameState, c: Cost): boolean {
  if (!canAfford(s, c)) return false;
  for (const k of Object.keys(c) as (keyof Resources)[]) s.resources[k] -= c[k] ?? 0;
  return true;
}

/** Adds gathered resources to the stockpile and lifetime totals. */
export function gain(s: GameState, r: keyof Resources, n: number): void {
  s.resources[r] += n;
  s.totals[r] += n;
}

import { CONFIG } from '../config';
import { BUILDINGS, countOf, type BuildingKind } from './buildings';
import { linkedBuildings } from './roads';
import { lvl } from './skills';
import type { Building, Cost, GameState, HireResource, ResourceKey } from './types';

const { villagerCosts, villagerCostGrowth, hireOffset, basePop, popPerHouse } = CONFIG.economy;

/** Multiplies every non-zero amount (rounded, at least 1); zero entries are dropped. */
const scale = (c: Cost, f: number): Cost =>
  Object.fromEntries(Object.entries(c).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.max(1, Math.round(v * f))]));

/** Base price of the villager after `owned` (table, then ×growth). */
export function baseVillagerCost(owned: number): number {
  const last = villagerCosts.length - 1;
  return owned <= last ? villagerCosts[owned] : Math.round(villagerCosts[last] * villagerCostGrowth ** (owned - last));
}

/** Next villager paid in `res`; each resource has its own price track. */
export function villagerCost(s: GameState, res: HireResource = 'wood'): Cost {
  const n = s.hires[res] + hireOffset[res];
  return scale({ [res]: baseVillagerCost(n) }, 0.85 ** lvl(s, 'recruiters'));
}

/** Masons: the stone part of any cost is discounted. */
const masonry = (s: Pick<GameState, 'skills'>, c: Cost): Cost =>
  c.stone ? { ...c, ...scale({ stone: c.stone }, 0.85 ** lvl(s, 'masons')) } : c;

export const buildingCost = (s: Pick<GameState, 'skills' | 'buildings'>, kind: BuildingKind, owned = countOf(s, kind)): Cost =>
  masonry(s, scale(BUILDINGS[kind].cost(owned), lvl(s, 'masterBuilders') ? 0.8 : 1));

/** Refund original construction materials only, rounded down per resource. */
export const buildingRefund = (b: Building): Cost =>
  b.kind === 'townCenter' ? {} : Object.fromEntries(
    entries(b.paidCost).flatMap(([r, n]) => {
      const amount = Math.floor(n * CONFIG.economy.buildingRefund);
      return amount > 0 ? [[r, amount]] : [];
    }),
  );

/** Resources the Market deals in. */
export type TradeResource = Exclude<ResourceKey, 'gold'>;
export const TRADE_RESOURCES = Object.keys(CONFIG.market.prices) as TradeResource[];

/** Market fee as a fraction of value (Shrewd Traders lowers it). */
export const commission = (s: Pick<GameState, 'skills'>) =>
  Math.max(0, CONFIG.market.commission - 0.05 * lvl(s, 'shrewdTraders'));

/** Gold received for selling `n` of `res`, or paid for buying it. */
export function marketQuote(s: Pick<GameState, 'skills'>, res: TradeResource, n: number, side: 'sell' | 'buy'): number {
  const value = n * CONFIG.market.prices[res];
  const c = commission(s);
  // Round in the Market's favor; the small epsilon keeps 100 × 0.8 from flooring to 79.
  return side === 'sell' ? Math.floor(value * (1 - c) + 1e-9) : Math.ceil(value * (1 + c) - 1e-9);
}

/** Base population plus room in every house connected by road. */
export function popCap(s: GameState): number {
  const linked = linkedBuildings(s);
  const houses = s.buildings.reduce((n, b) => n + (b.kind === 'house' && linked.has(b.id) ? 1 : 0), 0);
  return basePop + (popPerHouse + lvl(s, 'roomyHouses')) * houses;
}

export type UpgradeKind = keyof GameState['upgrades'];

/** Levels in an upgrade track. */
export const maxLevel = (k: UpgradeKind) => CONFIG[k].costs.wood.length;

/** Cost of upgrading from `level` (default: the current one), or null at max level. */
export function upgradeCost(s: GameState, k: UpgradeKind, level = s.upgrades[k]): Cost | null {
  if (level >= maxLevel(k)) return null;
  const rows = Object.entries(CONFIG[k].costs) as [ResourceKey, readonly number[]][];
  return masonry(s, scale(Object.fromEntries(rows.map(([r, row]) => [r, row[level]])), 1));
}

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

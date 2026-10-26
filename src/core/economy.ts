import { CONFIG } from '../config';
import { BUILDINGS, countOf, mulesOf, type BuildingKind } from './buildings';
import { perk, perkMult } from './legacy';
import { linkedBuildings } from './roads';
import { lvl } from './skills';
import { isFair } from './stats';
import type { Building, Cost, GameState, HireResource, ResourceKey } from './types';

const { villagerCosts, villagerCostGrowth, hireOffset, basePop, popPerHouse } = CONFIG.economy;
const L = CONFIG.legacy.perks;

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
  return scale({ [res]: baseVillagerCost(n) }, CONFIG.skills.recruiters ** lvl(s, 'recruiters') * perkMult(s, 'urbanCore', L.urbanCore.hire));
}

/** Masons: the stone part of any cost is discounted. */
const masonry = (s: Pick<GameState, 'skills'>, c: Cost): Cost =>
  c.stone ? { ...c, ...scale({ stone: c.stone }, CONFIG.skills.masons ** lvl(s, 'masons')) } : c;

export const buildingCost = (s: Pick<GameState, 'skills' | 'buildings' | 'legacy'>, kind: BuildingKind, owned = countOf(s, kind)): Cost =>
  masonry(s, scale(BUILDINGS[kind].cost(owned), (lvl(s, 'masterBuilders') ? 0.8 : 1) * perkMult(s, 'prosperousCity', L.prosperousCity.build)));

/** Mason's Yard: the next road, priced by how many the town has bought this run. */
export function roadCost(s: Pick<GameState, 'skills' | 'roadsBought'>): Cost {
  const { cost, growth } = CONFIG.masonsYard.road;
  return masonry(s, scale(cost, growth ** s.roadsBought));
}

/** Houses rebuilt in stone. */
export const stoneHouses = (s: Pick<GameState, 'buildings'>) => s.buildings.reduce((n, b) => n + (b.stone ? 1 : 0), 0);

/** Mason's Yard: rebuilding the next house in stone, priced by how many stand. */
export function stoneHouseCost(s: Pick<GameState, 'skills' | 'buildings'>): Cost {
  const { cost, growth } = CONFIG.masonsYard.stoneHouse;
  return masonry(s, scale(cost, growth ** stoneHouses(s)));
}

/** Refund original construction materials only, rounded down per resource. */
/** The next extra pack mule, priced by how many the town has bought (each post's first is free); null at a full post. */
export function muleCost(s: Pick<GameState, 'buildings'>, post: Building): Cost | null {
  const { max, cost, growth } = CONFIG.mules;
  if (mulesOf(post) >= max) return null;
  const bought = s.buildings.reduce((n, b) => n + (b.kind === 'tradingPost' ? mulesOf(b) - 1 : 0), 0);
  return Object.fromEntries(Object.entries(cost).map(([r, n]) => [r, Math.round(n * growth ** bought)]));
}

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

/** Market fee as a fraction of value (Shrewd Traders and Royal Bank lower it; none during the Midsummer Fair). */
export const commission = (s: Pick<GameState, 'skills' | 'legacy' | 'time'>) =>
  isFair(s) ? 0 :
  Math.max(0, CONFIG.market.commission - 0.05 * lvl(s, 'shrewdTraders')) * perkMult(s, 'royalBank', L.royalBank.commission);

/** Gold received for selling `n` of `res`, or paid for buying it. */
export function marketQuote(s: Pick<GameState, 'skills' | 'legacy' | 'time'>, res: TradeResource, n: number, side: 'sell' | 'buy'): number {
  const value = n * CONFIG.market.prices[res];
  const c = commission(s);
  // Round in the Market's favor; the small epsilon keeps 100 × 0.8 from flooring to 79.
  return side === 'sell' ? Math.floor(value * (1 - c) + 1e-9) : Math.ceil(value * (1 + c) - 1e-9);
}

/** Base population plus room in every house connected by road; a stone house has more. */
export function popCap(s: GameState): number {
  const linked = linkedBuildings(s);
  const houses = s.buildings.filter((b) => b.kind === 'house' && linked.has(b.id));
  const stone = houses.reduce((n, b) => n + (b.stone ? 1 : 0), 0);
  return (perk(s, 'urbanCore') ? L.urbanCore.basePop : basePop) + (popPerHouse + lvl(s, 'roomyHouses')) * houses.length +
    CONFIG.masonsYard.stoneHouse.pop * stone;
}

export type UpgradeKind = keyof GameState['upgrades'];

/** Levels in a track's cost table; a track with `beyond` goes on past it. */
const tableLevels = (k: UpgradeKind) => CONFIG[k].costs.wood.length;
const beyond = (k: UpgradeKind) => (CONFIG[k] as { beyond?: { mult: number; costGrowth: number } }).beyond ?? null;

/** Levels in an upgrade track: Infinity for one that goes on past its table. */
export const maxLevel = (k: UpgradeKind) => (beyond(k) ? Infinity : tableLevels(k));

/** Cost of upgrading from `level` (default: the current one), or null at max level. */
export function upgradeCost(s: GameState, k: UpgradeKind, level = s.upgrades[k]): Cost | null {
  if (level >= maxLevel(k)) return null;
  const rows = Object.entries(CONFIG[k].costs) as [ResourceKey, readonly number[]][];
  const n = tableLevels(k);
  // Past the table: its last price × costGrowth per level beyond it.
  const price = (row: readonly number[]) => (level < n ? row[level] : row[n - 1] * beyond(k)!.costGrowth ** (level - n + 1));
  return masonry(s, scale(Object.fromEntries(rows.map(([r, row]) => [r, price(row)])), 1));
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

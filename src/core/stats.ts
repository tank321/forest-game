import { CONFIG } from '../config';
import { buildingGap, type BuildingKind } from './buildings';
import { seasonOf, WINTER } from './seasons';
import { lvl } from './skills';
import type { GameState } from './types';

export interface Stats {
  speed: number; // villager tiles/s
  chopRate: number; // villager wood/s
  carry: number;
  manualChop: number; // wood per tap
  campBonus: number; // chop multiplier near a Lumber Camp
  campRadius: number;
  perTree: number; // villagers allowed on one tree
  farmRate: number; // farmer food/s
  farmCarry: number;
  mineRate: number; // miner stone/s
  mineCarry: number;
  herdRate: number; // herder leather/s
  herdCarry: number;
  herdFood: number; // food delivered per leather (Fertile Herding)
  wellRadius: number; // Chebyshev reach of a Well
  wellFarms: ReadonlySet<number>; // ids of farms boosted by a Well
  wellHarvest: number; // farm rate multiplier from a Well
  wellCarry: number; // farm carry multiplier from a Well
  season: number; // index into SEASONS
  eat: number; // town food upkeep /s
  burn: number; // town firewood upkeep /s (winter only)
  winterBurn: number; // what `burn` is in winter
  hungry: boolean; // food ran out: chopping and mining slowed
  cold: boolean; // firewood ran out in winter: farming, mining and herding slowed
  taxedHouses: ReadonlySet<number>; // ids of houses within reach of a Tax Office
  tax: number; // gold/s from taxed houses
  tradeLoads: ReadonlyMap<number, number>; // Trading Post id -> gold per trip (none without a Market)
}

/** Effective gameplay values: base config × upgrades × skills × season and upkeep (later: × legacy). */
export function getStats(s: GameState): Stats {
  const { axe, farm, pick } = s.upgrades;
  const f = CONFIG.farm;
  const p = CONFIG.pick;
  const wellRadius = CONFIG.well.radius + lvl(s, 'deepWells');
  const { speed, chopRate, carry } = CONFIG.villager;
  const a = CONFIG.axe;
  const u = CONFIG.upkeep;
  const season = seasonOf(s.time);
  const extra = Math.max(0, s.villagers.length - u.freeVillagers);
  const eat = extra * u.food;
  const winterBurn = extra * u.wood * (1 - CONFIG.coats.burnCut * s.upgrades.coats);
  const burn = season === WINTER ? winterBurn : 0;
  const hungry = eat > 0 && s.resources.food <= 0;
  const cold = burn > 0 && s.resources.wood <= 0;
  // Producers of the missing resource are never slowed, so a shortage can always be worked off.
  const fed = hungry ? u.hungry : 1;
  const warm = cold ? u.cold : 1;
  const taxedHouses = inRange(s, 'house', 'taxOffice', CONFIG.tax.radius);
  return {
    speed: speed * (1 + 0.1 * lvl(s, 'swiftFeet')),
    chopRate: chopRate * a.speedGrowth ** axe * (1 + 0.2 * lvl(s, 'sharpAxes')) * fed,
    carry: (carry + a.carryPerLevel * axe + 2 * lvl(s, 'bigBaskets')) * a.carryGrowth ** axe,
    manualChop: CONFIG.manualChop * 5 ** lvl(s, 'powerSwing'),
    campBonus: lvl(s, 'campCrews') ? 1.5 : 1,
    campRadius: 3,
    perTree: lvl(s, 'teamwork') ? 2 : 1,
    farmRate: f.harvestRate * f.speedGrowth ** farm * (1 + 0.2 * lvl(s, 'greenThumbs')) * CONFIG.seasons.farm[season] * warm,
    farmCarry: (carry + f.carryPerLevel * farm + 2 * lvl(s, 'bigBaskets')) * f.carryGrowth ** farm,
    mineRate: p.mineRate * p.speedGrowth ** pick * (1 + 0.2 * lvl(s, 'stonecutters')) * fed * warm,
    mineCarry: (carry + p.carryPerLevel * pick + 2 * lvl(s, 'bigBaskets')) * p.carryGrowth ** pick,
    herdRate: CONFIG.herd.rate * f.speedGrowth ** farm * warm, // Barn upgrades cover herders too
    herdCarry: (CONFIG.herd.carry + f.carryPerLevel * farm + 2 * lvl(s, 'bigBaskets')) * f.carryGrowth ** farm,
    herdFood: lvl(s, 'fertileHerding'),
    wellRadius,
    wellFarms: inRange(s, 'farm', 'well', wellRadius),
    wellHarvest: CONFIG.well.harvestMult,
    wellCarry: CONFIG.well.carryMult,
    season,
    eat,
    burn,
    winterBurn,
    hungry,
    cold,
    taxedHouses,
    tax: taxedHouses.size * CONFIG.tax.perHouse * (1 + 0.2 * lvl(s, 'taxCollectors')),
    tradeLoads: tradeLoads(s),
  };
}

/** Ids of `kind` buildings within `r` (Chebyshev, tile to tile) of a `source` building. Recomputed on demand: sources × targets is small. */
function inRange(s: GameState, kind: BuildingKind, source: BuildingKind, r: number): Set<number> {
  const sources = s.buildings.filter((b) => b.kind === source);
  const out = new Set<number>();
  if (!sources.length) return out;
  for (const b of s.buildings) {
    if (b.kind === kind && sources.some((src) => buildingGap(b, src) <= r)) out.add(b.id);
  }
  return out;
}

/** Gold per trip for each Trading Post, from the straight-line gap to the nearest Market. */
function tradeLoads(s: GameState): Map<number, number> {
  const markets = s.buildings.filter((b) => b.kind === 'market');
  const out = new Map<number, number>();
  if (!markets.length) return out;
  const { goldAtRef, refGap, exponent } = CONFIG.trade;
  const mules = 1 + 0.25 * lvl(s, 'packMules');
  for (const b of s.buildings) {
    if (b.kind !== 'tradingPost') continue;
    const gap = Math.min(...markets.map((m) => buildingGap(b, m)));
    out.set(b.id, goldAtRef * (gap / refGap) ** exponent * mules);
  }
  return out;
}

import { CONFIG } from '../config';
import { buildingGap, type BuildingKind } from './buildings';
import { perk, perkMult, startVillagers } from './legacy';
import { linkedBuildings } from './roads';
import { seasonOf, WINTER } from './seasons';
import { lvl } from './skills';
import type { GameState, Job } from './types';

export interface Stats {
  speed: number; // villager tiles/s
  chopRate: number; // villager wood/s
  carry: number;
  carryBonus: number; // Wheelbarrow: flat carry every gatherer gets on top of its own
  manualChop: number; // wood per tap
  campBonus: number; // chop multiplier near a Lumber Camp
  campRadius: number;
  perTree: number; // villagers allowed on one tree
  farmRate: number; // farmer food/s
  farmCarry: number;
  orchardSpeed: number; // orchardist tiles/s
  orchardRate: number; // orchardist food/s
  orchardCarry: number;
  mineRate: number; // miner stone/s
  mineCarry: number;
  herdRate: number; // herder cloth/s
  herdCarry: number;
  herdFood: number; // food delivered per cloth (Fertile Herding)
  cottonRate: number; // picker cloth/s
  cottonCarry: number;
  wellRadius: number; // Chebyshev reach of a Well
  wellFarms: ReadonlySet<number>; // ids of farms boosted by a Well
  wellHarvest: number; // farm rate multiplier from a Well
  wellCarry: number; // farm carry multiplier from a Well
  linked: ReadonlySet<number>; // ids of buildings that work: connected by road (see roads.ts)
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

/** Effective gameplay values: base config × upgrades × skills × legacy perks × season and upkeep. */
export function getStats(s: GameState): Stats {
  const { axe, farm, pick, barrow } = s.upgrades;
  const f = CONFIG.farm;
  const p = CONFIG.pick;
  const wellRadius = wellReach(s);
  const { speed, chopRate, carry } = CONFIG.villager;
  const b = CONFIG.barrow;
  const L = CONFIG.legacy.perks;
  const haul = perkMult(s, 'swiftAndStrong', L.swiftAndStrong.carry);
  const carryBonus = b.carryPerLevel * barrow * haul; // added after every job's own multipliers, so it is the same for all
  const a = CONFIG.axe;
  const u = CONFIG.upkeep;
  const season = seasonOf(s.time);
  const extra = Math.max(0, s.villagers.length - Math.max(u.freeVillagers, startVillagers(s)));
  const gather = perkMult(s, 'masterHarvest', L.masterHarvest.gather) * L.legacyX2.gather ** perk(s, 'legacyX2');
  const guild = guildBonus(s);
  const eat = extra * u.food;
  const winterBurn = extra * u.wood * (1 - CONFIG.coats.burnCut * s.upgrades.coats);
  const burn = season === WINTER ? winterBurn : 0;
  const hungry = eat > 0 && s.resources.food <= 0;
  const cold = burn > 0 && s.resources.wood <= 0;
  // Producers of the missing resource are never slowed, so a shortage can always be worked off.
  const fed = hungry ? u.hungry : 1;
  const warm = cold ? u.cold : 1;
  const linked = linkedBuildings(s);
  const taxedHouses = inRange(s, linked, 'house', 'taxOffice', CONFIG.tax.radius);
  const walk = speed * b.speedGrowth ** barrow * (1 + 0.1 * lvl(s, 'swiftFeet')) * perkMult(s, 'swiftAndStrong', L.swiftAndStrong.speed);
  const farmRate = f.harvestRate * f.speedGrowth ** farm * (1 + 0.2 * lvl(s, 'greenThumbs')) * CONFIG.seasons.farm[season] * warm * gather * guild.farm;
  const farmLoad = (carry + f.carryPerLevel * farm + 2 * lvl(s, 'bigBaskets')) * f.carryGrowth ** farm * haul;
  const herdRate = CONFIG.herd.rate * f.speedGrowth ** farm * warm * gather * guild.herd; // Barn upgrades cover herders too
  const herdLoad = (CONFIG.herd.carry + f.carryPerLevel * farm + 2 * lvl(s, 'bigBaskets')) * f.carryGrowth ** farm * haul;
  return {
    speed: walk,
    chopRate: chopRate * a.speedGrowth ** axe * (1 + 0.2 * lvl(s, 'sharpAxes')) * fed * gather * guild.lumber,
    carry: (carry + a.carryPerLevel * axe + 2 * lvl(s, 'bigBaskets')) * a.carryGrowth ** axe * haul + carryBonus,
    carryBonus,
    manualChop: CONFIG.manualChop * 5 ** lvl(s, 'powerSwing'),
    campBonus: lvl(s, 'campCrews') ? 1.5 : 1,
    campRadius: 3,
    perTree: lvl(s, 'teamwork') ? 2 : 1,
    farmRate,
    farmCarry: farmLoad + carryBonus,
    orchardSpeed: walk * CONFIG.orchard.speedMult,
    orchardRate: farmRate * CONFIG.orchard.rateMult,
    orchardCarry: farmLoad * CONFIG.orchard.carryMult + carryBonus,
    mineRate: p.mineRate * p.speedGrowth ** pick * (1 + 0.2 * lvl(s, 'stonecutters')) * fed * warm * gather * guild.mine,
    mineCarry: (carry + p.carryPerLevel * pick + 2 * lvl(s, 'bigBaskets')) * p.carryGrowth ** pick * haul + carryBonus,
    herdRate,
    herdCarry: herdLoad + carryBonus,
    herdFood: lvl(s, 'fertileHerding'),
    cottonRate: herdRate * CONFIG.cotton.rateMult,
    cottonCarry: herdLoad * CONFIG.cotton.carryMult + carryBonus,
    wellRadius,
    wellFarms: wellFarms(s, linked),
    wellHarvest: CONFIG.well.harvestMult,
    wellCarry: CONFIG.well.carryMult,
    linked,
    season,
    eat,
    burn,
    winterBurn,
    hungry,
    cold,
    taxedHouses,
    tax: taxedHouses.size * CONFIG.tax.perHouse * (1 + 0.2 * lvl(s, 'taxCollectors')) * perkMult(s, 'royalBank', L.royalBank.gold),
    tradeLoads: tradeLoads(s, linked),
  };
}

/** Trade Guilds: lumberjacks chop ×2, and each profession speeds up with its headcount, tapering toward +cap. */
function guildBonus(s: GameState): Record<'lumber' | 'farm' | 'mine' | 'herd', number> {
  const out = { lumber: 1, farm: 1, mine: 1, herd: 1 };
  if (!perk(s, 'tradeGuilds')) return out;
  const { chop, cap, taper } = CONFIG.legacy.perks.tradeGuilds;
  const profession: Partial<Record<Job, keyof typeof out>> = { lumber: 'lumber', farm: 'farm', orchard: 'farm', mine: 'mine', herd: 'herd', cotton: 'herd' };
  const count = { lumber: 0, farm: 0, mine: 0, herd: 0 };
  for (const v of s.villagers) {
    const p = profession[v.job];
    if (p) count[p]++;
  }
  for (const p of Object.keys(out) as (keyof typeof out)[]) out[p] = 1 + cap * (1 - taper ** count[p]);
  out.lumber *= chop;
  return out;
}

/** Chebyshev reach of a Well. */
export const wellReach = (s: GameState) => CONFIG.well.radius + lvl(s, 'deepWells');

/** Ids of connected farms boosted by a Well. */
export const wellFarms = (s: GameState, linked: ReadonlySet<number>) => inRange(s, linked, 'farm', 'well', wellReach(s));

/** Ids of connected `kind` buildings within `r` (Chebyshev, tile to tile) of a connected `source` building. Recomputed on demand: sources × targets is small. */
function inRange(s: GameState, linked: ReadonlySet<number>, kind: BuildingKind, source: BuildingKind, r: number): Set<number> {
  const sources = s.buildings.filter((b) => b.kind === source && linked.has(b.id));
  const out = new Set<number>();
  if (!sources.length) return out;
  for (const b of s.buildings) {
    if (b.kind === kind && linked.has(b.id) && sources.some((src) => buildingGap(b, src) <= r)) out.add(b.id);
  }
  return out;
}

/** Gold per trip for each Trading Post, from the straight-line gap to the nearest connected Market. */
function tradeLoads(s: GameState, linked: ReadonlySet<number>): Map<number, number> {
  const markets = s.buildings.filter((b) => b.kind === 'market' && linked.has(b.id));
  const out = new Map<number, number>();
  if (!markets.length) return out;
  const { goldAtRef, refGap, exponent } = CONFIG.trade;
  const mules = (1 + 0.25 * lvl(s, 'packMules')) * perkMult(s, 'royalBank', CONFIG.legacy.perks.royalBank.gold);
  for (const b of s.buildings) {
    if (b.kind !== 'tradingPost') continue;
    const gap = Math.min(...markets.map((m) => buildingGap(b, m)));
    out.set(b.id, goldAtRef * (gap / refGap) ** exponent * mules);
  }
  return out;
}

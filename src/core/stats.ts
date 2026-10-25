import { CONFIG } from '../config';
import { BUILDINGS, buildingGap, type BuildingKind } from './buildings';
import { chestMult } from './chest';
import { perk, perkMult, startVillagers } from './legacy';
import { linkedBuildings } from './roads';
import { seasonOf, SUMMER, WINTER } from './seasons';
import { lvl } from './skills';
import { Tile, type GameState, type Job } from './types';

export interface Stats {
  speed: number; // villager tiles/s
  chopRate: number; // villager wood/s
  carry: number;
  carryBonus: number; // Backpack: flat carry every gatherer gets on top of its own
  manualChop: number; // wood per tap
  campBonus: number; // chop multiplier near a Lumber Camp
  campRadius: number;
  perTree: number; // villagers allowed on one tree
  perMarkedTree: number; // villagers allowed on one flagged tree
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
  cropBonus: ReadonlyMap<number, number>; // farm id -> Crop Rotation harvest multiplier (absent = ×1)
  farmSeason: readonly number[]; // farm and orchard harvest multiplier per season (Greenhouses included)
  pastureBonus: ReadonlyMap<number, number>; // Sheep Farm id -> Open Pastures wool multiplier (absent = ×1)
  veinBonus: ReadonlyMap<number, number>; // Quarry id -> Rich Veins stone multiplier (absent = ×1)
  roadWalk: number; // walk speed multiplier along roads (Cobblestone)
  emptyWalk: number; // walk speed multiplier while carrying nothing (Errand Runners)
  toll: number; // gold per road tile walked (Toll Roads)
  wellFed: boolean; // food surplus: gathering faster (Well Fed)
  fair: boolean; // summer with Midsummer Fair: no market commission, Trading Posts pay more
  wellHarvest: number; // farm rate multiplier from a Well
  wellCarry: number; // farm carry multiplier from a Well
  linked: ReadonlySet<number>; // ids of buildings that work: connected by road (see roads.ts)
  season: number; // index into SEASONS
  eat: number; // town food upkeep /s
  burn: number; // town firewood upkeep /s (winter only)
  winterBurn: number; // what `burn` is in winter
  hungry: boolean; // food ran out: chopping and mining slowed
  cold: boolean; // firewood ran out in winter: farming, mining and herding slowed
  taxedHouses: ReadonlySet<number>; // ids of connected houses owing tax (any connected Tax Office stands)
  taxPerHouse: number; // gold/s each taxed house comes to owe
  tax: number; // gold/s owed by all taxed houses
  taxHold: number; // most gold a house holds before its tax goes uncollected
  taxStops: number; // houses a tax collector visits per round
  tradeLoads: ReadonlyMap<number, number>; // Trading Post id -> gold per trip (none without a Market)
}

/**
 * An upgrade level split at the end of its cost table: `t` levels there (their effects as listed in CONFIG), and `x`
 * = the multiplier from the levels past it (`beyond.mult` each).
 */
function split(track: { costs: { wood: readonly number[] }; beyond: { mult: number } }, level: number): { t: number; x: number } {
  const t = Math.min(level, track.costs.wood.length);
  return { t, x: track.beyond.mult ** (level - t) };
}

/** Effective gameplay values: base config × upgrades × skills × legacy perks × season and upkeep. */
export function getStats(s: GameState): Stats {
  const up = s.upgrades;
  const axe = split(CONFIG.axe, up.axe);
  const farm = split(CONFIG.farm, up.farm);
  const pick = split(CONFIG.pick, up.pick);
  const shoes = split(CONFIG.shoes, up.shoes);
  const backpack = split(CONFIG.backpack, up.backpack);
  const f = CONFIG.farm;
  const p = CONFIG.pick;
  const wellRadius = wellReach(s);
  const { speed, chopRate, carry } = CONFIG.villager;
  const L = CONFIG.legacy.perks;
  const haul = perkMult(s, 'swiftAndStrong', L.swiftAndStrong.carry);
  const carryBonus = CONFIG.backpack.carryPerLevel * backpack.t * backpack.x * haul; // added after every job's own multipliers, so it is the same for all
  const a = CONFIG.axe;
  const u = CONFIG.upkeep;
  const season = seasonOf(s.time);
  const extra = Math.max(0, s.villagers.length - Math.max(u.freeVillagers, startVillagers(s)));
  // Well Fed: a food surplus (per villager) speeds up every gatherer.
  const wellFed = lvl(s, 'wellFed') > 0 && s.resources.food >= CONFIG.skills.wellFed.perVillager * Math.max(1, s.villagers.length);
  const bountiful = chestMult(s, 'bountiful'); // Lucky Chest: gathering and walking both ×, so every trip takes half as long
  const gather = perkMult(s, 'masterHarvest', L.masterHarvest.gather) * L.legacyX2.gather ** perk(s, 'legacyX2') * (wellFed ? CONFIG.skills.wellFed.gather : 1) * bountiful;
  const guild = guildBonus(s);
  const eat = extra * u.food * CONFIG.skills.rootCellars ** lvl(s, 'rootCellars');
  const winterBurn = extra * u.wood * (1 - CONFIG.coats.burnCut * s.upgrades.coats);
  const burn = season === WINTER ? winterBurn : 0;
  const hungry = eat > 0 && s.resources.food <= 0;
  const cold = burn > 0 && s.resources.wood <= 0;
  // Producers of the missing resource are never slowed, so a shortage can always be worked off.
  const fed = hungry ? u.hungry : 1;
  const warm = cold ? u.cold : 1;
  const linked = linkedBuildings(s);
  const office = s.buildings.some((b) => b.kind === 'taxOffice' && linked.has(b.id));
  const taxedHouses = new Set(office ? s.buildings.filter((b) => b.kind === 'house' && linked.has(b.id)).map((b) => b.id) : []);
  const taxPerHouse = CONFIG.tax.perHouse * (1 + 0.2 * lvl(s, 'taxCollectors')) * perkMult(s, 'royalBank', L.royalBank.gold);
  const festive = season === WINTER && lvl(s, 'harvestFestival') ? CONFIG.skills.festival.winterWalk : 1;
  const walk = speed * CONFIG.shoes.speedGrowth ** shoes.t * shoes.x * (1 + 0.1 * lvl(s, 'swiftFeet')) * perkMult(s, 'swiftAndStrong', L.swiftAndStrong.speed) * festive * bountiful;
  // Greenhouses: farms and orchards keep part of their harvest in winter.
  const farmSeason = CONFIG.seasons.farm.map((m, i) => (i === WINTER && lvl(s, 'greenhouses') ? CONFIG.skills.greenhouse : m));
  const farmRate = f.harvestRate * f.speedGrowth ** farm.t * farm.x * (1 + 0.2 * lvl(s, 'greenThumbs')) * farmSeason[season] * warm * gather * guild.farm;
  const farmLoad = (carry + f.carryPerLevel * farm.t + 2 * lvl(s, 'bigBaskets')) * f.carryGrowth ** farm.t * farm.x * haul;
  const k = CONFIG.skills;
  const weave = 1 + k.weavers * lvl(s, 'weavers') * (up.shoes + up.backpack + up.coats);
  const herdRate = CONFIG.herd.rate * f.speedGrowth ** farm.t * farm.x * warm * gather * guild.herd * weave; // Barn upgrades cover herders too
  // Deep Shafts: miners work faster in winter and are never slowed by cold.
  const shafts = lvl(s, 'deepShafts') ? (season === WINTER ? k.deepShafts : 1) : warm;
  const herdLoad = (CONFIG.herd.carry + f.carryPerLevel * farm.t + 2 * lvl(s, 'bigBaskets')) * f.carryGrowth ** farm.t * farm.x * haul;
  return {
    speed: walk,
    chopRate: chopRate * a.speedGrowth ** axe.t * axe.x * (1 + 0.2 * lvl(s, 'sharpAxes')) * fed * gather * guild.lumber,
    carry: (carry + a.carryPerLevel * axe.t + 2 * lvl(s, 'bigBaskets')) * a.carryGrowth ** axe.t * axe.x * haul + carryBonus,
    carryBonus,
    manualChop: CONFIG.manualChop * 5 ** lvl(s, 'powerSwing'),
    campBonus: lvl(s, 'campCrews') ? 1.5 : 1,
    campRadius: 3,
    perTree: lvl(s, 'teamwork') ? 2 : 1,
    perMarkedTree: lvl(s, 'fellingCrews') ? 3 : lvl(s, 'teamwork') ? 2 : 1,
    farmRate,
    farmCarry: farmLoad + carryBonus,
    orchardSpeed: walk * CONFIG.orchard.speedMult,
    orchardRate: farmRate * CONFIG.orchard.rateMult,
    orchardCarry: farmLoad * CONFIG.orchard.carryMult + carryBonus,
    mineRate: p.mineRate * p.speedGrowth ** pick.t * pick.x * (1 + 0.2 * lvl(s, 'stonecutters')) * fed * shafts * gather * guild.mine,
    mineCarry: (carry + p.carryPerLevel * pick.t + 2 * lvl(s, 'bigBaskets')) * p.carryGrowth ** pick.t * pick.x * haul + carryBonus,
    herdRate,
    herdCarry: herdLoad + carryBonus,
    herdFood: lvl(s, 'fertileHerding'),
    cottonRate: herdRate * CONFIG.cotton.rateMult,
    cottonCarry: herdLoad * CONFIG.cotton.carryMult + carryBonus,
    wellRadius,
    wellFarms: wellFarms(s, linked),
    cropBonus: cropBonus(s, linked),
    farmSeason,
    pastureBonus: pastureBonus(s, linked),
    veinBonus: veinBonus(s),
    roadWalk: 1 + k.cobblestone * lvl(s, 'cobblestone'),
    emptyWalk: 1 + k.errandRunners * lvl(s, 'errandRunners'),
    toll: k.toll * lvl(s, 'tollRoads'),
    wellFed,
    fair: isFair(s),
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
    taxPerHouse,
    tax: taxedHouses.size * taxPerHouse,
    taxHold: taxPerHouse * CONFIG.tax.hold,
    taxStops: CONFIG.satchel.stops[s.upgrades.satchel],
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

/** Crop Rotation: harvest multiplier of each connected farm touching other connected farms. */
function cropBonus(s: GameState, linked: ReadonlySet<number>): Map<number, number> {
  const out = new Map<number, number>();
  if (!lvl(s, 'cropRotation')) return out;
  const { perFarm, max } = CONFIG.skills.cropRotation;
  const farms = s.buildings.filter((b) => b.kind === 'farm' && linked.has(b.id));
  for (const f of farms) {
    const n = farms.filter((o) => o !== f && buildingGap(f, o) <= 1).length;
    if (n) out.set(f.id, 1 + perFarm * Math.min(n, max));
  }
  return out;
}

/** Open Pastures: wool multiplier of each connected Sheep Farm, from the open grass around it. */
function pastureBonus(s: GameState, linked: ReadonlySet<number>): Map<number, number> {
  const out = new Map<number, number>();
  const level = lvl(s, 'openPastures');
  if (!level) return out;
  const { radius: r, perTile } = CONFIG.skills.openPastures;
  for (const b of s.buildings) {
    if (b.kind !== 'sheepFarm' || !linked.has(b.id)) continue;
    const { w, h } = BUILDINGS[b.kind];
    let n = 0;
    for (let y = Math.max(0, b.y - r); y <= Math.min(s.h - 1, b.y + h - 1 + r); y++) {
      for (let x = Math.max(0, b.x - r); x <= Math.min(s.w - 1, b.x + w - 1 + r); x++) if (s.tiles[y * s.w + x] === Tile.Grass) n++;
    }
    if (n) out.set(b.id, 1 + perTile * level * n);
  }
  return out;
}

/** Rich Veins: stone multiplier of each Quarry, from its distance to the Town Center. */
function veinBonus(s: GameState): Map<number, number> {
  const out = new Map<number, number>();
  const level = lvl(s, 'richVeins');
  const tc = s.buildings.find((b) => b.kind === 'townCenter');
  if (!level || !tc) return out;
  const { perTile, maxTiles } = CONFIG.skills.richVeins;
  for (const b of s.buildings) if (b.kind === 'quarry') out.set(b.id, 1 + perTile * level * Math.min(buildingGap(b, tc), maxTiles));
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
  const mules = (1 + 0.25 * lvl(s, 'packMules')) * perkMult(s, 'royalBank', CONFIG.legacy.perks.royalBank.gold) *
    (isFair(s) ? CONFIG.skills.fair.tradeMult : 1);
  for (const b of s.buildings) {
    if (b.kind !== 'tradingPost') continue;
    const gap = Math.min(...markets.map((m) => buildingGap(b, m)));
    out.set(b.id, goldAtRef * (gap / refGap) ** exponent * mules);
  }
  return out;
}

/** Midsummer Fair: all summer, once learned. */
export const isFair = (s: Pick<GameState, 'skills' | 'time'>) => lvl(s, 'midsummerFair') > 0 && seasonOf(s.time) === SUMMER;

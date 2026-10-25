import { CONFIG } from '../config';
import { ACHIEVEMENTS, tiersOf, type AchievementDef, type AchievementGroup, type AchievementId } from '../core/achievements';
import { unlocks, type BuildingKind } from '../core/buildings';
import type { ChestReward } from '../core/chest';
import type { PerkId } from '../core/legacy';
import type { SkillId, Track } from '../core/skills';
import type { Cost, ResourceKey, Resources } from '../core/types';
import { BUILDING_SPRITES, type UiIcon } from '../render/sprites';

export const BUILDING_TEXT: Record<BuildingKind, { name: string; desc: string }> = {
  townCenter: { name: 'Town Center', desc: 'Hire villagers. Drop-off for everything.' },
  outpost: {
    name: 'Frontier Outpost',
    desc: 'A second town hub, anywhere on cleared land. Hire villagers and drop off everything here; buildings on its roads work without a road to the Town Center. Only one.',
  },
  house: { name: 'House', desc: 'Raises the population cap. Must touch the Town Center or a city building.' },
  lumberCamp: { name: 'Lumber Camp', desc: 'Stores wood. Upgrade all lumberjacks here.' },
  barn: { name: 'Barn', desc: 'Stores food and cloth. Upgrade all farms, orchards, sheep farms and cotton plantations here.' },
  farm: { name: 'Farm', desc: 'Assigns a villager to grow food.' },
  orchard: {
    name: 'Fruit Orchard',
    desc: `Three orchardists walk ×${CONFIG.orchard.speedMult} as fast as a farmer, harvest ×${CONFIG.orchard.rateMult} and carry ×${CONFIG.orchard.carryMult}. Barn upgrades and seasons apply.`,
  },
  quarry: { name: 'Quarry', desc: 'Miners gather stone and deliver it to the Town Center.' },
  sheepFarm: { name: 'Sheep Farm', desc: 'A herder spins wool into cloth for the Town Center or the nearest Barn.' },
  cottonPlantation: {
    name: 'Cotton Plantation',
    desc: `Five pickers gather cloth ×${CONFIG.cotton.rateMult} as fast as a herder and carry ×${CONFIG.cotton.carryMult} as much. Barn upgrades apply.`,
  },
  tailor: { name: 'Tailor', desc: 'Sews cloth from the stockpile into shoes, backpacks and coats for the whole town.' },
  well: { name: 'Well', desc: 'Nearby farms harvest ×3 and carry ×2.' },
  market: {
    name: 'Market',
    desc: 'Sell goods for gold or buy them with gold. Traders deliver gold here. Must touch the Town Center or a city building.',
  },
  taxOffice: {
    name: 'Tax Office',
    desc: `Connected houses owe gold, up to ${CONFIG.tax.hold} s of tax each. A collector walks the roads house to house and brings it back here. Must touch the Town Center or a city building.`,
  },
  tradingPost: {
    name: 'Trading Post',
    desc: 'Its pack mule loads gold and carries it along the roads to the nearest Market. The farther apart they are, the more gold per trip. Buy more mules for the route, up to 5.',
  },
};

export const TRACK_TEXT: Record<Track, { name: string; icon: UiIcon }> = {
  forestry: { name: 'Forestry', icon: 'trees' },
  settlement: { name: 'Settlement', icon: 'pop' },
  farming: { name: 'Farming', icon: 'food' },
  herding: { name: 'Herding', icon: 'cloth' },
  mining: { name: 'Mining', icon: 'pick' },
  trade: { name: 'Trade', icon: 'gold' },
};

const { boosts: B, windfall: WF } = CONFIG.chest;
/** Lucky Chest rewards. `tier` (1–4) sets how big the reveal is: Great, Super, Epic, Legendary. */
export const CHEST_TEXT: Record<ChestReward, { name: string; desc: string; icon: UiIcon; tier: 1 | 2 | 3 | 4 }> = {
  speed2: { name: `Speed ×${B.speed2.mult}`, desc: 'The whole forest runs twice as fast', icon: 'bolt', tier: 1 },
  speed3: { name: `Speed ×${B.speed3.mult}`, desc: 'The whole forest runs three times as fast', icon: 'bolt', tier: 2 },
  speed5: { name: `Speed ×${B.speed5.mult}`, desc: 'The whole forest runs five times as fast', icon: 'bolt', tier: 4 },
  taps: { name: `Mighty Taps ×${B.taps.mult}`, desc: 'Every chop by hand hits ten times as hard', icon: 'chop', tier: 1 },
  bountiful: { name: `Bountiful ×${B.bountiful.mult}`, desc: 'Villagers gather and walk twice as fast', icon: 'basket', tier: 2 },
  windfall: { name: 'Windfall!', desc: `${WF.minutes} minutes of income, right now`, icon: 'purse', tier: 3 },
};
export const CHEST_TIERS = ['', 'Great!', 'Super!', 'Epic!', 'Legendary!'] as const;

export const SKILL_TEXT: Record<SkillId, { name: string; desc: string; icon: UiIcon }> = {
  sharpAxes: { name: 'Sharp Axes', desc: '+20% villager chop speed per level', icon: 'chop' },
  bigBaskets: { name: 'Big Baskets', desc: '+2 villager carry per level', icon: 'basket' },
  swiftFeet: { name: 'Swift Feet', desc: '+10% villager walk speed per level', icon: 'boot' },
  powerSwing: { name: 'Power Swing', desc: 'Your taps chop ×5 per level', icon: 'bolt' },
  roomyHouses: { name: 'Roomy Houses', desc: '+1 population per house per level', icon: 'house' },
  recruiters: { name: 'Recruiters', desc: 'Villagers cost 15% less per level', icon: 'pop' },
  masterBuilders: { name: 'Master Builders', desc: 'Buildings cost 20% less', icon: 'hammer' },
  campCrews: { name: 'Camp Crews', desc: 'Chop ×1.5 within 3 tiles of a Lumber Camp', icon: 'wood' },
  teamwork: { name: 'Teamwork', desc: 'Two villagers can work the same tree', icon: 'trees' },
  fellingCrews: { name: 'Felling Crews', desc: 'Three villagers can work the same flagged tree', icon: 'mark' },
  greenThumbs: { name: 'Green Thumbs', desc: '+20% farm harvest per level', icon: 'food' },
  stonecutters: { name: 'Stonecutters', desc: '+20% mining speed per level', icon: 'pick' },
  masons: { name: 'Masons', desc: 'Buildings and upgrades need 15% less stone per level', icon: 'stone' },
  quarryCrews: { name: 'Quarry Crews', desc: '+1 miner per quarry per level', icon: 'pair' },
  deepWells: { name: 'Deep Wells', desc: 'Wells boost farms within 2 tiles', icon: 'drop' },
  fertileHerding: { name: 'Fertile Herding', desc: 'Herders also bring back as much food as cloth', icon: 'food' },
  taxCollectors: { name: 'Tax Collectors', desc: '+20% tax per level', icon: 'purse' },
  deputies: { name: 'Deputies', desc: 'Each Tax Office sends out a second collector', icon: 'pair' },
  packMules: { name: 'Pack Mules', desc: '+25% gold per trade trip per level', icon: 'basket' },
  shrewdTraders: { name: 'Shrewd Traders', desc: 'Market commission 5 points lower per level', icon: 'scales' },
  quarrying: { name: 'Quarrying', desc: 'Unlocks the Quarry', icon: 'stone' },
  wells: { name: 'Wells', desc: 'Unlocks the Well', icon: 'drop' },
  orchards: { name: 'Orchards', desc: 'Unlocks the Fruit Orchard', icon: 'food' },
  sheepFarms: { name: 'Sheep Farms', desc: 'Unlocks the Sheep Farm', icon: 'cloth' },
  tailoring: { name: 'Tailoring', desc: 'Unlocks the Tailor', icon: 'cloth' },
  cottonFields: { name: 'Cotton Fields', desc: 'Unlocks the Cotton Plantation', icon: 'cloth' },
  markets: { name: 'Markets', desc: 'Unlocks the Market', icon: 'gold' },
  taxOffices: { name: 'Tax Offices', desc: 'Unlocks the Tax Office', icon: 'gold' },
  tradingPosts: { name: 'Trading Posts', desc: 'Unlocks the Trading Post', icon: 'gold' },
  sweepingStrike: { name: 'Sweeping Strike', desc: 'Your taps also hit every choppable tree around the one you tap, for half as much', icon: 'sweep' },
  momentum: { name: 'Momentum', desc: 'Quick taps build a combo: +10% per tap, up to +50% per level', icon: 'combo' },
  keenEyes: { name: 'Keen Eyes', desc: 'See 1 more ring into the forest per level, and relics come 10% sooner per level', icon: 'eye' },
  heartwood: { name: 'Heartwood', desc: 'Each felled tree has a 10% chance per level to pay half its wood again', icon: 'rings' },
  timber: { name: 'Timber!', desc: 'A felled tree topples onto a neighbouring tree, dealing half its wood. Falls can chain', icon: 'fall' },
  cropRotation: { name: 'Crop Rotation', desc: 'Farms harvest +25% for each farm touching them, up to +100%', icon: 'plots' },
  farmhands: { name: 'Farmhands', desc: '+1 farmer per farm per level', icon: 'fork' },
  rootCellars: { name: 'Root Cellars', desc: 'Villagers eat 15% less food per level', icon: 'barrel' },
  greenhouses: { name: 'Greenhouses', desc: 'Farms and orchards harvest at half speed in winter instead of stopping', icon: 'glass' },
  harvestFestival: { name: 'Harvest Festival', desc: 'As winter begins, farms and orchards deliver a minute of harvest at once, and villagers walk ×1.25 all winter', icon: 'sheaf' },
  openPastures: { name: 'Open Pastures', desc: 'Sheep Farms gather +1% wool per level for each open grass tile within 2 tiles', icon: 'meadow' },
  shearingDay: { name: 'Shearing Day', desc: 'As spring begins, every Sheep Farm delivers a minute of wool at once', icon: 'shears' },
  goldenFleece: { name: 'Golden Fleece', desc: "Each herder's delivery has a 3% chance per level to be worth 10× the cloth", icon: 'fleece' },
  weavers: { name: 'Weavers', desc: '+4% cloth for every Tailor upgrade level you own', icon: 'yarn' },
  grazingFlocks: { name: 'Grazing Flocks', desc: 'Each Sheep Farm grazes the trees within 4 tiles as fast as 3 lumberjacks, nearest first', icon: 'sheep' },
  richVeins: { name: 'Rich Veins', desc: 'Quarries mine +2% per level for each tile from the Town Center, up to 30 tiles', icon: 'vein' },
  geodes: { name: 'Geodes', desc: "Each miner's delivery has a 2% chance per level to bring a gem worth 25 gold per stone", icon: 'gem' },
  cobblestone: { name: 'Cobblestone', desc: 'Villagers walk +20% faster along roads per level', icon: 'cobble' },
  deepShafts: { name: 'Deep Shafts', desc: 'Miners work ×1.5 in winter and are never slowed by cold', icon: 'mine' },
  errandRunners: { name: 'Errand Runners', desc: 'Empty-handed villagers walk +25% faster per level', icon: 'run' },
  wellFed: { name: 'Well Fed', desc: 'While you have 10 food in stock per villager, all gathering is ×1.2', icon: 'bowl' },
  surveyors: { name: 'Surveyors', desc: '+2 roads per house per level', icon: 'map' },
  frontierOutpost: { name: 'Frontier Outpost', desc: 'Unlocks the Outpost: a second town hub you can build anywhere on cleared land', icon: 'house' },
  tollRoads: { name: 'Toll Roads', desc: 'Villagers pay 0.1 gold per road tile they walk, per level', icon: 'toll' },
  guildContracts: { name: 'Guild Contracts', desc: 'The Market posts 3 contracts. Finish one for a gold reward and a new one takes its place', icon: 'scroll' },
  midsummerFair: { name: 'Midsummer Fair', desc: 'All summer the Market charges no commission and Trading Posts pay ×1.5', icon: 'sun' },
  merchantCaravans: { name: 'Merchant Caravans', desc: 'Each winter a caravan visits the Market with 3 deals. Take one before spring', icon: 'wagon' },
  dynamite: { name: 'Dynamite', desc: 'Blast a Quarry: 30 s of its stone at once, and every tree within 2 tiles is hit like 100 taps. Once per 90 s', icon: 'tnt' },
};

const P = CONFIG.legacy.perks;
const pct = (mult: number) => `${Math.round((1 - mult) * 100)}%`;
export const LEGACY_TEXT: Record<PerkId, { name: string; desc: string; icon: UiIcon }> = {
  masterHarvest: { name: 'Master Harvest', desc: `Villagers chop, farm, mine and herd ×${P.masterHarvest.gather} faster`, icon: 'chop' },
  swiftAndStrong: {
    name: 'Swift & Strong', desc: `Villagers walk ×${P.swiftAndStrong.speed} faster and carry ×${P.swiftAndStrong.carry} more`, icon: 'boot',
  },
  urbanCore: {
    name: 'Urban Core',
    desc: `Base population ${P.urbanCore.basePop} instead of ${CONFIG.economy.basePop}. Villagers cost ${pct(P.urbanCore.hire)} less. ${P.urbanCore.start}×${P.urbanCore.start} starting clearing`,
    icon: 'house',
  },
  prosperousCity: {
    name: 'Prosperous City',
    desc: `All buildings cost ${pct(P.prosperousCity.build)} less. Start each run with ${P.prosperousCity.villagers} villagers, who need no food or firewood`,
    icon: 'hammer',
  },
  tradeGuilds: {
    name: 'Trade Guilds',
    desc: `Lumberjacks chop ×${P.tradeGuilds.chop}. Every worker in a profession (lumberjack, farmer, miner, herder) speeds up that profession, tapering toward +${P.tradeGuilds.cap * 100}%`,
    icon: 'pair',
  },
  royalBank: {
    name: 'Royal Bank', desc: `Tax and trade gold ×${P.royalBank.gold}. Market commission ${pct(P.royalBank.commission)} lower`, icon: 'gold',
  },
  relicHunters: {
    name: 'Relic Hunters',
    desc: `Relics appear ×${1 / P.relicHunters.gap} as often and offer ${P.relicHunters.cards} more skill to choose from`,
    icon: 'relic',
  },
  legacyX2: { name: 'Legacy ×2', desc: `Every gather rate ×${P.legacyX2.gather}. Can be taken again at every rebuild`, icon: 'bolt' },
};

/** A skill's icon; a skill that unlocks a building with a sprite shows that building's thumbnail instead. */
export function skillIcon(id: SkillId): string {
  const kind = unlocks(id);
  return kind && BUILDING_SPRITES[kind] ? `<i class="ico skill-thumb thumb-${kind}"></i>` : icon(SKILL_TEXT[id].icon);
}

const UNITS = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi'];
/** 999 → "999", 12345 → "12.3k", 4.56e6 → "4.56M". */
export function fmt(n: number): string {
  if (n < 1000) return String(Math.floor(n));
  const e = Math.min(Math.floor(Math.log10(n) / 3), UNITS.length - 1);
  const v = n / 1000 ** e;
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)}${UNITS[e]}`;
}
export const icon = (name: UiIcon) => `<i class="ico ico-${name}"></i>`;

/** A cost as icon chips; chips the player can't afford yet are marked short. */
export const costHtml = (c: Cost, have: Resources) =>
  (Object.entries(c) as [ResourceKey, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `<span class="chip${have[k] < v ? ' short' : ''}" title="${k}">${icon(k)}${fmt(v)}</span>`)
    .join('');

export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}

const pl = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const firstOf = (kind: BuildingKind) => `Build your first ${BUILDING_TEXT[kind].name}`;

export const ACHIEVEMENT_GROUP_TEXT: Record<AchievementGroup, string> = { gathering: 'Gathering', town: 'Town', firsts: 'Firsts', feats: 'Feats' };

/** Each achievement's name, what a tier asks for (from that tier's goal), and icon. A first-building achievement shows the building instead. */
export const ACHIEVEMENT_TEXT: Record<AchievementId, { name: string; desc: (n: number) => string; icon: UiIcon }> = {
  trees: { name: 'Timberrr!', desc: (n) => `Fell ${pl(n, 'tree')}`, icon: 'trees' },
  wood: { name: 'Woodpile', desc: (n) => `Gather ${fmt(n)} wood`, icon: 'wood' },
  food: { name: 'Full Pantry', desc: (n) => `Gather ${fmt(n)} food`, icon: 'food' },
  stone: { name: 'Stone Cold', desc: (n) => `Gather ${fmt(n)} stone`, icon: 'stone' },
  cloth: { name: 'Fine Threads', desc: (n) => `Gather ${fmt(n)} cloth`, icon: 'cloth' },
  gold: { name: 'Treasure Trove', desc: (n) => `Earn ${fmt(n)} gold`, icon: 'gold' },
  taps: { name: 'Busy Hands', desc: (n) => `Chop trees by hand ${pl(n, 'time')}`, icon: 'chop' },
  pop: { name: 'Village Elder', desc: (n) => `Have ${pl(n, 'villager')} at once`, icon: 'pop' },
  land: { name: 'Landholder', desc: (n) => `Claim ${pl(n, 'tile')} of land in one run`, icon: 'land' },
  buildings: { name: 'Architect', desc: (n) => `Have ${pl(n, 'building')} standing at once`, icon: 'hammer' },
  upgrades: { name: 'Well Equipped', desc: (n) => `Buy ${pl(n, 'upgrade')} in one run`, icon: 'pick' },
  relics: { name: 'Relic Hunter', desc: (n) => `Collect ${pl(n, 'relic')}`, icon: 'relic' },
  skills: { name: 'Scholar', desc: (n) => `Learn ${pl(n, 'skill level')} in one run`, icon: 'skills' },
  winters: { name: 'Weathered', desc: (n) => `Live through ${pl(n, 'winter')}`, icon: 'barrel' },
  contracts: { name: 'Contractor', desc: (n) => `Finish ${pl(n, 'Guild Contract')}`, icon: 'scroll' },
  rebuilds: { name: 'Founder', desc: (n) => (n === 1 ? 'Rebuild once' : `Rebuild ${n} times`), icon: 'house' },
  firstRoad: { name: 'All Roads Lead Home', desc: () => 'Lay your first road', icon: 'cobble' },
  firstHouse: { name: 'Home Sweet Home', desc: () => firstOf('house'), icon: 'house' },
  firstLumberCamp: { name: 'Camp Out', desc: () => firstOf('lumberCamp'), icon: 'wood' },
  firstBarn: { name: 'Barn Raising', desc: () => firstOf('barn'), icon: 'food' },
  firstFarm: { name: 'Green Acres', desc: () => firstOf('farm'), icon: 'food' },
  firstQuarry: { name: 'Rock On', desc: () => firstOf('quarry'), icon: 'stone' },
  firstWell: { name: 'Wishing Well', desc: () => firstOf('well'), icon: 'drop' },
  firstOrchard: { name: 'Apple of My Eye', desc: () => firstOf('orchard'), icon: 'food' },
  firstSheepFarm: { name: 'Shepherd', desc: () => firstOf('sheepFarm'), icon: 'sheep' },
  firstTailor: { name: 'Made to Measure', desc: () => firstOf('tailor'), icon: 'cloth' },
  firstCotton: { name: 'Soft Touch', desc: () => firstOf('cottonPlantation'), icon: 'cloth' },
  firstMarket: { name: 'Open for Business', desc: () => firstOf('market'), icon: 'gold' },
  firstTaxOffice: { name: 'Death and Taxes', desc: () => firstOf('taxOffice'), icon: 'purse' },
  firstTradingPost: { name: 'Trade Route', desc: () => firstOf('tradingPost'), icon: 'wagon' },
  firstOutpost: { name: 'Frontier Spirit', desc: () => firstOf('outpost'), icon: 'house' },
  clearCut: { name: 'Clear-Cut', desc: () => 'Fell every tree on the map', icon: 'fall' },
  allBuildings: { name: 'Master Plan', desc: () => 'Unlock every building in one run', icon: 'hammer' },
  maxSkill: { name: 'Grandmaster', desc: () => 'Max out a skill that has several levels', icon: 'skills' },
  caravan: { name: 'Caravan Trader', desc: () => 'Take a Merchant Caravan deal', icon: 'wagon' },
  dynamite: { name: 'Fire in the Hole', desc: () => 'Blast a Quarry with Dynamite', icon: 'tnt' },
  domino: { name: 'Domino Effect', desc: () => 'Topple 5 trees in one Timber! chain', icon: 'fall' },
  goldenTouch: { name: 'Golden Touch', desc: () => 'Shear a Golden Fleece', icon: 'fleece' },
  hiddenGem: { name: 'Hidden Gem', desc: () => 'Find a geode in a Quarry', icon: 'gem' },
  bigBang: { name: 'Big Bang', desc: () => 'Hit 10 trees with one Dynamite blast', icon: 'tnt' },
  eagerBeaver: { name: 'Eager Beaver', desc: () => 'Fell 20 trees in the first minute of a run', icon: 'run' },
  hardTimes: { name: 'Hard Times', desc: () => 'Run out of food and firewood at the same time', icon: 'bowl' },
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
/** The name, with a tier numeral on a ladder once a tier is earned. */
export const achievementName = (id: AchievementId, tier: number) =>
  tiersOf(id).length > 1 && tier > 0 ? `${ACHIEVEMENT_TEXT[id].name} ${ROMAN[tier - 1]}` : ACHIEVEMENT_TEXT[id].name;
/** What tier `tier` (1-based) asks for. */
export const achievementDesc = (id: AchievementId, tier: number) => ACHIEVEMENT_TEXT[id].desc(tiersOf(id)[tier - 1]);
export function achievementIcon(id: AchievementId): string {
  const kind = (ACHIEVEMENTS[id] as AchievementDef).building;
  return kind && BUILDING_SPRITES[kind] ? `<i class="ico skill-thumb thumb-${kind}"></i>` : icon(ACHIEVEMENT_TEXT[id].icon);
}

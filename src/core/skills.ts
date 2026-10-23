import { CONFIG } from '../config';
import { rand } from './rng';
import type { GameState } from './types';

/** Skills and their max levels. Effects are applied in stats.ts / economy.ts; text lives in ui/text.ts. */
export const SKILLS = {
  sharpAxes: { max: 5 }, // +20% villager chop speed / lvl
  bigBaskets: { max: 5 }, // +2 carry / lvl
  swiftFeet: { max: 5 }, // +10% walk speed / lvl
  powerSwing: { max: 2 }, // manual chop ×5 / lvl
  roomyHouses: { max: 3 }, // +1 pop per house / lvl
  recruiters: { max: 3 }, // villagers −15% / lvl
  masterBuilders: { max: 1 }, // buildings −20%
  campCrews: { max: 1 }, // ×1.5 chop within 3 tiles of a Lumber Camp
  teamwork: { max: 1 }, // 2 villagers per tree
  greenThumbs: { max: 5 }, // +20% farm harvest / lvl
  stonecutters: { max: 5 }, // +20% mining speed / lvl
  masons: { max: 3 }, // stone costs −15% / lvl
  quarryCrews: { max: 2 }, // +1 miner per quarry / lvl
  deepWells: { max: 1 }, // well radius +1
  fertileHerding: { max: 1 }, // herders also deliver food equal to their cloth
  taxCollectors: { max: 5 }, // +20% tax / lvl
  packMules: { max: 3 }, // +25% gold per trade trip / lvl
  shrewdTraders: { max: 2 }, // market commission −5 points / lvl
  sweepingStrike: { max: 1 }, // taps also hit choppable neighbours
  momentum: { max: 3 }, // tap combo
  keenEyes: { max: 2 }, // +1 sight ring, relics sooner / lvl
  heartwood: { max: 3 }, // chance of bonus wood per felled tree
  cropRotation: { max: 1 }, // farms gain from touching farms
  farmhands: { max: 2 }, // +1 farmer per farm / lvl
  rootCellars: { max: 3 }, // food upkeep −15% / lvl
  greenhouses: { max: 1 }, // farms harvest in winter
  openPastures: { max: 3 }, // Sheep Farms gain from open grass around them
  shearingDay: { max: 1 }, // a wool bonus as spring starts
  goldenFleece: { max: 3 }, // chance of a 10× herder delivery
  weavers: { max: 1 }, // cloth bonus per Tailor upgrade owned
  richVeins: { max: 3 }, // Quarries far from the Town Center yield more
  geodes: { max: 3 }, // chance of a gem worth gold per miner delivery
  cobblestone: { max: 2 }, // faster walking along roads
  deepShafts: { max: 1 }, // miners thrive in winter
  errandRunners: { max: 2 }, // empty-handed villagers walk faster
  wellFed: { max: 1 }, // a food surplus speeds up gathering
  surveyors: { max: 2 }, // more roads per house
  tollRoads: { max: 2 }, // villagers pay gold per road tile walked
  guildContracts: { max: 1 }, // a board of orders at the Market
  midsummerFair: { max: 1 }, // summer trade bonus
  // Masteries (see MASTERY)
  timber: { max: 1 }, // felled trees topple onto a neighbour
  harvestFestival: { max: 1 }, // a harvest bonus as winter starts, faster walking in winter
  grazingFlocks: { max: 1 }, // Sheep Farms graze nearby trees
  dynamite: { max: 1 }, // blast a Quarry for stone and to hit the trees around it
  frontierOutpost: { max: 1 }, // unlocks the Outpost
  merchantCaravans: { max: 1 }, // a yearly caravan with deals
  // Building unlocks (see BuildingDef.unlock)
  quarrying: { max: 1 },
  wells: { max: 1 },
  orchards: { max: 1 },
  sheepFarms: { max: 1 },
  tailoring: { max: 1 },
  cottonFields: { max: 1 },
  markets: { max: 1 },
  taxOffices: { max: 1 },
  tradingPosts: { max: 1 },
} as const satisfies Record<string, { max: number }>;
export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

/** Skill tracks, one per economy. A track lists its skills parents first; the order also sets sibling order in the tree. */
export const TRACKS = {
  forestry: ['sharpAxes', 'powerSwing', 'sweepingStrike', 'momentum', 'campCrews', 'teamwork', 'keenEyes', 'heartwood', 'timber'],
  settlement: ['swiftFeet', 'bigBaskets', 'errandRunners', 'wellFed', 'roomyHouses', 'recruiters', 'masterBuilders', 'surveyors', 'frontierOutpost'],
  farming: ['greenThumbs', 'wells', 'deepWells', 'cropRotation', 'farmhands', 'orchards', 'rootCellars', 'greenhouses', 'harvestFestival'],
  herding: ['sheepFarms', 'openPastures', 'shearingDay', 'fertileHerding', 'goldenFleece', 'tailoring', 'weavers', 'cottonFields', 'grazingFlocks'],
  mining: ['quarrying', 'stonecutters', 'quarryCrews', 'deepShafts', 'masons', 'cobblestone', 'richVeins', 'geodes', 'dynamite'],
  trade: ['markets', 'tradingPosts', 'packMules', 'tollRoads', 'taxOffices', 'taxCollectors', 'guildContracts', 'shrewdTraders', 'midsummerFair', 'merchantCaravans'],
} as const satisfies Record<string, readonly SkillId[]>;
export type Track = keyof typeof TRACKS;
export const TRACK_IDS = Object.keys(TRACKS) as Track[];

/**
 * Each skill's parent: it can be offered once the parent has a level. Every track is a tree whose root
 * (its first skill) has no parent, so a parent can unlock several skills. Masteries have no parent.
 */
const PARENT: Partial<Record<SkillId, SkillId>> = {
  powerSwing: 'sharpAxes',
  sweepingStrike: 'powerSwing',
  momentum: 'powerSwing',
  campCrews: 'sharpAxes',
  teamwork: 'campCrews',
  keenEyes: 'sharpAxes',
  heartwood: 'keenEyes',
  bigBaskets: 'swiftFeet',
  errandRunners: 'bigBaskets',
  wellFed: 'bigBaskets',
  roomyHouses: 'swiftFeet',
  recruiters: 'roomyHouses',
  masterBuilders: 'roomyHouses',
  surveyors: 'masterBuilders',
  wells: 'greenThumbs',
  deepWells: 'wells',
  cropRotation: 'wells',
  farmhands: 'greenThumbs',
  orchards: 'farmhands',
  rootCellars: 'greenThumbs',
  greenhouses: 'rootCellars',
  openPastures: 'sheepFarms',
  shearingDay: 'openPastures',
  fertileHerding: 'sheepFarms',
  goldenFleece: 'fertileHerding',
  tailoring: 'sheepFarms',
  weavers: 'tailoring',
  cottonFields: 'sheepFarms',
  stonecutters: 'quarrying',
  quarryCrews: 'stonecutters',
  deepShafts: 'stonecutters',
  masons: 'quarrying',
  cobblestone: 'masons',
  richVeins: 'quarrying',
  geodes: 'richVeins',
  tradingPosts: 'markets',
  packMules: 'tradingPosts',
  tollRoads: 'tradingPosts',
  taxOffices: 'markets',
  taxCollectors: 'taxOffices',
  guildContracts: 'taxOffices',
  shrewdTraders: 'markets',
  midsummerFair: 'shrewdTraders',
};

const TRACK_OF = Object.fromEntries(
  TRACK_IDS.flatMap((t) => TRACKS[t].map((id) => [id, t])),
) as Record<SkillId, Track>;
export const trackOf = (id: SkillId): Track => TRACK_OF[id];

/** Each track's Mastery: offered once `CONFIG.skills.masteryLevels` levels are learned in the rest of its track. */
export const MASTERY: Partial<Record<Track, SkillId>> = {
  forestry: 'timber', farming: 'harvestFestival', herding: 'grazingFlocks', mining: 'dynamite',
  settlement: 'frontierOutpost', trade: 'merchantCaravans',
};
export const isMastery = (id: SkillId) => MASTERY[trackOf(id)] === id;

/** Levels learned in a track, its Mastery excluded. */
export const trackLevels = (s: Pick<GameState, 'skills'>, t: Track) =>
  TRACKS[t].reduce((n, id) => n + (isMastery(id) ? 0 : lvl(s, id)), 0);

/** Whether a skill's requirement (its parent's first level, or a Mastery's track levels) is met. */
export const requirementMet = (s: Pick<GameState, 'skills'>, id: SkillId) => {
  const req = prerequisite(id);
  return isMastery(id) ? trackLevels(s, trackOf(id)) >= CONFIG.skills.masteryLevels : !req || lvl(s, req) > 0;
};

/** The skill that must have a level before this one is offered, if any. */
export const prerequisite = (id: SkillId): SkillId | undefined => PARENT[id];

/** The skills this one unlocks, in track order. */
export const unlockedBy = (id: SkillId): SkillId[] => TRACKS[trackOf(id)].filter((child) => PARENT[child] === id);

export const lvl = (s: Pick<GameState, 'skills'>, id: SkillId) => s.skills[id] ?? 0;

export const availableSkills = (s: GameState): SkillId[] =>
  SKILL_IDS.filter((id) => lvl(s, id) < SKILLS[id].max && requirementMet(s, id));

/**
 * Offer up to `n` distinct available skills (seeded, so reloads see the same cards).
 * Each comes from a different track while untouched tracks remain.
 */
export function dealCards(s: GameState, n = 3): void {
  const pool = availableSkills(s);
  s.cards = [];
  while (s.cards.length < n && pool.length) {
    const fresh = pool.filter((id) => !s.cards.some((c) => trackOf(c) === trackOf(id)));
    const from = fresh.length ? fresh : pool;
    const id = from[Math.floor(rand(s) * from.length)];
    s.cards.push(id);
    pool.splice(pool.indexOf(id), 1);
  }
}

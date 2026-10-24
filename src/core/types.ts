import type { AchievementId, Counter } from './achievements';
import type { BuildingKind } from './buildings';
import type { PerkId } from './legacy';
import type { SkillId } from './skills';

export const Tile = { Grass: 0, Tree: 1, Building: 2, Relic: 3, Road: 4 } as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

export const RESOURCES = ['wood', 'food', 'stone', 'cloth', 'gold'] as const;
export type ResourceKey = (typeof RESOURCES)[number];
export type Resources = Record<ResourceKey, number>;
export type Cost = Partial<Resources>;
/** Resources villagers can be hired with, each on its own price track. */
export type HireResource = 'wood' | 'food' | 'cloth';

export type Job = 'lumber' | 'farm' | 'orchard' | 'mine' | 'herd' | 'cotton' | 'tax';
/** Lumberjack: idle → toTree → chop → toHome. Workplace jobs: idle → toWork → work → toHome. Tax collector: idle → toWork (house to house) → toHome. */
export type VillagerState = 'idle' | 'toTree' | 'chop' | 'toWork' | 'work' | 'toHome';

/** Anything that walks a path (see movement.walk). */
export interface Walker {
  id: number;
  x: number; // tile units, continuous (tile centers at .5)
  y: number;
  path: number[]; // tile indices to walk through
  pathI: number; // next waypoint
  carry: number; // of the resource it carries
}

export interface Villager extends Walker {
  state: VillagerState;
  target: number; // claimed tree tile, -1 if none (released at every delivery)
  job: Job;
  workplace: number; // building id for workplace jobs (farm, orchard, mine, herd, cotton, tax), -1 otherwise
  round?: number[]; // tax collector: house tiles visited this round
}

/** A Trading Post's pack mule: idle (at its post) → load → toMarket → (deposit) → toPost → load ... */
export type MuleState = 'idle' | 'load' | 'toMarket' | 'toPost';
export interface Mule extends Walker {
  state: MuleState;
  post: number; // its Trading Post's id
}

export interface Building {
  id: number;
  kind: BuildingKind;
  x: number; // top-left tile
  y: number;
  paidCost: Cost; // original materials paid; moving and later discounts do not change this
  tally: Cost; // lifetime amounts its workers produced (workplaces) or it collected (drop-offs, Tax Office)
  due?: number; // house: gold owed, waiting for a tax collector
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Run counters for events nothing else in the state records (see achievements.ts). `chain` and `blastTrees` keep the best, the rest add up. */
export const EVENTS = ['taps', 'relics', 'fleece', 'geodes', 'blasts', 'blastTrees', 'contracts', 'deals', 'chain'] as const;
export type EventKey = (typeof EVENTS)[number];

/** Persistent, JSON-serializable (after typed-array conversion) game state. */
export interface GameState {
  seed: number;
  rng: number;
  w: number;
  h: number;
  origin: Rect; // initial clearing; tree wood grows with distance from it
  tiles: Uint8Array; // Tile per cell. Every cell but trees and relics is territory.
  wood: Float64Array; // wood remaining per tree cell
  marked: number[]; // priority trees (player-marked)
  buildings: Building[];
  villagers: Villager[];
  mules: Mule[]; // one per Trading Post (see systems/mules.ts)
  resources: Resources;
  upgrades: { axe: number; farm: number; pick: number; coats: number; shoes: number; backpack: number; satchel: number };
  hires: Record<HireResource, number>; // villagers bought with each resource (separate price tracks)
  paused: number[]; // ids of paused workplaces
  skills: Partial<Record<SkillId, number>>;
  totals: Resources; // lifetime gathered (for rates/stats)
  treesLeft: number;
  treesChopped: number; // felled this run (drives relic spawns)
  relics: number[]; // uncollected relic tiles
  relicsSpawned: number;
  nextRelicAt: number; // treesChopped value that spawns the next relic
  cards: SkillId[]; // skill choices on offer (empty = none)
  picksPending: number; // relics collected whose skill hasn't been picked yet
  nextId: number;
  time: number; // simulated seconds
  legacy: { runs: number; perks: Partial<Record<PerkId, number>> }; // kept across rebuilds (prestige)
  contracts: Contract[]; // Guild Contracts on the board
  caravan: Deal[] | null; // Merchant Caravan deals while it is in town (null = away)
  counts: Record<EventKey, number>; // this run's event counters
  career: { past: Record<Counter, number>; earned: Partial<Record<AchievementId, number>> }; // kept across rebuilds: past runs' counters, achievement tiers earned
}

/** A Guild Contract: gather `need` more of a resource, fell `need` more trees, or reach `need` villagers. Pays `reward` gold. */
export type Contract =
  | { kind: 'gather'; res: Exclude<ResourceKey, 'gold'>; need: number; base: number; reward: number }
  | { kind: 'fell'; need: number; base: number; reward: number }
  | { kind: 'grow'; need: number; reward: number };

/** A Merchant Caravan deal: pay `give` for `get`. */
export interface Deal {
  give: Cost;
  get: Cost;
}

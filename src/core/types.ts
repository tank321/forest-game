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

export type Job = 'lumber' | 'farm' | 'orchard' | 'mine' | 'herd' | 'cotton' | 'trade';
/** Lumberjack: idle → toTree → chop → toHome. Workplace jobs: idle → toWork → work → toHome. */
export type VillagerState = 'idle' | 'toTree' | 'chop' | 'toWork' | 'work' | 'toHome';

export interface Villager {
  id: number;
  x: number; // tile units, continuous (tile centers at .5)
  y: number;
  state: VillagerState;
  path: number[]; // tile indices to walk through
  pathI: number; // next waypoint
  target: number; // claimed tree tile, -1 if none (released at every delivery)
  carry: number; // of the job's resource
  job: Job;
  workplace: number; // building id for workplace jobs (farm, orchard, mine, herd, cotton, trade), -1 otherwise
}

export interface Building {
  id: number;
  kind: BuildingKind;
  x: number; // top-left tile
  y: number;
  paidCost: Cost; // original materials paid; moving and later discounts do not change this
  tally: Cost; // lifetime amounts its workers produced (workplaces) or it collected (drop-offs, Tax Office)
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  resources: Resources;
  upgrades: { axe: number; farm: number; pick: number; coats: number; shoes: number; backpack: number };
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

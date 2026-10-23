import type { BuildingKind } from './buildings';
import type { SkillId } from './skills';

export const Tile = { Grass: 0, Tree: 1, Building: 2, Relic: 3 } as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

export type VillagerState = 'idle' | 'toTree' | 'chop' | 'toHome';

export interface Villager {
  id: number;
  x: number; // tile units, continuous (tile centers at .5)
  y: number;
  state: VillagerState;
  path: number[]; // tile indices to walk through
  pathI: number; // next waypoint
  target: number; // claimed tree tile, -1 if none (kept across trips until it falls)
  carry: number;
}

export interface Building {
  id: number;
  kind: BuildingKind;
  x: number; // top-left tile
  y: number;
}

export interface Resources {
  wood: number;
}
export type Cost = Partial<Resources>;

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
  tiles: Uint8Array; // Tile per cell. Every non-Tree cell is territory.
  wood: Float64Array; // wood remaining per tree cell
  marked: number[]; // priority trees (player-marked)
  buildings: Building[];
  villagers: Villager[];
  resources: Resources;
  upgrades: { axe: number };
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
}

import { CONFIG } from '../config';
import { lvl, type SkillId } from './skills';
import type { Building, Cost, GameState, Job, ResourceKey } from './types';
import { Tile } from './types';

export interface BuildingDef {
  w: number;
  h: number;
  dropoff: readonly ResourceKey[]; // resources villagers may deliver here
  workers: number; // job slots (0 = not a workplace)
  job?: Job; // job its workers do
  buildable: boolean; // appears in the build menu
  cityNeighbor: boolean; // must touch the Town Center or another city building
  road: boolean; // works only while touching a connected road or the Town Center (see roads.ts)
  unlock?: SkillId; // skill that must be learned before it can be built (none = from the start)
  limit?: number; // most that may stand at once (none = no limit)
  cost: (owned: number) => Cost;
}

const def = (d: Partial<BuildingDef> & Pick<BuildingDef, 'w' | 'h' | 'cost'>): BuildingDef => ({
  dropoff: [],
  workers: 0,
  buildable: true,
  cityNeighbor: false,
  road: true,
  ...d,
});

export const BUILDINGS = {
  townCenter: def({ w: 4, h: 4, dropoff: ['wood', 'food', 'stone', 'cloth'], buildable: false, road: false, cost: () => ({}) }),
  house: def({
    w: 1,
    h: 1,
    cityNeighbor: true,
    cost: (n) => ({
      wood: Math.round(100 * 1.5 ** n),
      food: n >= 3 ? Math.round(50 * 1.5 ** (n - 3)) : 0,
      stone: n >= 6 ? Math.round(30 * 1.5 ** (n - 6)) : 0,
      cloth: n >= 9 ? Math.round(20 * 1.5 ** (n - 9)) : 0,
      gold: n >= 12 ? Math.round(200 * 1.5 ** (n - 12)) : 0,
    }),
  }),
  lumberCamp: def({ w: 2, h: 2, dropoff: ['wood'], cost: (n) => ({ wood: 100 * 2 ** n }) }),
  barn: def({ w: 2, h: 2, dropoff: ['food', 'cloth'], cost: (n) => ({ wood: 150 * 2 ** n }) }),
  farm: def({ w: 3, h: 3, workers: 1, job: 'farm', cost: (n) => ({ wood: Math.round(250 * 1.5 ** n) }) }),
  orchard: def({
    w: 5,
    h: 5,
    workers: 3,
    job: 'orchard',
    unlock: 'orchards',
    cost: (n) => ({ wood: Math.round(3000 * 1.5 ** n), stone: Math.round(300 * 1.5 ** n), cloth: Math.round(100 * 1.5 ** n) }),
  }),
  quarry: def({ w: 2, h: 2, workers: 2, job: 'mine', unlock: 'quarrying', cost: (n) => ({ wood: Math.round(400 * 1.5 ** n) }) }),
  sheepFarm: def({
    w: 3,
    h: 3,
    workers: 1,
    job: 'herd',
    unlock: 'sheepFarms',
    cost: (n) => ({ wood: Math.round(600 * 1.5 ** n), food: Math.round(150 * 1.5 ** n) }),
  }),
  cottonPlantation: def({
    w: 6,
    h: 6,
    workers: 5,
    job: 'cotton',
    unlock: 'cottonFields',
    cost: (n) => ({ wood: Math.round(5000 * 1.5 ** n), stone: Math.round(500 * 1.5 ** n), gold: Math.round(250 * 1.5 ** n) }),
  }),
  tailor: def({
    w: 2,
    h: 2,
    unlock: 'tailoring',
    cost: (n) => ({ wood: Math.round(800 * 1.5 ** n), cloth: Math.round(60 * 1.5 ** n) }),
  }),
  well: def({ w: 1, h: 1, road: false, unlock: 'wells', cost: (n) => ({ wood: Math.round(150 * 1.5 ** n), stone: Math.round(40 * 1.5 ** n) }) }),
  market: def({
    w: 2,
    h: 2,
    dropoff: ['gold'],
    cityNeighbor: true,
    unlock: 'markets',
    cost: (n) => ({ wood: Math.round(500 * 1.5 ** n), stone: Math.round(50 * 1.5 ** n) }),
  }),
  taxOffice: def({
    w: 2,
    h: 2,
    cityNeighbor: true,
    unlock: 'taxOffices',
    cost: (n) => ({ wood: Math.round(800 * 1.5 ** n), stone: Math.round(100 * 1.5 ** n) }),
  }),
  tradingPost: def({
    w: 2,
    h: 2,
    workers: 1,
    job: 'trade',
    unlock: 'tradingPosts',
    cost: (n) => ({ wood: Math.round(600 * 1.5 ** n), food: Math.round(150 * 1.5 ** n) }),
  }),
  // Frontier Outpost: a second hub, anywhere on cleared land. Takes every resource and roots its own roads (see roads.ts).
  outpost: def({
    w: 3,
    h: 3,
    dropoff: ['wood', 'food', 'stone', 'cloth'],
    road: false,
    unlock: 'frontierOutpost',
    limit: 1,
    cost: () => ({ ...CONFIG.skills.outpost }),
  }),
} satisfies Record<string, BuildingDef>;
export type BuildingKind = keyof typeof BUILDINGS;

const KINDS = Object.keys(BUILDINGS) as BuildingKind[];

/** Whether this kind can be built yet: its unlock skill, if any, has been learned. */
export function isUnlocked(s: Pick<GameState, 'skills'>, kind: BuildingKind): boolean {
  const skill = BUILDINGS[kind].unlock;
  return !skill || lvl(s, skill) > 0;
}

/** The building a skill unlocks, if any. */
export const unlocks = (id: SkillId): BuildingKind | undefined => KINDS.find((k) => BUILDINGS[k].unlock === id);

export const CITY_KINDS: readonly BuildingKind[] = ['townCenter', 'outpost', 'house', 'market', 'taxOffice'];

/** Hubs: every resource is delivered there, and roads touching one are connected (see roads.ts). */
export const HUB_KINDS: readonly BuildingKind[] = ['townCenter', 'outpost'];

/** A workplace that works only while a building of the other kind exists. */
export const NEEDS: Partial<Record<BuildingKind, BuildingKind>> = { tradingPost: 'market' };

/** Whether as many of this kind stand as its `limit` allows (the Outpost). */
export const atLimit = (s: Pick<GameState, 'buildings'>, kind: BuildingKind) => {
  const limit: number | undefined = (BUILDINGS[kind] as BuildingDef).limit;
  return limit !== undefined && countOf(s, kind) >= limit;
};

export const countOf = (s: Pick<GameState, 'buildings'>, kind: BuildingKind) =>
  s.buildings.reduce((n, b) => n + (b.kind === kind ? 1 : 0), 0);

export function footprint(s: GameState, b: Pick<Building, 'kind' | 'x' | 'y'>): number[] {
  const { w, h } = BUILDINGS[b.kind];
  const out: number[] = [];
  for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) out.push(y * s.w + x);
  return out;
}

/** Tiles sharing an edge with the footprint, outside it and on the map. */
export function border(s: GameState, b: Pick<Building, 'kind' | 'x' | 'y'>): number[] {
  const { w, h } = BUILDINGS[b.kind];
  const out: number[] = [];
  for (let x = b.x; x < b.x + w; x++) {
    if (b.y > 0) out.push((b.y - 1) * s.w + x);
    if (b.y + h < s.h) out.push((b.y + h) * s.w + x);
  }
  for (let y = b.y; y < b.y + h; y++) {
    if (b.x > 0) out.push(y * s.w + b.x - 1);
    if (b.x + w < s.w) out.push(y * s.w + b.x + w);
  }
  return out;
}

export function buildingAt(s: GameState, i: number): Building | undefined {
  const x = i % s.w;
  const y = (i / s.w) | 0;
  return s.buildings.find((b) => {
    const d = BUILDINGS[b.kind];
    return x >= b.x && x < b.x + d.w && y >= b.y && y < b.y + d.h;
  });
}

/** Adds `n` of `r` to a building's lifetime tally. */
export function tallyTo(b: Building, r: ResourceKey, n: number): void {
  b.tally[r] = (b.tally[r] ?? 0) + n;
}

/** Low-level placement, no validation or payment (see commands.placeBuilding). */
export function addBuilding(s: GameState, kind: BuildingKind, x: number, y: number, paidCost: Cost = {}): Building {
  const b: Building = { id: s.nextId++, kind, x, y, paidCost: { ...paidCost }, tally: {} };
  for (const i of footprint(s, b)) s.tiles[i] = Tile.Building;
  s.buildings.push(b);
  return b;
}

/** Chebyshev distance from tile (x, y) to the building's footprint (0 = on it). */
export function distToBuilding(b: Pick<Building, 'kind' | 'x' | 'y'>, x: number, y: number): number {
  const { w, h } = BUILDINGS[b.kind];
  return Math.max(b.x - x, x - (b.x + w - 1), b.y - y, y - (b.y + h - 1), 0);
}

/** Chebyshev distance between the nearest tiles of two footprints (1 = touching). */
export function buildingGap(a: Pick<Building, 'kind' | 'x' | 'y'>, b: Pick<Building, 'kind' | 'x' | 'y'>): number {
  const da = BUILDINGS[a.kind];
  const db = BUILDINGS[b.kind];
  return Math.max(b.x - (a.x + da.w - 1), a.x - (b.x + db.w - 1), b.y - (a.y + da.h - 1), a.y - (b.y + db.h - 1), 0);
}

/** Job slots of a workplace, including skill bonuses (Quarry Crews, Farmhands). */
export const workersOf = (s: GameState, b: Building) =>
  BUILDINGS[b.kind].workers + (b.kind === 'quarry' ? lvl(s, 'quarryCrews') : b.kind === 'farm' ? lvl(s, 'farmhands') : 0);

export const buildingById = (s: GameState, id: number) => s.buildings.find((b) => b.id === id);

/**
 * A workplace that should be staffed: exists, is not paused, is connected by road, and a connected
 * building of the kind it needs exists. `linked` comes from `linkedBuildings` (roads.ts).
 */
export function isActive(s: GameState, b: Building | undefined, linked: ReadonlySet<number>): b is Building {
  if (b === undefined || s.paused.includes(b.id) || !linked.has(b.id)) return false;
  const needs = NEEDS[b.kind];
  return needs === undefined || s.buildings.some((o) => o.kind === needs && linked.has(o.id));
}

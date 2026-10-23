import { lvl } from './skills';
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
  cost: (owned: number) => Cost;
}

const def = (d: Partial<BuildingDef> & Pick<BuildingDef, 'w' | 'h' | 'cost'>): BuildingDef => ({
  dropoff: [],
  workers: 0,
  buildable: true,
  cityNeighbor: false,
  ...d,
});

export const BUILDINGS = {
  townCenter: def({ w: 4, h: 4, dropoff: ['wood', 'food', 'stone', 'cloth'], buildable: false, cost: () => ({}) }),
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
    cost: (n) => ({ wood: Math.round(3000 * 1.5 ** n), stone: Math.round(300 * 1.5 ** n), cloth: Math.round(100 * 1.5 ** n) }),
  }),
  quarry: def({ w: 2, h: 2, workers: 2, job: 'mine', cost: (n) => ({ wood: Math.round(400 * 1.5 ** n) }) }),
  sheepFarm: def({
    w: 3,
    h: 3,
    workers: 1,
    job: 'herd',
    cost: (n) => ({ wood: Math.round(600 * 1.5 ** n), food: Math.round(150 * 1.5 ** n) }),
  }),
  cottonPlantation: def({
    w: 6,
    h: 6,
    workers: 5,
    job: 'cotton',
    cost: (n) => ({ wood: Math.round(5000 * 1.5 ** n), stone: Math.round(500 * 1.5 ** n), gold: Math.round(250 * 1.5 ** n) }),
  }),
  well: def({ w: 1, h: 1, cost: (n) => ({ wood: Math.round(150 * 1.5 ** n), stone: Math.round(40 * 1.5 ** n) }) }),
  market: def({
    w: 2,
    h: 2,
    dropoff: ['gold'],
    cityNeighbor: true,
    cost: (n) => ({ wood: Math.round(500 * 1.5 ** n), stone: Math.round(50 * 1.5 ** n) }),
  }),
  taxOffice: def({
    w: 2,
    h: 2,
    cityNeighbor: true,
    cost: (n) => ({ wood: Math.round(800 * 1.5 ** n), stone: Math.round(100 * 1.5 ** n) }),
  }),
  tradingPost: def({
    w: 2,
    h: 2,
    workers: 1,
    job: 'trade',
    cost: (n) => ({ wood: Math.round(600 * 1.5 ** n), food: Math.round(150 * 1.5 ** n) }),
  }),
} satisfies Record<string, BuildingDef>;
export type BuildingKind = keyof typeof BUILDINGS;

export const CITY_KINDS: readonly BuildingKind[] = ['townCenter', 'house', 'market', 'taxOffice'];

/** A workplace that works only while a building of the other kind exists. */
export const NEEDS: Partial<Record<BuildingKind, BuildingKind>> = { tradingPost: 'market' };

export const countOf = (s: Pick<GameState, 'buildings'>, kind: BuildingKind) =>
  s.buildings.reduce((n, b) => n + (b.kind === kind ? 1 : 0), 0);

export function footprint(s: GameState, b: Pick<Building, 'kind' | 'x' | 'y'>): number[] {
  const { w, h } = BUILDINGS[b.kind];
  const out: number[] = [];
  for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) out.push(y * s.w + x);
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

/** Low-level placement, no validation or payment (see commands.placeBuilding). */
export function addBuilding(s: GameState, kind: BuildingKind, x: number, y: number, paidCost: Cost = {}): Building {
  const b: Building = { id: s.nextId++, kind, x, y, paidCost: { ...paidCost } };
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

/** Job slots of a workplace, including skill bonuses. */
export const workersOf = (s: GameState, b: Building) =>
  BUILDINGS[b.kind].workers + (b.kind === 'quarry' ? lvl(s, 'quarryCrews') : 0);

export const buildingById = (s: GameState, id: number) => s.buildings.find((b) => b.id === id);

/** A workplace that should be staffed: exists, is not paused, and the building it needs exists. */
export function isActive(s: GameState, b: Building | undefined): b is Building {
  if (b === undefined || s.paused.includes(b.id)) return false;
  const needs = NEEDS[b.kind];
  return needs === undefined || countOf(s, needs) > 0;
}

import type { Building, Cost, GameState } from './types';
import { Tile } from './types';

export interface BuildingDef {
  w: number;
  h: number;
  dropoff: boolean; // villagers deliver wood here
  buildable: boolean; // appears in the build menu
  cityNeighbor: boolean; // must touch the Town Center or another house
  cost: (owned: number) => Cost;
}

export const BUILDINGS = {
  townCenter: { w: 4, h: 4, dropoff: true, buildable: false, cityNeighbor: false, cost: () => ({}) },
  house: {
    w: 1,
    h: 1,
    dropoff: false,
    buildable: true,
    cityNeighbor: true,
    cost: (n) => ({ wood: Math.round(100 * 1.5 ** n) }),
  },
  lumberCamp: {
    w: 2,
    h: 2,
    dropoff: true,
    buildable: true,
    cityNeighbor: false,
    cost: (n) => ({ wood: 100 * 2 ** n }),
  },
} satisfies Record<string, BuildingDef>;
export type BuildingKind = keyof typeof BUILDINGS;

/** Kinds whose buildings form the "city" a house must touch. */
export const CITY_KINDS: readonly BuildingKind[] = ['townCenter', 'house'];

export const countOf = (s: GameState, kind: BuildingKind) =>
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
export function addBuilding(s: GameState, kind: BuildingKind, x: number, y: number): Building {
  const b: Building = { id: s.nextId++, kind, x, y };
  for (const i of footprint(s, b)) s.tiles[i] = Tile.Building;
  s.buildings.push(b);
  return b;
}

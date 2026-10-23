import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { moveRoad, placeBuilding, placeRoad, removeRoad } from '../src/core/commands';
import { pathToAny } from '../src/core/pathing';
import { linkedBuildings, roadNetwork } from '../src/core/roads';
import { simulate } from '../src/core/sim';
import { Tile } from '../src/core/types';
import type { World } from '../src/core/world';
import { clearArea, freeRoads, smallWorld } from './helpers';

/** 30×30 world, cleared from 3 to 26: the Town Center covers 13..16 on both axes. */
function open(villagers = 0): World {
  const w = smallWorld(30, villagers);
  w.state.nextRelicAt = Infinity;
  clearArea(w, 3, 3, 26, 26);
  w.state.resources = { wood: 1e7, food: 1e7, stone: 1e7, cloth: 1e7, gold: 1e7 };
  return w;
}

const at = (x: number, y: number) => y * 30 + x;

/** Lays a road along row `y` from x0 to x1. */
const lay = (w: World, x0: number, x1: number, y: number) => {
  for (let x = x0; x <= x1; x++) expect(placeRoad(w, at(x, y))).toBe(true);
};

describe('roads', () => {
  it('connect only while joined edge to edge to the Town Center', () => {
    const w = open();
    lay(w, 8, 12, 14); // ends at the TC's west side
    expect(roadNetwork(w.state)[at(8, 14)]).toBe(1);
    removeRoad(w, at(10, 14));
    expect(roadNetwork(w.state)[at(8, 14)]).toBe(0);
  });

  it('come from a stock that grows with each house', () => {
    const w = open();
    const { base, perHouse } = CONFIG.roads;
    lay(w, 3, 3 + base - 1, 20);
    expect(placeRoad(w, at(3 + base, 20))).toBe(false);
    expect(placeBuilding(w, 'house', 17, 13)).toBe(true); // touches the TC
    lay(w, 3, 3 + perHouse - 1, 21);
    expect(placeRoad(w, at(3 + perHouse, 21))).toBe(false);
  });

  it('put a workplace to work only while it touches a connected road', () => {
    const w = open(1);
    const s = w.state;
    expect(placeBuilding(w, 'farm', 5, 13)).toBe(true);
    const farm = s.buildings.at(-1)!;
    simulate(w, 20, 1 / 30);
    expect(s.villagers[0].job).toBe('lumber');
    lay(w, 8, 12, 14);
    expect(linkedBuildings(s).has(farm.id)).toBe(true);
    simulate(w, 60, 1 / 30);
    expect(s.villagers[0].workplace).toBe(farm.id);
    removeRoad(w, at(10, 14));
    simulate(w, 60, 1 / 30);
    expect(s.villagers[0].job).toBe('lumber');
  });

  it('can be moved onto open ground only', () => {
    const w = open();
    lay(w, 8, 12, 14);
    expect(moveRoad(w, at(8, 14), at(1, 1))).toBe(false); // tree
    expect(moveRoad(w, at(8, 14), at(8, 15))).toBe(true);
    expect(w.state.tiles[at(8, 14)]).toBe(Tile.Grass);
    expect(w.state.tiles[at(8, 15)]).toBe(Tile.Road);
  });

  it('carry villagers along them', () => {
    const w = open();
    freeRoads(w, Array.from({ length: 18 }, (_, k) => at(6 + k, 17))); // under the TC, so connected; longer than the stock
    const path = pathToAny(w.state, at(6, 19), new Set([at(23, 19)]))!;
    const inner = path.slice(1, -1);
    expect(inner.length).toBeGreaterThanOrEqual(2);
    expect(inner.every((i) => w.state.tiles[i] === Tile.Road)).toBe(true);
  });
});

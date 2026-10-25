import { describe, expect, it } from 'vitest';
import { canPlace, chopTree, hireVillager, placeBuilding, placeRoad, toggleMark, upgradeAxe } from '../src/core/commands';
import { baseVillagerCost, maxLevel, popCap, upgradeCost } from '../src/core/economy';
import { getStats } from '../src/core/stats';
import { isChoppable } from '../src/core/grid';
import { createInitialState } from '../src/core/state';
import { ringOf, ringWood } from '../src/core/trees';
import { Tile } from '../src/core/types';
import { smallWorld } from './helpers';

describe('map & trees', () => {
  it('ring wood follows the reference curve', () => {
    expect([1, 2, 3, 4, 5, 10, 20].map(ringWood)).toEqual([60, 80, 100, 128, 163, 527, 4620]);
  });

  it('starts with a 6×6 clearing, 4×4 Town Center, no villagers', () => {
    const s = createInitialState(1);
    expect(s.w * s.h - s.treesLeft).toBe(36);
    expect(s.buildings).toMatchObject([{ kind: 'townCenter', x: 48, y: 48 }]);
    expect(s.villagers).toHaveLength(0);
    expect(s.wood[46 * 100 + 50]).toBe(60); // ring 1
    expect(ringOf(s, 0)).toBe(47);
  });
});

describe('commands', () => {
  it('manual chop takes 1 wood from choppable trees only', () => {
    const w = smallWorld();
    const s = w.state;
    const edge = s.origin.y * s.w - s.w + s.origin.x; // directly above the clearing
    expect(chopTree(w, edge)).toBe(true);
    expect(s.resources.wood).toBe(1);
    expect(chopTree(w, 0)).toBe(false);
  });

  it('chopping a tree to zero turns it into territory and reveals fog', () => {
    const w = smallWorld();
    const s = w.state;
    const i = (s.origin.y - 1) * s.w + s.origin.x;
    const above = i - 3 * s.w;
    expect(w.fog[above]).toBe(4);
    while (s.tiles[i] === Tile.Tree) chopTree(w, i);
    expect(s.resources.wood).toBe(60);
    expect(w.fog[above]).toBe(3);
    expect(isChoppable(s, i - s.w)).toBe(true);
  });

  it('villager costs follow the table, capped by population', () => {
    expect([0, 1, 5, 25, 26].map(baseVillagerCost)).toEqual([10, 20, 350, 260000, 390000]);
    const w = smallWorld(20, 5);
    w.state.resources.wood = 1e9;
    expect(popCap(w.state)).toBe(5);
    expect(hireVillager(w)).toBe(false);
  });

  it('houses must touch the city; lumber camps only need free territory', () => {
    const w = smallWorld();
    const s = w.state;
    s.resources.wood = 1e6;
    const { x, y } = s.origin; // clearing x..x+5, TC at x+1..x+4
    expect(canPlace(w, 'house', x, y)).toBe(false); // corner: diagonal to TC only
    expect(placeBuilding(w, 'house', x, y + 1)).toBe(true);
    expect(placeBuilding(w, 'house', x, y)).toBe(true); // touches the first house
    expect(popCap(s)).toBe(8); // but no road reaches it
    expect(placeRoad(w, y * s.w + x + 1)).toBe(true); // between it and the TC
    expect(popCap(s)).toBe(11);
    expect(canPlace(w, 'house', x - 1, y)).toBe(false); // tree
    expect(canPlace(w, 'lumberCamp', x + 1, y)).toBe(false); // overlaps TC
    expect(placeBuilding(w, 'lumberCamp', x + 4, y + 4)).toBe(false); // overlaps TC corner
    expect(s.resources.wood).toBe(1e6 - 100 - 150);
  });

  it('axe upgrades go on past the cost table, each past it ×1.15 chop rate and carry', () => {
    const w = smallWorld();
    w.state.resources = { wood: 1e12, food: 1e12, stone: 1e12, cloth: 1e12, gold: 0 };
    expect(maxLevel('axe')).toBe(Infinity);
    for (let k = 0; k < 10; k++) expect(upgradeAxe(w)).toBe(true);
    const ten = getStats(w.state);
    expect(ten.chopRate).toBeCloseTo(1.05 ** 10);
    expect(ten.carry).toBeCloseTo((5 + 20) * 1.02 ** 10);
    for (let k = 0; k < 5; k++) expect(upgradeAxe(w)).toBe(true);
    const fifteen = getStats(w.state);
    expect(fifteen.chopRate).toBeCloseTo(ten.chopRate * 1.15 ** 5);
    expect(fifteen.carry).toBeCloseTo(ten.carry * 1.15 ** 5);
  });

  it('a level past the table costs its last price ×1.35 per level beyond it', () => {
    const s = smallWorld().state;
    const last = { wood: 6500, food: 2500, stone: 800, cloth: 150 };
    expect(upgradeCost(s, 'axe', 9)).toEqual(last);
    expect(upgradeCost(s, 'axe', 10)).toEqual({ wood: 8775, food: 3375, stone: 1080, cloth: 203 });
    expect(upgradeCost(s, 'axe', 19)).toEqual(Object.fromEntries(Object.entries(last).map(([r, n]) => [r, Math.round(n * 1.35 ** 10)])));
    for (const kind of ['coats', 'satchel'] as const) {
      expect(maxLevel(kind)).toBe(3);
      expect(upgradeCost(s, kind, 3)).toBeNull();
    }
  });

  it('marks only visible trees', () => {
    const w = smallWorld();
    expect(toggleMark(w, 0)).toBe(false);
    const i = (w.state.origin.y - 2) * w.state.w + w.state.origin.x;
    expect(toggleMark(w, i)).toBe(true);
    expect(w.state.marked).toEqual([i]);
    expect(toggleMark(w, i)).toBe(true);
    expect(w.state.marked).toEqual([]);
  });
});

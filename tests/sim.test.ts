import { describe, expect, it } from 'vitest';
import { chopTree, placeBuilding, toggleMark } from '../src/core/commands';
import { simulate } from '../src/core/sim';
import { Tile } from '../src/core/types';
import { smallWorld, totalWood } from './helpers';

describe('villager simulation', () => {
  it('conserves wood, clears trees, and claims are unique', () => {
    const w = smallWorld(30, 5);
    w.state.nextRelicAt = Infinity; // relics consume a tree's wood; keep this a pure conservation check
    const total = totalWood(w);
    const trees = w.state.treesLeft;
    for (let k = 0; k < 60; k++) {
      simulate(w, 10, 1 / 30);
      const targets = w.state.villagers.map((v) => v.target).filter((t) => t !== -1);
      expect(new Set(targets).size).toBe(targets.length);
    }
    expect(w.state.resources.wood).toBeGreaterThan(0);
    expect(w.state.treesLeft).toBeLessThan(trees);
    expect(totalWood(w)).toBeCloseTo(total, 6);
  });

  it('is independent of step size (live vs catch-up)', () => {
    const a = smallWorld(30, 3, 3);
    const b = smallWorld(30, 3, 3);
    simulate(a, 900, 1 / 30);
    simulate(b, 900, 1);
    expect(b.state.resources.wood).toBeCloseTo(a.state.resources.wood, 3);
    expect(b.state.treesLeft).toBe(a.state.treesLeft);
  });

  it('a marked tree is taken by the next villager to deposit', () => {
    const w = smallWorld(30, 1);
    const s = w.state;
    simulate(w, 2, 1 / 30);
    const v = s.villagers[0];
    const first = v.target;
    const far = (s.origin.y + 5) * s.w + s.origin.x + 6;
    expect(far).not.toBe(first);
    toggleMark(w, far);
    simulate(w, 40, 1 / 30);
    expect(v.target).toBe(far);
  });

  it('recovers when the player fells the tree a villager is working', () => {
    const w = smallWorld(30, 1);
    const s = w.state;
    simulate(w, 3, 1 / 30);
    const v = s.villagers[0];
    const t = v.target;
    while (s.tiles[t] === Tile.Tree) chopTree(w, t);
    simulate(w, 10, 1 / 30);
    expect(v.target).not.toBe(t);
    expect(s.tiles[v.target]).toBe(Tile.Tree);
    expect(s.wood[v.target]).toBeLessThan(w.maxWood[v.target]);
  });

  it('a lumber camp becomes a drop-off', () => {
    const w = smallWorld(30);
    const s = w.state;
    const { x, y } = s.origin;
    const probe = y * s.w + x - 3;
    const before = w.field.dist[probe];
    for (const [tx, ty] of [[x - 1, y], [x - 1, y + 1], [x - 2, y], [x - 2, y + 1]]) {
      const i = ty * s.w + tx;
      while (s.tiles[i] === Tile.Tree) chopTree(w, i);
    }
    expect(placeBuilding(w, 'lumberCamp', x - 2, y)).toBe(true);
    expect(before).toBe(-1); // unreachable before the camp
    expect(w.field.dist[probe]).toBe(1);
  });

  it('clears a small forest completely and then idles', () => {
    const w = smallWorld(10, 5);
    simulate(w, 3 * 3600, 1);
    expect(w.state.treesLeft).toBe(0);
    expect(w.state.villagers.every((v) => v.state === 'idle' && v.carry === 0)).toBe(true);
  });
});

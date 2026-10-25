import { describe, expect, it } from 'vitest';
import { chopTree, placeBuilding, placeRoad, toggleMark } from '../src/core/commands';
import { tileAt } from '../src/core/grid';
import { nearestTree, pathToAny } from '../src/core/pathing';
import { simulate } from '../src/core/sim';
import { Tile } from '../src/core/types';
import { claimTile } from '../src/core/world';
import { clearArea, smallWorld, totalWood } from './helpers';

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

  it('with Teamwork, two villagers share the best tree but never three', () => {
    const w = smallWorld(30, 3);
    w.state.skills = { teamwork: 1 };
    simulate(w, 1 / 30, 1 / 30);
    const [a, b, c] = w.state.villagers.map((v) => v.target);
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('is independent of step size (live vs catch-up)', () => {
    const a = smallWorld(30, 3, 3);
    const b = smallWorld(30, 3, 3);
    simulate(a, 900, 1 / 30);
    simulate(b, 900, 1);
    expect(b.state.resources.wood).toBeCloseTo(a.state.resources.wood, 3);
    expect(b.state.treesLeft).toBe(a.state.treesLeft);
  });

  it('flagging a tree sends a lumberjack there at once', () => {
    const w = smallWorld(30, 1);
    const s = w.state;
    simulate(w, 2, 1 / 30);
    const v = s.villagers[0];
    const first = v.target;
    const far = (s.origin.y + 5) * s.w + s.origin.x + 6;
    expect(far).not.toBe(first);
    toggleMark(w, far);
    expect(v.target).toBe(far);
    expect(v.state).toBe('toTree');
    const wood = s.wood[far];
    simulate(w, 20, 1 / 30);
    expect(s.wood[far]).toBeLessThan(wood);
  });

  describe('flag rush', () => {
    /** Lumberjacks standing idle at the given clearing tiles (offsets from the origin), empty-handed. */
    function idleAt(spots: [number, number][], skills: Record<string, number> = {}) {
      const w = smallWorld(30, spots.length);
      const s = w.state;
      s.nextRelicAt = Infinity;
      Object.assign(s.skills, skills);
      spots.forEach(([dx, dy], k) => Object.assign(s.villagers[k], { x: s.origin.x + dx + 0.5, y: s.origin.y + dy + 0.5, state: 'idle', target: -1, carry: 0, path: [], pathI: 0 }));
      return { w, s, flag: (dx: number, dy: number) => (s.origin.y + dy) * s.w + s.origin.x + dx };
    }

    it('sends the nearest lumberjack and leaves the rest', () => {
      const { w, s, flag } = idleAt([[0, 0], [5, 5]]);
      const tree = flag(6, 5);
      expect(toggleMark(w, tree)).toBe(true);
      expect(s.villagers.map((v) => v.target)).toEqual([-1, tree]);
    });

    it('sends as many as may work a flagged tree: three with Felling Crews', () => {
      const { w, s, flag } = idleAt([[0, 0], [5, 3], [5, 4], [5, 5]], { teamwork: 1, fellingCrews: 1 });
      const tree = flag(6, 5);
      toggleMark(w, tree);
      expect(s.villagers.map((v) => v.target)).toEqual([-1, tree, tree, tree]);
    });

    it('leaves lumberjacks walking home or on another flag', () => {
      const { w, s, flag } = idleAt([[5, 5], [5, 4], [0, 0]]);
      const other = flag(-1, 0);
      toggleMark(w, other); // the corner lumberjack takes it
      expect(s.villagers[2].target).toBe(other);
      s.villagers[0].state = 'toHome';
      const tree = flag(6, 5);
      toggleMark(w, tree);
      expect(s.villagers.map((v) => v.target)).toEqual([-1, tree, other]);
      expect(s.villagers[0].state).toBe('toHome');
    });

    it('sends no one to a flag the land has not reached yet, then the nearest once it does', () => {
      const { w, s, flag } = idleAt([[0, 0], [5, 5]]);
      const tree = flag(7, 5);
      expect(toggleMark(w, tree)).toBe(true);
      expect(s.villagers.map((v) => v.target)).toEqual([-1, -1]);
      w.dev.manualMult = 1e9;
      chopTree(w, flag(6, 5)); // the tree in the way: the flag turns red
      expect(s.villagers.map((v) => v.target)).toEqual([-1, tree]);
      expect(s.villagers[1].state).toBe('toTree');
    });

    describe('a flagged tree only a sealed pocket of land touches', () => {
      /** A clearing out in the forest, cut off from the village, with a flagged tree beside it. */
      function pocket() {
        const w = smallWorld(30, 1);
        const s = w.state;
        s.nextRelicAt = Infinity;
        const o = s.origin.x;
        claimTile(w, (o + 1) * s.w + o + 9); // three trees beyond the clearing's east edge
        return { w, s, v: s.villagers[0], tree: (o + 1) * s.w + o + 10 };
      }

      it('is fetched over the trees in the way, felled, and its wood brought home', () => {
        const { w, s, v, tree } = pocket();
        Object.assign(v, { state: 'idle', target: -1, carry: 0, path: [], pathI: 0 });
        s.wood[tree] = 3; // one load fells it
        const wood = totalWood(w);
        expect(toggleMark(w, tree)).toBe(true);
        expect([v.target, v.state]).toEqual([tree, 'toTree']);
        for (let k = 0; k < 120 && s.tiles[tree] === Tile.Tree; k++) simulate(w, 1, 1 / 30);
        expect(s.tiles[tree]).not.toBe(Tile.Tree);
        simulate(w, 60, 1 / 30);
        expect(totalWood(w)).toBeCloseTo(wood, 6);
        expect(w.fields.wood.dist[tileAt(s, v.x, v.y)]).not.toBe(-1); // walked back out of the pocket
      });

      it('is picked by a lumberjack that comes free later', () => {
        const { w, s, v, tree } = pocket();
        Object.assign(v, { state: 'toHome', target: -1, carry: 0, path: [], pathI: 0 }); // passes the flag by
        toggleMark(w, tree);
        expect(v.target).toBe(-1);
        simulate(w, 1 / 30, 1 / 30);
        expect(v.target).toBe(tree);
        expect(s.tiles[tree]).toBe(Tile.Tree);
      });
    });

    it('does not rush again when more land reaches a flag already reached', () => {
      const { w, s, flag } = idleAt([[5, 5]]);
      const tree = flag(6, 5);
      toggleMark(w, tree);
      Object.assign(s.villagers[0], { state: 'idle', target: -1, path: [], pathI: 0 }); // its lumberjack went home
      w.dev.manualMult = 1e9;
      chopTree(w, flag(6, 4));
      expect(s.villagers[0].target).toBe(-1);
    });
  });

  it('chooses a tree again after every delivery, leaving the half-chopped one', () => {
    const w = smallWorld(30, 1);
    const s = w.state;
    s.nextRelicAt = Infinity;
    const { x, y } = s.origin;
    clearArea(w, x - 6, y, x - 1, y + 1);
    const v = s.villagers[0];
    const first = (y + 1) * s.w + x - 7; // end of a corridor: a long trip, never the best choice
    const stand = first + 1;
    v.target = first;
    v.path = pathToAny(s, tileAt(s, v.x, v.y), new Set([stand]))!;
    v.pathI = 0;
    v.state = 'toTree';
    let delivered = false;
    for (let k = 0; k < 60 * 30 && !delivered; k++) {
      const carry = v.carry;
      simulate(w, 1 / 30, 1 / 30);
      delivered = carry > 0 && v.carry === 0;
    }
    expect(delivered).toBe(true);
    expect(s.wood[first]).toBeLessThan(w.maxWood[first]); // worked on…
    expect(s.tiles[first]).toBe(Tile.Tree); // …but released, not felled
    expect(v.target).not.toBe(first);
    expect(v.target).toBe(nearestTree(s, w.fields.wood, tileAt(s, v.x, v.y), () => false)!.tree);
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
    const probe = y * s.w + x - 2; // the camp's corner, a tree until cleared
    const before = w.fields.wood.dist[probe];
    for (const [tx, ty] of [[x - 1, y], [x - 1, y + 1], [x - 2, y], [x - 2, y + 1]]) {
      const i = ty * s.w + tx;
      while (s.tiles[i] === Tile.Tree) chopTree(w, i);
    }
    expect(placeBuilding(w, 'lumberCamp', x - 2, y)).toBe(true);
    expect(before).toBe(-1); // unreachable before the camp
    expect(w.fields.wood.dist[probe]).toBeGreaterThan(0); // isolated
    expect(placeRoad(w, (y + 1) * s.w + x)).toBe(true); // joins it to the TC
    expect(w.fields.wood.dist[probe]).toBe(0);
  });

  it('clears a small forest completely and then idles', () => {
    const w = smallWorld(10, 5);
    simulate(w, 3 * 3600, 1);
    expect(w.state.treesLeft).toBe(0);
    expect(w.state.villagers.every((v) => v.state === 'idle' && v.carry === 0)).toBe(true);
  }, 20_000); // three simulated hours: can pass the default 5 s when the suite runs in parallel
});

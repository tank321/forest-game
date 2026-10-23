import { describe, expect, it } from 'vitest';
import { neighbors4 } from '../src/core/grid';
import { nearestTree, pathHome } from '../src/core/pathing';
import { createInitialState } from '../src/core/state';
import { Tile } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { smallWorld } from './helpers';

describe('pathing', () => {
  it('nearestTree finds the closest unclaimed tree and a contiguous walkable path', () => {
    const w = createWorld(createInitialState(1, 20, 6));
    const s = w.state;
    const from = s.origin.y * s.w + s.origin.x; // clearing corner
    const r = nearestTree(s, from, () => false)!;
    expect(r.path[0]).toBe(from);
    expect(r.path).toHaveLength(1); // a tree is adjacent to the corner
    expect(neighbors4(s, r.path[r.path.length - 1])).toContain(r.tree);
    const r2 = nearestTree(s, from, (t) => t === r.tree)!;
    expect(r2.tree).not.toBe(r.tree);
  });

  it('marked trees win over nearer ones', () => {
    const w = createWorld(createInitialState(1, 20, 6));
    const s = w.state;
    const from = s.origin.y * s.w + s.origin.x;
    const far = (s.origin.y + 5) * s.w + s.origin.x + 6; // right of the far corner
    s.marked.push(far);
    const r = nearestTree(s, from, () => false)!;
    expect(r.tree).toBe(far);
    for (let k = 1; k < r.path.length; k++) {
      expect(neighbors4(s, r.path[k - 1])).toContain(r.path[k]);
      expect(s.tiles[r.path[k]]).not.toBe(Tile.Tree);
    }
  });

  it('pathHome goes to the nearest drop-off', () => {
    const w = smallWorld();
    const s = w.state;
    const { x, y } = s.origin;
    const corner = (y + 5) * s.w + x + 5;
    const p = pathHome(w.field, corner);
    expect(p.length).toBe(3); // corner → edge tile → TC corner
    expect(w.field.dist[p[p.length - 1]]).toBe(0);
  });
});

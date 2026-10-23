import { describe, expect, it } from 'vitest';
import { buildingAt } from '../src/core/buildings';
import { placeBuilding } from '../src/core/commands';
import { isWalkable, neighbors4 } from '../src/core/grid';
import { nearestTree, pathHome } from '../src/core/pathing';
import { createInitialState } from '../src/core/state';
import { Tile } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { clearArea, smallWorld } from './helpers';

describe('pathing', () => {
  it('nearestTree picks the unclaimed tree nearest a drop-off, then nearest the villager', () => {
    const w = createWorld(createInitialState(1, 20, 6));
    const s = w.state;
    const { x, y } = s.origin;
    const from = y * s.w + x; // clearing corner, diagonal to the Town Center's corner
    const r = nearestTree(s, w.fields.wood, from, () => false)!;
    expect(r.tree).toBe((y - 1) * s.w + x + 1); // a tree 2 steps from the TC, ties broken by index
    expect(r.path).toEqual([from, from + 1]);
    expect(neighbors4(s, r.path[r.path.length - 1])).toContain(r.tree);
    const r2 = nearestTree(s, w.fields.wood, from, (t) => t === r.tree)!;
    expect(r2.tree).toBe((y + 1) * s.w + x - 1); // same distance, mirrored
  });

  it('a tree beside a Lumber Camp beats a tree beside the villager', () => {
    const w = smallWorld(30);
    const s = w.state;
    s.nextRelicAt = Infinity;
    const { x, y } = s.origin;
    clearArea(w, x - 6, y, x - 1, y + 1);
    s.resources.wood = 100;
    expect(placeBuilding(w, 'lumberCamp', x - 6, y)).toBe(true);
    const camp = s.buildings[s.buildings.length - 1];
    const r = nearestTree(s, w.fields.wood, (y + 5) * s.w + x + 5, () => false)!; // far corner of the clearing
    expect(w.fields.wood.dist[r.tree]).toBe(1);
    expect(neighbors4(s, r.tree).some((i) => buildingAt(s, i) === camp)).toBe(true);
  });

  it('marked trees win over nearer ones', () => {
    const w = createWorld(createInitialState(1, 20, 6));
    const s = w.state;
    const from = s.origin.y * s.w + s.origin.x;
    const far = (s.origin.y + 5) * s.w + s.origin.x + 6; // right of the far corner
    s.marked.push(far);
    const r = nearestTree(s, w.fields.wood, from, () => false)!;
    expect(r.tree).toBe(far);
    for (let k = 1; k < r.path.length; k++) {
      expect(neighbors4(s, r.path[k - 1])).toContain(r.path[k]);
      expect(s.tiles[r.path[k]]).not.toBe(Tile.Tree);
    }
  });

  it('never stands on or walks through a relic', () => {
    const w = createWorld(createInitialState(1, 20, 6));
    const s = w.state;
    const { x, y } = s.origin;
    const relic = y * s.w + x - 1; // touches the clearing
    const behind = relic - 1; // only reachable through the relic
    s.tiles[relic] = Tile.Relic;
    s.marked.push(behind);
    const r = nearestTree(s, w.fields.wood, y * s.w + x, () => false)!;
    expect(r.tree).not.toBe(behind);
    for (const i of r.path) expect(isWalkable(s, i)).toBe(true);
  });

  it('pathHome goes to the nearest drop-off', () => {
    const w = smallWorld();
    const s = w.state;
    const { x, y } = s.origin;
    const corner = (y + 5) * s.w + x + 5;
    const p = pathHome(w.fields.wood, corner);
    expect(p.length).toBe(3); // corner → edge tile → TC corner
    expect(w.fields.wood.dist[p[p.length - 1]]).toBe(0);
  });
});

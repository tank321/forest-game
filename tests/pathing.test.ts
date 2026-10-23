import { describe, expect, it } from 'vitest';
import { buildingAt } from '../src/core/buildings';
import { placeBuilding } from '../src/core/commands';
import { isWalkable, neighbors4 } from '../src/core/grid';
import { clearLine, DIAG, nearestTree, pathHome, pathToAny } from '../src/core/pathing';
import { createInitialState } from '../src/core/state';
import { Tile } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { clearArea, smallWorld } from './helpers';

describe('pathing', () => {
  it('nearestTree picks the shortest trip: walk to the tree plus the walk home', () => {
    const w = createWorld(createInitialState(1, 20, 6));
    const s = w.state;
    const { x, y } = s.origin;
    const from = y * s.w + x; // clearing corner, one diagonal step from the Town Center
    const r = nearestTree(s, w.fields.wood, from, () => false)!;
    expect(r.tree).toBe((y - 1) * s.w + x); // chopped from where it stands; ties go to the lower index
    expect(r.path).toEqual([from]);
    const r2 = nearestTree(s, w.fields.wood, from, (t) => t === r.tree)!;
    expect(r2.tree).toBe(y * s.w + x - 1);
  });

  it('a lumberjack works near where it stands, not near a better-placed drop-off across the map', () => {
    const w = smallWorld(30);
    const s = w.state;
    s.nextRelicAt = Infinity;
    const { x, y } = s.origin;
    clearArea(w, x - 6, y, x - 1, y + 1);
    s.resources.wood = 100;
    expect(placeBuilding(w, 'lumberCamp', x - 6, y)).toBe(true);
    const camp = s.buildings[s.buildings.length - 1];
    const byTc = (y + 5) * s.w + x + 5; // far corner of the clearing
    expect(neighbors4(s, nearestTree(s, w.fields.wood, byTc, () => false)!.tree)).toContain(byTc);
    const byCamp = y * s.w + x - 4;
    const r = nearestTree(s, w.fields.wood, byCamp, () => false)!;
    expect(neighbors4(s, r.tree).some((i) => buildingAt(s, i) === camp)).toBe(true);
  });

  it('marked trees win over nearer ones, along a straight walkable path', () => {
    const w = createWorld(createInitialState(1, 20, 6));
    const s = w.state;
    const from = s.origin.y * s.w + s.origin.x;
    const far = (s.origin.y + 5) * s.w + s.origin.x + 6; // right of the far corner
    s.marked.push(far);
    const r = nearestTree(s, w.fields.wood, from, () => false)!;
    expect(r.tree).toBe(far);
    expect(r.path).toHaveLength(2); // open ground: one straight line
    expect(r.path[0]).toBe(from);
    expect(neighbors4(s, r.path[r.path.length - 1])).toContain(far);
    for (let k = 1; k < r.path.length; k++) expect(clearLine(s, r.path[k - 1], r.path[k])).toBe(true);
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

  it('pathHome walks diagonally to the nearest drop-off', () => {
    const w = smallWorld();
    const s = w.state;
    const { x, y } = s.origin;
    const corner = (y + 5) * s.w + x + 5;
    const p = pathHome(s, w.fields.wood, corner);
    expect(p).toEqual([corner, (y + 4) * s.w + x + 4]); // one diagonal step onto the TC
    expect(w.fields.wood.dist[corner]).toBe(DIAG);
    expect(w.fields.wood.dist[p[p.length - 1]]).toBe(0);
  });

  it('never cuts past a tree corner', () => {
    const w = smallWorld();
    const s = w.state;
    const { x, y } = s.origin;
    const from = y * s.w + x;
    const pocket = (y - 1) * s.w + x - 1; // diagonal to the corner, trees on both sides
    s.tiles[pocket] = Tile.Grass;
    expect(clearLine(s, from, pocket)).toBe(false);
    expect(pathToAny(s, from, new Set([pocket]))).toBeNull();
    expect(clearLine(s, from, (y + 5) * s.w + x + 5)).toBe(true); // across the open clearing
  });
});

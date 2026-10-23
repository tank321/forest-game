import { BUILDINGS, footprint } from './buildings';
import { isWalkable, neighbors4 } from './grid';
import type { GameState } from './types';
import { Tile } from './types';

/**
 * Multi-source BFS from all drop-off buildings over walkable tiles.
 * parent[i] points one step closer to the nearest drop-off; for a tree touching territory it is
 * the walkable tile it is chopped from.
 */
export interface Field {
  dist: Int32Array;
  parent: Int32Array;
}

export function buildField(s: GameState): Field {
  const n = s.w * s.h;
  const dist = new Int32Array(n).fill(-1);
  const parent = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (const b of s.buildings) {
    if (!BUILDINGS[b.kind].dropoff) continue;
    for (const i of footprint(s, b)) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const u = queue[head++];
    for (const v of neighbors4(s, u)) {
      if (dist[v] !== -1) continue;
      dist[v] = dist[u] + 1;
      parent[v] = u;
      if (isWalkable(s, v)) queue[tail++] = v;
    }
  }
  return { dist, parent };
}

/** Walkable tiles from `from` to the nearest drop-off, inclusive. */
export function pathHome(f: Field, from: number): number[] {
  const path = [from];
  for (let i = from; f.dist[i] > 0; i = f.parent[i]) path.push(f.parent[i]);
  return path;
}

/**
 * BFS outward from `from` for the nearest non-full tree touching walkable ground. Marked trees
 * win over unmarked ones at any distance. Returns the tree and the walk to the tile beside it.
 */
export function nearestTree(
  s: GameState,
  from: number,
  isFull: (tree: number) => boolean,
): { tree: number; path: number[] } | null {
  const n = s.w * s.h;
  const parent = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  const marked = new Set(s.marked);
  let head = 0;
  let tail = 0;
  let best = -1;
  let bestStand = -1;
  parent[from] = from;
  queue[tail++] = from;
  search: while (head < tail) {
    const u = queue[head++];
    for (const v of neighbors4(s, u)) {
      if (parent[v] !== -1) continue;
      if (s.tiles[v] === Tile.Tree) {
        if (isFull(v)) continue;
        if (marked.has(v)) {
          best = v;
          bestStand = u;
          break search;
        }
        if (best === -1) {
          best = v;
          bestStand = u;
          if (marked.size === 0) break search;
        }
        continue;
      }
      parent[v] = u;
      queue[tail++] = v;
    }
  }
  if (best === -1) return null;
  const path = [bestStand];
  for (let i = bestStand; i !== from; i = parent[i]) path.push(parent[i]);
  return { tree: best, path: path.reverse() };
}

import { BUILDINGS, footprint } from './buildings';
import { isWalkable, neighbors4 } from './grid';
import type { GameState, ResourceKey } from './types';
import { Tile } from './types';

/**
 * Multi-source BFS from all drop-off buildings for one resource over walkable tiles.
 * parent[i] points one step closer to the nearest drop-off; for a tree touching territory it is
 * the walkable tile it is chopped from.
 */
export interface Field {
  dist: Int32Array;
  parent: Int32Array;
}

export function buildField(s: GameState, res: ResourceKey): Field {
  const n = s.w * s.h;
  const dist = new Int32Array(n).fill(-1);
  const parent = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (const b of s.buildings) {
    if (!(BUILDINGS[b.kind].dropoff as readonly ResourceKey[]).includes(res)) continue;
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
 * Tree to work next: marked first, then the shortest walk from a drop-off (`field`), then nearest
 * to `from`, then lowest index. Only trees the field reaches (touching ground connected to a
 * drop-off) qualify. Returns the tree and the walk from `from` to the tile beside it.
 */
export function nearestTree(
  s: GameState,
  field: Field,
  from: number,
  isFull: (tree: number) => boolean,
): { tree: number; path: number[] } | null {
  const marked = new Set(s.marked);
  const fx = from % s.w;
  const fy = (from / s.w) | 0;
  const n = s.w * s.h; // > any field distance
  const span = s.w ** 2 + s.h ** 2; // > any squared distance to `from`
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < n; i++) {
    if (s.tiles[i] !== Tile.Tree || field.dist[i] === -1 || isFull(i)) continue;
    // lexicographic (unmarked, drop-off distance, squared distance to `from`) as one exact integer
    const near = ((i % s.w) - fx) ** 2 + (((i / s.w) | 0) - fy) ** 2;
    const score = ((marked.has(i) ? 0 : n) + field.dist[i]) * span + near;
    if (score < bestScore) {
      best = i;
      bestScore = score;
    }
  }
  if (best === -1) return null;
  const path = pathToAny(s, from, new Set(neighbors4(s, best).filter((i) => isWalkable(s, i))));
  return path && { tree: best, path };
}

/** Walkable path from `from` to the nearest of `goals` (walkable tiles), or null. */
export function pathToAny(s: GameState, from: number, goals: ReadonlySet<number>): number[] | null {
  const parent = new Int32Array(s.w * s.h).fill(-1);
  const queue = new Int32Array(s.w * s.h);
  let head = 0;
  let tail = 0;
  parent[from] = from;
  queue[tail++] = from;
  while (head < tail) {
    const u = queue[head++];
    if (goals.has(u)) {
      const path = [u];
      for (let i = u; i !== from; i = parent[i]) path.push(parent[i]);
      return path.reverse();
    }
    for (const v of neighbors4(s, u)) {
      if (parent[v] !== -1 || !isWalkable(s, v)) continue;
      parent[v] = u;
      queue[tail++] = v;
    }
  }
  return null;
}

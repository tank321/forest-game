import { CONFIG } from '../config';
import { BUILDINGS, footprint } from './buildings';
import { isWalkable, neighbors4 } from './grid';
import { linkedBuildings, roadNetwork } from './roads';
import type { GameState, ResourceKey } from './types';
import { Tile } from './types';

/** Walking costs in tenths of a tile: integers keep the search exact and deterministic. */
export const STEP = 10;
export const DIAG = 14;
/** The same steps between two connected road tiles: cheaper, so routes keep to the roads. */
export const ROAD_STEP = Math.round(STEP * CONFIG.roads.pathCost);
export const ROAD_DIAG = Math.round(DIAG * CONFIG.roads.pathCost);

/**
 * Shortest walking distances over walkable tiles, 8-directional. A diagonal step needs both tiles
 * beside it walkable, so villagers never cut past a tree's corner. Steps along connected roads cost
 * less (walking speed is the same), so villagers prefer roads. parent[i] points one step back
 * toward the nearest source; dist is -1 where unreached.
 */
export interface Field {
  dist: Int32Array;
  parent: Int32Array;
}

/**
 * Dijkstra from `sources`. `visit(u, d)` runs as each tile's distance becomes final and may stop
 * the search by returning true. Ties pop in tile order, so results never depend on timing.
 */
function search(s: GameState, sources: Iterable<number>, visit?: (u: number, d: number) => boolean): Field {
  const n = s.w * s.h;
  const dist = new Int32Array(n).fill(-1);
  const parent = new Int32Array(n).fill(-1);
  const heap: number[] = []; // keys d * n + tile
  const net = roadNetwork(s);
  const relax = (v: number, d: number, from: number) => {
    if (dist[v] !== -1 && dist[v] <= d) return;
    dist[v] = d;
    parent[v] = from;
    push(heap, d * n + v);
  };
  for (const i of sources) relax(i, 0, -1);
  while (heap.length) {
    const key = pop(heap);
    const u = key % n;
    const d = (key - u) / n;
    if (d > dist[u]) continue; // stale entry
    if (visit?.(u, d)) break;
    const x = u % s.w;
    const left = x > 0 && isWalkable(s, u - 1);
    const right = x < s.w - 1 && isWalkable(s, u + 1);
    const up = u >= s.w && isWalkable(s, u - s.w);
    const down = u < n - s.w && isWalkable(s, u + s.w);
    const step = (v: number) => relax(v, d + (net[u] && net[v] ? ROAD_STEP : STEP), u);
    const diag = (v: number) => relax(v, d + (net[u] && net[v] ? ROAD_DIAG : DIAG), u);
    if (left) step(u - 1);
    if (right) step(u + 1);
    if (up) step(u - s.w);
    if (down) step(u + s.w);
    if (up && left && isWalkable(s, u - s.w - 1)) diag(u - s.w - 1);
    if (up && right && isWalkable(s, u - s.w + 1)) diag(u - s.w + 1);
    if (down && left && isWalkable(s, u + s.w - 1)) diag(u + s.w - 1);
    if (down && right && isWalkable(s, u + s.w + 1)) diag(u + s.w + 1);
  }
  return { dist, parent };
}

/** Walking distance from every tile to the nearest connected drop-off accepting `res` (0 on the drop-off). */
export function buildField(s: GameState, res: ResourceKey, linked = linkedBuildings(s)): Field {
  const sources: number[] = [];
  for (const b of s.buildings) {
    if (linked.has(b.id) && (BUILDINGS[b.kind].dropoff as readonly ResourceKey[]).includes(res)) sources.push(...footprint(s, b));
  }
  return search(s, sources);
}

/** Walk from `from` to the nearest drop-off, inclusive. */
export function pathHome(s: GameState, f: Field, from: number): number[] {
  const path = [from];
  for (let i = from; f.dist[i] > 0; i = f.parent[i]) path.push(f.parent[i]);
  return smooth(s, path);
}

/**
 * Tree for the shortest next trip: the walk from `from` to a tile beside the tree, plus the walk
 * from there to the nearest drop-off (`field`). Marked trees come first at any distance; ties go to
 * the lower tree index. Returns the tree and the walk to the tile it is chopped from.
 */
export function nearestTree(
  s: GameState,
  field: Field,
  from: number,
  isFull: (tree: number) => boolean,
): { tree: number; path: number[] } | null {
  const marked = new Set(s.marked);
  let tree = -1;
  let stand = -1;
  let best = Infinity;
  let bestMarked = false;
  const walk = search(s, [from], (u, d) => {
    if (d > best && (bestMarked || !marked.size)) return true; // no shorter trip left
    if (field.dist[u] === -1) return false; // no way home from here
    for (const t of neighbors4(s, u)) {
      if (s.tiles[t] !== Tile.Tree || isFull(t)) continue;
      const m = marked.has(t);
      const trip = d + field.dist[u];
      if (m === bestMarked ? trip < best || (trip === best && t < tree) : m) {
        [tree, stand, best, bestMarked] = [t, u, trip, m];
      }
    }
    return false;
  });
  return tree === -1 ? null : { tree, path: trace(s, walk, stand) };
}

/** Walk from `from` to the nearest of `goals` (walkable tiles), or null. */
export function pathToAny(s: GameState, from: number, goals: ReadonlySet<number>): number[] | null {
  let goal = -1;
  const walk = search(s, [from], (u) => {
    if (!goals.has(u)) return false;
    goal = u;
    return true;
  });
  return goal === -1 ? null : trace(s, walk, goal);
}

/** Path from the search's source to `to`, straightened. */
function trace(s: GameState, f: Field, to: number): number[] {
  const path = [to];
  for (let i = to; f.parent[i] !== -1; i = f.parent[i]) path.push(f.parent[i]);
  return smooth(s, path.reverse());
}

/**
 * Drops waypoints that a straight walk can skip: villagers cross open ground in straight lines.
 * A waypoint stays where the path joins or leaves a connected road, and a stretch along the road
 * is only straightened where the line stays on it, so villagers keep to the road.
 */
export function smooth(s: GameState, path: number[]): number[] {
  if (path.length < 3) return path;
  const net = roadNetwork(s);
  const onRoad = (k: number) => net[path[k]] === 1 && net[path[k + 1]] === 1; // step k → k + 1
  const out = [path[0]];
  for (let k = 2; k < path.length; k++) {
    const road = onRoad(k - 1);
    if (road !== onRoad(k - 2) || !clearLine(s, out[out.length - 1], path[k], road ? net : undefined)) out.push(path[k - 1]);
  }
  out.push(path[path.length - 1]);
  return out;
}

/**
 * A straight walk between two tile centers stays on walkable tiles (on connected road, given `net`):
 * every tile the line passes through, and both tiles beside any corner it passes exactly through.
 */
export function clearLine(s: GameState, a: number, b: number, net?: Uint8Array): boolean {
  let x = a % s.w;
  let y = (a / s.w) | 0;
  const dx = (b % s.w) - x;
  const dy = ((b / s.w) | 0) - y;
  const nx = Math.abs(dx);
  const ny = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const ok = (cx: number, cy: number) => (net ? net[cy * s.w + cx] === 1 : isWalkable(s, cy * s.w + cx));
  for (let ix = 0, iy = 0; ix < nx || iy < ny; ) {
    const side = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
    if (side === 0) {
      if (!ok(x + sx, y) || !ok(x, y + sy)) return false;
      x += sx;
      y += sy;
      ix++;
      iy++;
    } else if (side < 0) {
      x += sx;
      ix++;
    } else {
      y += sy;
      iy++;
    }
    if (!ok(x, y)) return false;
  }
  return true;
}

function push(h: number[], key: number): void {
  let i = h.length;
  h.push(key);
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p] <= key) break;
    h[i] = h[p];
    i = p;
  }
  h[i] = key;
}

function pop(h: number[]): number {
  const top = h[0];
  const last = h.pop()!;
  if (h.length) {
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= h.length) break;
      const c = l + 1 < h.length && h[l + 1] < h[l] ? l + 1 : l;
      if (h[c] >= last) break;
      h[i] = h[c];
      i = c;
    }
    h[i] = last;
  }
  return top;
}

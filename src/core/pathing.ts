import { CONFIG } from '../config';
import { BUILDINGS, footprint, HUB_KINDS } from './buildings';
import { isWalkable, neighbors4 } from './grid';
import { linkedBuildings, roadNetwork } from './roads';
import type { Building, GameState, ResourceKey } from './types';
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

/** Building id per tile, -1 off buildings. */
function owners(s: GameState): Int32Array {
  const owner = new Int32Array(s.w * s.h).fill(-1);
  for (const b of s.buildings) for (const i of footprint(s, b)) owner[i] = b.id;
  return owner;
}

/**
 * Dijkstra from `sources`. `visit(u, d)` runs as each tile's distance becomes final and may stop
 * the search by returning true. Ties pop in tile order, so results never depend on timing.
 *
 * A walk steps onto a building's tiles only within the building it is in or into one of `enter`
 * (its destination): villagers walk out of buildings and around the others, not over them.
 * `reverse` searches from the destinations back (a drop-off field), so each step is walked v → u.
 * `only`, if given, limits the walk to the tiles marked 1 in it (the sources aside).
 */
function search(
  s: GameState,
  sources: Iterable<number>,
  visit?: (u: number, d: number) => boolean,
  enter: ReadonlySet<number> = new Set(),
  reverse = false,
  only?: Uint8Array,
): Field {
  const n = s.w * s.h;
  const dist = new Int32Array(n).fill(-1);
  const parent = new Int32Array(n).fill(-1);
  const heap: number[] = []; // keys d * n + tile
  const net = roadNetwork(s);
  const owner = owners(s);
  // Per tile: 0 not walkable, 1 anyone may step onto it, 2 only from within its own building.
  const kind = new Uint8Array(n);
  for (let i = 0; i < n; i++) kind[i] = !isWalkable(s, i) || (only && !only[i]) ? 0 : owner[i] === -1 || enter.has(owner[i]) ? 1 : 2;
  // May the walk step between u and v (walked v → u when `reverse`)?
  const onto = (from: number, to: number) => kind[to] === 1 || (kind[to] === 2 && owner[to] === owner[from]);
  const open = reverse ? (u: number, v: number) => kind[v] !== 0 && onto(v, u) : onto;
  // A diagonal also needs both tiles beside it passable: no cutting past a tree's or another building's corner.
  const beside = (i: number, u: number, v: number) => kind[i] === 1 || (kind[i] === 2 && (owner[i] === owner[u] || owner[i] === owner[v]));
  const corner = (u: number, v: number, a: number, b: number) => open(u, v) && beside(a, u, v) && beside(b, u, v);
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
    const step = (v: number) => relax(v, d + (net[u] && net[v] ? ROAD_STEP : STEP), u);
    const diag = (v: number) => relax(v, d + (net[u] && net[v] ? ROAD_DIAG : DIAG), u);
    const l = x > 0;
    const r = x < s.w - 1;
    const t = u >= s.w;
    const b = u < n - s.w;
    if (l && open(u, u - 1)) step(u - 1);
    if (r && open(u, u + 1)) step(u + 1);
    if (t && open(u, u - s.w)) step(u - s.w);
    if (b && open(u, u + s.w)) step(u + s.w);
    if (t && l && corner(u, u - s.w - 1, u - s.w, u - 1)) diag(u - s.w - 1);
    if (t && r && corner(u, u - s.w + 1, u - s.w, u + 1)) diag(u - s.w + 1);
    if (b && l && corner(u, u + s.w - 1, u + s.w, u - 1)) diag(u + s.w - 1);
    if (b && r && corner(u, u + s.w + 1, u + s.w, u + 1)) diag(u + s.w + 1);
  }
  return { dist, parent };
}

/** Walking distance from every tile to the nearest connected drop-off accepting `res` (0 on the drop-off). */
export function buildField(s: GameState, res: ResourceKey, linked = linkedBuildings(s)): Field {
  const sources: number[] = [];
  const dropoffs = new Set<number>();
  for (const b of s.buildings) {
    if (linked.has(b.id) && (BUILDINGS[b.kind].dropoff as readonly ResourceKey[]).includes(res)) {
      sources.push(...footprint(s, b));
      dropoffs.add(b.id);
    }
  }
  return search(s, sources, undefined, dropoffs, true);
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

/** The walk from `from` to a tile beside `tree` it can be chopped from (with a way home in `field`) and its length, or null. */
export function walkToTree(s: GameState, field: Field, from: number, tree: number): { path: number[]; d: number } | null {
  let stand = -1;
  let dist = 0;
  const walk = search(s, [from], (u, d) => {
    if (field.dist[u] === -1 || !neighbors4(s, u).includes(tree)) return false;
    [stand, dist] = [u, d];
    return true;
  });
  return stand === -1 ? null : { path: trace(s, walk, stand), d: dist };
}

/**
 * The tile nearest `b` by walk for which `pick` holds, or -1: searched back from the building, so only tiles a villager
 * can walk into it from count (the same walks as `pathToAny` into it).
 */
export function nearestTo(s: GameState, b: Building, pick: (i: number) => boolean): number {
  let found = -1;
  search(s, footprint(s, b), (u) => {
    if (!pick(u)) return false;
    found = u;
    return true;
  }, new Set([b.id]), true);
  return found;
}

/** Walk from `from` to the nearest of `goals` (walkable tiles), or null. */
export function pathToAny(s: GameState, from: number, goals: ReadonlySet<number>): number[] | null {
  let goal = -1;
  const owner = owners(s);
  const into = new Set([...goals].map((g) => owner[g]).filter((id) => id !== -1));
  const walk = search(s, [from], (u) => {
    if (!goals.has(u)) return false;
    goal = u;
    return true;
  }, into);
  return goal === -1 ? null : trace(s, walk, goal);
}

/** A walk found by `roadRoutes`: its length in steps (STEP per tile) and the walk itself. */
export interface Route {
  d: number;
  path: () => number[];
}

/**
 * Walks that keep to the paving: connected roads, the hubs, and the footprints of `within` (the
 * buildings a walk starts or ends in). Every goal reached on the paving, or from a paved tile beside
 * it (a house), gets its shortest route from `from`. `nearest` stops at the first goal reached.
 */
export function roadRoutes(s: GameState, from: number, goals: ReadonlySet<number>, within: readonly Building[], nearest = false): Map<number, Route> {
  const paved = roadNetwork(s);
  const inside = [...s.buildings.filter((b) => HUB_KINDS.includes(b.kind)), ...within];
  for (const b of inside) for (const i of footprint(s, b)) paved[i] = 1;
  const reached = new Map<number, number>(); // goal -> paved tile it is reached from
  const walk = search(s, [from], (u) => {
    for (const g of [u, ...neighbors4(s, u)]) if (goals.has(g) && !reached.has(g)) reached.set(g, u);
    return nearest && reached.size > 0;
  }, new Set(inside.map((b) => b.id)), false, paved);
  const out = new Map<number, Route>();
  for (const [g, stand] of reached) {
    out.set(g, {
      d: walk.dist[stand] + (g === stand ? 0 : STEP),
      path: () => {
        const path = [stand];
        for (let i = stand; walk.parent[i] !== -1; i = walk.parent[i]) path.push(walk.parent[i]);
        path.reverse();
        if (g !== stand) path.push(g);
        return smooth(s, path, (i) => paved[i] === 1 || i === g || i === from);
      },
    });
  }
  return out;
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
 * is only straightened where the line stays on it, so villagers keep to the road. A line crosses no
 * building but the ones the walk starts and ends in, and off the road only tiles passing `offRoad` if given.
 */
export function smooth(s: GameState, path: number[], offRoad?: (i: number) => boolean): number[] {
  if (path.length < 3) return path;
  const net = roadNetwork(s);
  const owner = owners(s);
  const ends = new Set([owner[path[0]], owner[path[path.length - 1]]]);
  const open = offRoad ?? ((i: number) => owner[i] === -1 || ends.has(owner[i]));
  const onRoad = (k: number) => net[path[k]] === 1 && net[path[k + 1]] === 1; // step k → k + 1
  const out = [path[0]];
  for (let k = 2; k < path.length; k++) {
    const road = onRoad(k - 1);
    const clear = clearLine(s, out[out.length - 1], path[k], road ? (i) => net[i] === 1 : open);
    if (road !== onRoad(k - 2) || !clear) out.push(path[k - 1]);
  }
  out.push(path[path.length - 1]);
  return out;
}

/**
 * A straight walk between two tile centers stays on walkable tiles that pass `allow`: every tile
 * the line passes through, and both tiles beside any corner it passes exactly through.
 */
export function clearLine(s: GameState, a: number, b: number, allow: (i: number) => boolean = () => true): boolean {
  let x = a % s.w;
  let y = (a / s.w) | 0;
  const dx = (b % s.w) - x;
  const dy = ((b / s.w) | 0) - y;
  const nx = Math.abs(dx);
  const ny = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const ok = (cx: number, cy: number) => isWalkable(s, cy * s.w + cx) && allow(cy * s.w + cx);
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

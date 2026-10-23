import { BUILDINGS, buildingAt, buildingById, footprint, tallyTo, workersOf } from '../buildings';
import { gain } from '../economy';
import { tileAt } from '../grid';
import { pathHome, pathToAny } from '../pathing';
import type { Building, GameState, ResourceKey, Villager } from '../types';
import type { World } from '../world';

/** Moves along the path for up to `t` seconds; returns unused time. */
export function walk(w: World, v: Villager, t: number, speed: number): number {
  const sw = w.state.w;
  while (v.pathI < v.path.length) {
    const i = v.path[v.pathI];
    const cx = (i % sw) + 0.5;
    const cy = ((i / sw) | 0) + 0.5;
    const dx = cx - v.x;
    const dy = cy - v.y;
    const need = Math.hypot(dx, dy) / speed;
    if (need > t) {
      const f = t / need;
      v.x += dx * f;
      v.y += dy * f;
      return 0;
    }
    v.x = cx;
    v.y = cy;
    t -= need;
    v.pathI++;
  }
  return t;
}

export const arrived = (v: Villager) => v.pathI >= v.path.length;

/** Heads for the nearest drop-off accepting `res`. */
export function goHome(w: World, v: Villager, res: ResourceKey): void {
  v.path = pathHome(w.state, w.fields[res], tileAt(w.state, v.x, v.y));
  v.pathI = 0;
  v.state = 'toHome';
}

/**
 * Delivers `n` of `res` where the villager stands: into the stockpile, and onto the tally of the
 * drop-off it reached (none if it stopped short, e.g. with no way home) and of its `source` workplace.
 */
export function deliver(w: World, v: Villager, res: ResourceKey, n: number, source?: Building): void {
  const s = w.state;
  gain(s, res, n);
  w.gathered[v.job][res] += n;
  const at = buildingAt(s, tileAt(s, v.x, v.y));
  if (at && BUILDINGS[at.kind].dropoff.includes(res)) tallyTo(at, res, n);
  if (source) tallyTo(source, res, n);
}

/**
 * Path to the worker's own tile in the workplace. Its staff spread evenly over the interior (the
 * footprint minus its edge, when the building is at least 3×3), so pickers stand among the rows.
 */
export function pathToWork(s: GameState, v: Villager, b: Building): number[] | null {
  const { w, h } = BUILDINGS[b.kind];
  const inset = w >= 3 && h >= 3 ? 1 : 0;
  const iw = w - 2 * inset;
  const n = iw * (h - 2 * inset);
  const staff = s.villagers.filter((u) => u.workplace === b.id);
  const slots = Math.max(staff.length, workersOf(s, b));
  const j = Math.min(n - 1, Math.floor(((Math.max(0, staff.indexOf(v)) + 0.5) * n) / slots));
  const spot = (b.y + inset + Math.floor(j / iw)) * s.w + b.x + inset + (j % iw);
  return pathToAny(s, tileAt(s, v.x, v.y), new Set([spot]));
}

/** Workplace worker after a delivery: reuse the reversed home path, or path to a moved workplace. */
export function returnToWork(w: World, v: Villager): void {
  const s = w.state;
  const place = buildingById(s, v.workplace);
  const goals = place ? footprint(s, place) : [];
  // A moved workplace or redirected delivery may invalidate the old return endpoint.
  if (goals.includes(v.path[0])) v.path.reverse();
  else {
    const path = place && pathToWork(s, v, place);
    if (!path) { v.path = []; v.pathI = 0; v.state = 'idle'; return; }
    v.path = path;
  }
  v.pathI = 0;
  v.state = 'toWork';
}

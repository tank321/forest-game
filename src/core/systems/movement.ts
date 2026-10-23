import { tileAt } from '../grid';
import { pathHome } from '../pathing';
import type { ResourceKey, Villager } from '../types';
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
  v.path = pathHome(w.fields[res], tileAt(w.state, v.x, v.y));
  v.pathI = 0;
  v.state = 'toHome';
}

/** After a delivery: walk back the way we came (the reversed home path). */
export function returnToWork(v: Villager, state: 'toTree' | 'toWork'): void {
  v.path.reverse();
  v.pathI = 0;
  v.state = state;
}

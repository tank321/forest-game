import { getStats } from '../stats';
import type { World } from '../world';

/**
 * Villagers beyond the free ones eat food all year and burn firewood in winter. Stocks stop at 0;
 * a shortage only slows work (see getStats). Lifetime totals count gathering, so they are untouched.
 */
export function upkeepSystem(w: World, dt: number): void {
  const r = w.state.resources;
  const { eat, burn } = getStats(w.state);
  r.food = Math.max(0, r.food - eat * dt);
  r.wood = Math.max(0, r.wood - burn * dt);
}

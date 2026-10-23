import { gain } from '../economy';
import { getStats } from '../stats';
import type { World } from '../world';

/**
 * Continuous town flows. Villagers beyond the free ones eat food all year and burn firewood in
 * winter; stocks stop at 0, and a shortage only slows work (see getStats). Lifetime totals count
 * gathering, so upkeep leaves them untouched. Houses near a Tax Office pay gold, which counts as gathered.
 */
export function upkeepSystem(w: World, dt: number): void {
  const r = w.state.resources;
  const { eat, burn, tax } = getStats(w.state);
  r.food = Math.max(0, r.food - eat * dt);
  r.wood = Math.max(0, r.wood - burn * dt);
  if (tax > 0) gain(w.state, 'gold', tax * dt);
}

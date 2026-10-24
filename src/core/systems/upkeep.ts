import { getStats } from '../stats';
import type { World } from '../world';

/**
 * Continuous town flows. Villagers beyond the free ones eat food all year and burn firewood in
 * winter; stocks stop at 0, and a shortage only slows work (see getStats). Lifetime totals count
 * gathering, so upkeep leaves them untouched. Taxed houses come to owe gold, up to what they hold,
 * which counts once a tax collector brings it to a Tax Office (see collector.ts).
 */
export function upkeepSystem(w: World, dt: number): void {
  const r = w.state.resources;
  const { eat, burn, taxedHouses, taxPerHouse, taxHold } = getStats(w.state);
  r.food = Math.max(0, r.food - eat * dt);
  r.wood = Math.max(0, r.wood - burn * dt);
  for (const h of w.state.buildings) if (taxedHouses.has(h.id)) h.due = Math.min(taxHold, (h.due ?? 0) + taxPerHouse * dt);
}

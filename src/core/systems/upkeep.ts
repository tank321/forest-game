import { CONFIG } from '../../config';
import { buildingGap, tallyTo } from '../buildings';
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
  const { eat, burn, tax, taxedHouses, linked } = getStats(w.state);
  r.food = Math.max(0, r.food - eat * dt);
  r.wood = Math.max(0, r.wood - burn * dt);
  if (!tax) return;
  gain(w.state, 'gold', tax * dt);
  w.gathered.tax.gold += tax * dt;
  // Each taxed house's gold is shared equally by the Tax Offices in reach of it.
  const offices = w.state.buildings.filter((b) => b.kind === 'taxOffice' && linked.has(b.id));
  const perHouse = (tax * dt) / taxedHouses.size;
  for (const h of w.state.buildings) {
    if (!taxedHouses.has(h.id)) continue;
    const reach = offices.filter((o) => buildingGap(h, o) <= CONFIG.tax.radius);
    for (const o of reach) tallyTo(o, 'gold', perHouse / reach.length);
  }
}

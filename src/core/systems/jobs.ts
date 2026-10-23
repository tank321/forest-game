import { BUILDINGS, buildingById, isActive, workersOf } from '../buildings';
import { linkedBuildings } from '../roads';
import type { World } from '../world';

/**
 * Staffs workplaces (buildings with job slots) from empty-handed lumberjacks, nearest first,
 * and returns workers of paused, isolated or removed workplaces to lumberjacking once their hands are empty.
 * Reassigning only at carry 0 keeps every gathered unit accounted for.
 */
export function jobSystem(w: World): void {
  const s = w.state;
  const linked = linkedBuildings(s);
  for (const v of s.villagers) {
    if (v.job !== 'lumber' && v.carry === 0 && !isActive(s, buildingById(s, v.workplace), linked)) {
      v.job = 'lumber';
      v.workplace = -1;
      v.state = 'idle';
    }
  }
  for (const b of s.buildings) {
    const def = BUILDINGS[b.kind];
    const slots = workersOf(s, b);
    if (!slots || !def.job || !isActive(s, b, linked)) continue;
    let staff = s.villagers.reduce((n, v) => n + (v.workplace === b.id ? 1 : 0), 0);
    const cx = b.x + def.w / 2;
    const cy = b.y + def.h / 2;
    while (staff < slots) {
      let best = null;
      let bd = Infinity;
      for (const v of s.villagers) {
        if (v.job !== 'lumber' || v.carry !== 0) continue;
        const d = (v.x - cx) ** 2 + (v.y - cy) ** 2;
        if (d < bd) [bd, best] = [d, v];
      }
      if (!best) break;
      best.job = def.job;
      best.workplace = b.id;
      best.target = -1;
      best.state = 'idle';
      staff++;
    }
  }
}

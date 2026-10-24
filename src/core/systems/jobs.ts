import { BUILDINGS, buildingById, isActive, workersOf } from '../buildings';
import { tileAt } from '../grid';
import { nearestTo } from '../pathing';
import { linkedBuildings } from '../roads';
import type { Villager } from '../types';
import type { World } from '../world';

/** Back to lumberjacking: the workplace's slot opens again. Only at carry 0, so no load changes job. */
export function quitJob(v: Villager): void {
  v.job = 'lumber';
  v.workplace = -1;
  v.state = 'idle';
}

/**
 * Staffs workplaces (buildings with job slots) from empty-handed lumberjacks, nearest by walk first (one that buildings
 * or forest cut off from the workplace is never picked), and returns workers of paused, isolated or removed workplaces
 * to lumberjacking once their hands are empty. Reassigning only at carry 0 keeps every gathered unit accounted for.
 */
export function jobSystem(w: World): void {
  const s = w.state;
  const linked = linkedBuildings(s);
  for (const v of s.villagers) {
    if (v.job !== 'lumber' && v.carry === 0 && !isActive(s, buildingById(s, v.workplace), linked)) quitJob(v);
  }
  for (const b of s.buildings) {
    const def = BUILDINGS[b.kind];
    const slots = workersOf(s, b);
    if (!slots || !def.job || !isActive(s, b, linked)) continue;
    let staff = s.villagers.reduce((n, v) => n + (v.workplace === b.id ? 1 : 0), 0);
    if (staff >= slots) continue;
    const free = new Map<number, Villager>(); // the first empty-handed lumberjack on each tile
    for (const v of s.villagers) {
      const at = tileAt(s, v.x, v.y);
      if (v.job === 'lumber' && v.carry === 0 && !free.has(at)) free.set(at, v);
    }
    while (staff < slots && free.size) {
      const at = nearestTo(s, b, (i) => free.has(i));
      if (at === -1) break;
      const best = free.get(at)!;
      free.delete(at);
      best.job = def.job;
      best.workplace = b.id;
      best.target = -1;
      best.state = 'idle';
      staff++;
    }
  }
}

import { BUILDINGS } from '../buildings';
import { popCap } from '../economy';
import { lvl } from '../skills';
import { spawnVillager } from '../state';
import { getStats } from '../stats';
import type { World } from '../world';

/**
 * Growing Families: while the town has room and a food surplus, progress toward the next birth fills at `birthRate`;
 * otherwise it waits where it is. Born villagers aren't hires, so villager prices don't rise.
 */
export function birthSystem(w: World, dt: number): void {
  const s = w.state;
  if (!lvl(s, 'growingFamilies')) return;
  const { birthRate, surplus } = getStats(s);
  if (!surplus || s.villagers.length >= popCap(s)) return;
  s.births += birthRate * dt;
  if (s.births < 1) return;
  s.births -= 1;
  born(w, 1);
}

/** Spring Births, as spring begins: `springBirths` villagers at once, room allowing, if the town has a food surplus. */
export function springBirths(w: World): void {
  const s = w.state;
  const st = getStats(s);
  if (!st.springBirths || !st.surplus) return;
  const n = Math.min(st.springBirths, popCap(s) - s.villagers.length);
  if (n <= 0) return;
  born(w, n);
  w.fx.push({ kind: 'springBirths', i: -1, n });
}

/** `n` villagers at the Town Center, shown rising over it. */
function born(w: World, n: number): void {
  const s = w.state;
  for (let k = 0; k < n; k++) spawnVillager(s);
  const tc = s.buildings.find((b) => b.kind === 'townCenter')!;
  const { w: bw, h: bh } = BUILDINGS.townCenter;
  w.fx.push({ kind: 'birth', i: (tc.y + (bh >> 1)) * s.w + tc.x + (bw >> 1), n });
}

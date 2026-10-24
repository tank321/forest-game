import { CONFIG } from '../config';
import { achievementSystem } from './achievements';
import { BUILDINGS, buildingById } from './buildings';
import { fillContracts, rollDeals } from './guild';
import { seasonLeft, seasonOf, SUMMER, WINTER } from './seasons';
import { lvl } from './skills';
import { getStats } from './stats';
import { grazingSystem } from './systems/grazing';
import { jobSystem } from './systems/jobs';
import { muleSystem } from './systems/mules';
import { upkeepSystem } from './systems/upkeep';
import { villagerSystem } from './systems/villagers';
import { burst } from './systems/workplace';
import { gainBonus, type World } from './world';

export type System = (w: World, dt: number) => void;

/** Run order matters; new systems (production, growth, events) are appended here. */
const systems: System[] = [jobSystem, upkeepSystem, villagerSystem, muleSystem, grazingSystem];

/**
 * Advances `dt`, split at season boundaries so no step straddles a change of season. Harvest Festival
 * pays out on the step that ends autumn, at the harvest rates of autumn; Shearing Day on the step
 * that ends winter, at the wool rates of winter. The Midsummer Fair opens and the Merchant Caravan
 * comes and goes on these steps too, and the Guild Contracts board is topped up after every step.
 * Achievements are checked after `dt` has run, a few times per simulated second.
 */
export function tick(w: World, dt: number): void {
  const s = w.state;
  const k = CONFIG.skills;
  const checks = CONFIG.achievements.checksPerSecond;
  const checkedAt = Math.floor(s.time * checks);
  while (dt > 0) {
    const left = seasonLeft(s.time);
    const d = Math.min(dt, left);
    const ending = d === left ? seasonOf(s.time) : -1;
    const festival = ending === WINTER - 1 && lvl(s, 'harvestFestival') ? burst(w, getStats(s), ['farm', 'orchard'], k.festival.seconds) : null;
    const shearing = ending === WINTER && lvl(s, 'shearingDay') ? burst(w, getStats(s), ['herd'], k.shearing) : null;
    for (const sys of systems) sys(w, d);
    s.time += d;
    dt -= d;
    const food = festival ? [...festival.values()].reduce((a, b) => a + b, 0) : 0;
    if (food) {
      gainBonus(w, 'food', food);
      w.fx.push({ kind: 'festival', i: -1, n: food });
    }
    for (const [id, n] of shearing ?? []) {
      const b = buildingById(s, id);
      if (!b || !n) continue;
      gainBonus(w, 'cloth', n);
      const { w: bw, h: bh } = BUILDINGS[b.kind];
      w.fx.push({ kind: 'shearing', i: (b.y + (bh >> 1)) * s.w + b.x + (bw >> 1), n });
    }
    if (ending === SUMMER - 1 && lvl(s, 'midsummerFair')) w.fx.push({ kind: 'fair', i: -1, n: 0 });
    // The Merchant Caravan comes as winter begins and leaves as spring does.
    if (ending === WINTER - 1 && lvl(s, 'merchantCaravans')) {
      s.caravan = rollDeals(s);
      w.fx.push({ kind: 'caravan', i: -1, n: 0 });
    }
    if (ending === WINTER) s.caravan = null;
    if (lvl(s, 'guildContracts')) fillContracts(s);
  }
  if (Math.floor(s.time * checks) !== checkedAt) achievementSystem(w);
}

/** Advance `seconds` in steps of at most `step` (offline / background catch-up). */
export function simulate(w: World, seconds: number, step: number): void {
  while (seconds > 0) {
    const d = Math.min(step, seconds);
    tick(w, d);
    seconds -= d;
  }
}

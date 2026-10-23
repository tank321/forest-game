import { seasonLeft } from './seasons';
import { jobSystem } from './systems/jobs';
import { upkeepSystem } from './systems/upkeep';
import { villagerSystem } from './systems/villagers';
import type { World } from './world';

export type System = (w: World, dt: number) => void;

/** Run order matters; new systems (production, growth, events) are appended here. */
const systems: System[] = [jobSystem, upkeepSystem, villagerSystem];

/** Advances `dt`, split at season boundaries so no step straddles a change of season. */
export function tick(w: World, dt: number): void {
  while (dt > 0) {
    const d = Math.min(dt, seasonLeft(w.state.time));
    for (const sys of systems) sys(w, d);
    w.state.time += d;
    dt -= d;
  }
}

/** Advance `seconds` in steps of at most `step` (offline / background catch-up). */
export function simulate(w: World, seconds: number, step: number): void {
  while (seconds > 0) {
    const d = Math.min(step, seconds);
    tick(w, d);
    seconds -= d;
  }
}

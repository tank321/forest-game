import { jobSystem } from './systems/jobs';
import { villagerSystem } from './systems/villagers';
import type { World } from './world';

export type System = (w: World, dt: number) => void;

/** Run order matters; new systems (production, growth, events) are appended here. */
const systems: System[] = [jobSystem, villagerSystem];

export function tick(w: World, dt: number): void {
  for (const sys of systems) sys(w, dt);
  w.state.time += dt;
}

/** Advance `seconds` in steps of at most `step` (offline / background catch-up). */
export function simulate(w: World, seconds: number, step: number): void {
  while (seconds > 0) {
    const d = Math.min(step, seconds);
    tick(w, d);
    seconds -= d;
  }
}

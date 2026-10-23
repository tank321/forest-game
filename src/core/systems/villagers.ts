import { getStats } from '../stats';
import type { World } from '../world';
import { updateFarmer } from './farmer';
import { updateLumberjack } from './lumberjack';

/** Runs each villager's job state machine. New jobs add a case here. */
export function villagerSystem(w: World, dt: number): void {
  const st = getStats(w.state);
  for (const v of w.state.villagers) {
    if (v.job === 'farm') updateFarmer(w, v, dt, st);
    else updateLumberjack(w, v, dt, st);
  }
}

import { getStats, type Stats } from '../stats';
import type { Job, Villager } from '../types';
import type { World } from '../world';
import { updateLumberjack } from './lumberjack';
import { updateWorker } from './workplace';

type Updater = (w: World, v: Villager, dt: number, st: Stats) => void;

/** Each job's state machine. New jobs add an entry here. */
const UPDATERS: Record<Job, Updater> = { lumber: updateLumberjack, farm: updateWorker, mine: updateWorker };

export function villagerSystem(w: World, dt: number): void {
  const st = getStats(w.state);
  for (const v of w.state.villagers) UPDATERS[v.job](w, v, dt, st);
}

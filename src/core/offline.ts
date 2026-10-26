import { CONFIG } from '../config';
import { chestTimeline, expireBoosts } from './chest';
import { gain } from './economy';
import { simulate } from './sim';
import { RESOURCES, type Resources } from './types';
import { createWorld, type World } from './world';

/**
 * Time away (the app closed or hidden) pays only resources. A copy of the town is simulated through it, up to
 * `CONFIG.sim.maxOfflineSeconds`, with any Lucky Chest speed boost for the part of it the boost ran; whatever the copy
 * gained is added to the stock, and the copy is thrown away. The town itself stays as it was left: no trees fall, and
 * its villagers, time, season and relics don't move on. Nothing is lost while away (upkeep beyond what was gathered
 * isn't taken). `now` is wall-clock ms. Returns the resources gained.
 */
export function awayEarnings(w: World, seconds: number, now: number): Resources {
  const s = w.state;
  const copy = createWorld(structuredClone(s));
  let at = now - seconds * 1000;
  let left = Math.min(seconds, CONFIG.sim.maxOfflineSeconds);
  for (const { end, speed } of chestTimeline(s.chest, at, now)) {
    const span = Math.min(left, (end - at) / 1000);
    simulate(copy, span * speed, CONFIG.sim.catchUpDt);
    left -= span;
    at = end;
    expireBoosts(copy.state.chest, end);
  }
  expireBoosts(s.chest, now);
  const got = {} as Resources;
  for (const r of RESOURCES) {
    got[r] = Math.max(0, copy.state.resources[r] - s.resources[r]);
    gain(s, r, got[r]);
  }
  return got;
}

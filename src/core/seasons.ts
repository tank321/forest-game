import { CONFIG } from '../config';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];
export const SPRING = 0;
export const SUMMER = 1;
export const WINTER = 3;

const { length } = CONFIG.seasons;

/** Season index (0 = spring) at simulated time `t`. Derived from time, so nothing is saved. */
export const seasonOf = (t: number) => Math.floor(t / length) % SEASONS.length;

/** Seconds until the next season starts; always > 0. */
export function seasonLeft(t: number): number {
  const left = length - (t % length);
  return left > 0 ? left : length;
}

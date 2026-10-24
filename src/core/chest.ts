import { CONFIG } from '../config';
import { rand } from './rng';
import { RESOURCES, type Cost, type GameState, type Resources } from './types';

/** Lucky Chest rewards: timed boosts, or a Windfall paid at once. */
export type ChestReward = keyof typeof CONFIG.chest.odds;
export type BoostKind = keyof typeof CONFIG.chest.boosts;
export const CHEST_REWARDS = Object.keys(CONFIG.chest.odds) as ChestReward[];

/** A running boost; `until` is wall-clock ms, so it runs out in real time, also while the game is closed. */
export interface ChestBoost {
  kind: BoostKind;
  until: number;
}

/**
 * `readyAt` is the wall-clock ms the chest can next be opened (0 = ready). `pending` is a reward rolled when it was
 * opened but not yet claimed: it is applied as the lid flies off, so nothing gives it away before the reveal.
 */
export interface ChestState {
  readyAt: number;
  boost: ChestBoost | null;
  pending: ChestReward | null;
}

export const newChest = (): ChestState => ({ readyAt: 0, boost: null, pending: null });

export const isBoost = (r: ChestReward): r is BoostKind => r in CONFIG.chest.boosts;

/** A boost's multiplier while it runs, else 1. */
export function chestMult(s: Pick<GameState, 'chest'>, kind: BoostKind): number {
  return s.chest.boost?.kind === kind ? CONFIG.chest.boosts[kind].mult : 1;
}

/** How fast the live game runs: a speed boost's multiplier, else 1. */
export function chestSpeed(s: Pick<GameState, 'chest'>): number {
  const kind = s.chest.boost?.kind;
  return kind === 'speed2' || kind === 'speed3' || kind === 'speed5' ? CONFIG.chest.boosts[kind].mult : 1;
}

/** Picks a reward by `CONFIG.chest.odds`, from the game's seeded randomness (so reloading can't re-roll it). */
export function rollChest(s: GameState): ChestReward {
  const odds = CONFIG.chest.odds;
  const total = CHEST_REWARDS.reduce((n, r) => n + odds[r], 0);
  let x = rand(s) * total;
  for (const r of CHEST_REWARDS) if ((x -= odds[r]) < 0) return r;
  return CHEST_REWARDS[CHEST_REWARDS.length - 1];
}

/**
 * A Windfall: `CONFIG.chest.windfall.minutes` of income per resource, at the current rate (`income`, per minute)
 * or the lifetime average, whichever is more, and never less than `minWood` wood.
 */
export function windfall(s: GameState, income: Partial<Resources>): Cost {
  const { minutes, minWood } = CONFIG.chest.windfall;
  const out: Cost = {};
  for (const r of RESOURCES) {
    const lifetime = (s.totals[r] / Math.max(s.time, 60)) * 60;
    const n = Math.round(minutes * Math.max(income[r] ?? 0, lifetime));
    if (n > 0) out[r] = n;
  }
  out.wood = Math.max(out.wood ?? 0, minWood);
  return out;
}

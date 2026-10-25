import { CONFIG } from '../config';
import { rand } from './rng';
import { RESOURCES, type Cost, type GameState, type Resources } from './types';

/** Lucky Chest rewards: timed boosts, or a Windfall paid at once. */
export type ChestReward = keyof typeof CONFIG.chest.odds;
export type BoostKind = keyof typeof CONFIG.chest.boosts;
export const CHEST_REWARDS = Object.keys(CONFIG.chest.odds) as ChestReward[];

/**
 * A running or queued boost. `until` is wall-clock ms, so it runs out in real time, also while the game is closed;
 * `ms` is how long this run lasts in all, for its time bar.
 */
export interface ChestBoost {
  kind: BoostKind;
  until: number;
  ms: number;
}

/**
 * The chest stores up to `CONFIG.chest.store` openings, one every `cooldownMs` of real time: `stored` of them are waiting
 * and the next one is stored at `readyAt` (wall-clock ms; 0 = its timer starts at the next `refillChest`). While full,
 * the timer stops. `pending` holds the rewards rolled when the stored chests were opened but not yet claimed: they are
 * applied as the lid flies off, so nothing gives them away before the reveal.
 * `boosts` never holds two of a kind. Speed boosts can't run together, so they run back to back, fastest first: the
 * first speed listed is running and each later one starts when the one before it ends.
 */
export interface ChestState {
  stored: number;
  readyAt: number;
  boosts: ChestBoost[];
  pending: ChestReward[];
}

export const newChest = (): ChestState => ({ stored: 1, readyAt: 0, boosts: [], pending: [] });

export const isBoost = (r: ChestReward): r is BoostKind => r in CONFIG.chest.boosts;
const SPEEDS: readonly BoostKind[] = ['speed2', 'speed3', 'speed5'];
export const isSpeed = (k: BoostKind) => SPEEDS.includes(k);

/** The boosts in effect: every one but the queued speeds. */
export const runningBoosts = (c: ChestState) => {
  const speed = c.boosts.find((b) => isSpeed(b.kind));
  return c.boosts.filter((b) => !isSpeed(b.kind) || b === speed);
};

/** A boost's multiplier while it runs, else 1. */
export function chestMult(s: Pick<GameState, 'chest'>, kind: BoostKind): number {
  return runningBoosts(s.chest).some((b) => b.kind === kind) ? CONFIG.chest.boosts[kind].mult : 1;
}

/** How fast the live game runs: the running speed boost's multiplier, else 1. */
export function chestSpeed(s: Pick<GameState, 'chest'>): number {
  const b = s.chest.boosts.find((b) => isSpeed(b.kind));
  return b ? CONFIG.chest.boosts[b.kind].mult : 1;
}

/** Stores every chest whose time has come by `now` (wall-clock ms), up to the limit. */
export function refillChest(c: ChestState, now: number): void {
  const { cooldownMs, store } = CONFIG.chest;
  if (c.stored >= store) return;
  if (!c.readyAt) c.readyAt = now + cooldownMs;
  if (now < c.readyAt) return;
  const n = Math.min(store - c.stored, 1 + Math.floor((now - c.readyAt) / cooldownMs));
  c.stored += n;
  c.readyAt += n * cooldownMs;
}

/**
 * Adds a boost won at `now`. The same kind adds its time to the one there; a speed takes its place in the queue,
 * fastest first (a slower one running pauses and resumes after it).
 */
export function addBoost(c: ChestState, kind: BoostKind, now: number): void {
  const ms = CONFIG.chest.boosts[kind].seconds * 1000;
  if (!isSpeed(kind)) {
    const b = c.boosts.find((b) => b.kind === kind);
    if (b) {
      b.until += ms;
      b.ms = b.until - now;
    } else c.boosts.push({ kind, until: now + ms, ms });
    return;
  }
  // Each queued speed's time left, merged by kind, then laid out again back to back from now.
  let at = now;
  const left = new Map<BoostKind, number>([[kind, ms]]);
  for (const b of c.boosts.filter((b) => isSpeed(b.kind))) {
    left.set(b.kind, (left.get(b.kind) ?? 0) + Math.max(0, b.until - at));
    at = b.until;
  }
  at = now;
  const speeds = [...left].sort(([a], [b]) => CONFIG.chest.boosts[b].mult - CONFIG.chest.boosts[a].mult).map(([kind, ms]) => {
    at += ms;
    return { kind, until: at, ms };
  });
  c.boosts = [...c.boosts.filter((b) => !isSpeed(b.kind)), ...speeds];
}

/** Ends every boost whose time is up at `now` (wall-clock ms). Returns the ones that ended. */
export function expireBoosts(c: ChestState, now: number): ChestBoost[] {
  const ended = c.boosts.filter((b) => now >= b.until);
  if (ended.length) c.boosts = c.boosts.filter((b) => now < b.until);
  return ended;
}

/**
 * Splits the wall-clock span `from`..`to` (ms) where a boost ends, for offline catch-up: each piece gives its end and
 * the game speed during it, which holds until that end, where `expireBoosts` is called.
 */
export function chestTimeline(c: ChestState, from: number, to: number): { end: number; speed: number }[] {
  const ends = [...new Set(c.boosts.map((b) => b.until).filter((t) => t > from && t < to))].sort((a, b) => a - b);
  let boosts = c.boosts.filter((b) => from < b.until);
  return [...ends, to].map((end) => {
    const speed = chestSpeed({ chest: { ...c, boosts } });
    boosts = boosts.filter((b) => end < b.until);
    return { end, speed };
  });
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

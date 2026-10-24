import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { CHEST_REWARDS, chestSpeed, rollChest, type ChestReward } from '../src/core/chest';
import { chopTree, claimChest, expireChest, openChest, prestige } from '../src/core/commands';
import { isChoppable } from '../src/core/grid';
import { deserialize, serialize } from '../src/core/save';
import { getStats } from '../src/core/stats';
import type { GameState } from '../src/core/types';
import { smallWorld } from './helpers';

const C = CONFIG.chest;
const T0 = 1_700_000_000_000; // a wall-clock time, in ms

/** Points the seeded randomness at a state whose next chest roll is `reward`. */
function rigRoll(s: GameState, reward: ChestReward): void {
  for (let rng = 0; ; rng++) {
    if (rollChest({ ...s, rng }) === reward) {
      s.rng = rng;
      return;
    }
  }
}

describe('Lucky Chest', () => {
  it('starts ready, then waits out its cooldown in wall-clock time', () => {
    const w = smallWorld();
    const s = w.state;
    expect(openChest(w, T0)).not.toBeNull();
    expect(s.chest.readyAt).toBe(T0 + C.cooldownMs);
    claimChest(w, T0, {});
    expect(openChest(w, T0 + C.cooldownMs - 1)).toBeNull();
    expect(openChest(w, T0 + C.cooldownMs)).not.toBeNull();
  });

  it('applies nothing until the reward is claimed, and an unclaimed chest opens again to the same reward', () => {
    const w = smallWorld();
    const s = w.state;
    rigRoll(s, 'windfall');
    const wood = s.resources.wood;
    expect(openChest(w, T0)).toBe('windfall');
    expect(s.resources.wood).toBe(wood);
    expect(s.chest.pending).toBe('windfall');
    const rng = s.rng;
    expect(openChest(w, T0 + 5)).toBe('windfall'); // no new roll, and the cooldown isn't restarted
    expect(s.rng).toBe(rng);
    expect(s.chest.readyAt).toBe(T0 + C.cooldownMs);
    expect(claimChest(w, T0 + 5, {})!.reward).toBe('windfall');
    expect(s.resources.wood).toBeGreaterThan(wood);
    expect(claimChest(w, T0 + 6, {})).toBeNull();
  });

  it('rolls from the seeded randomness, so the same state always gets the same reward', () => {
    const a = smallWorld(20, 0, 7).state;
    const b = smallWorld(20, 0, 7).state;
    const rolls = Array.from({ length: 200 }, () => rollChest(a));
    expect(Array.from({ length: 200 }, () => rollChest(b))).toEqual(rolls);
    expect(new Set(rolls)).toEqual(new Set(CHEST_REWARDS));
  });

  it('runs a speed boost for its seconds, then ends it', () => {
    const w = smallWorld();
    const s = w.state;
    rigRoll(s, 'speed5');
    expect(openChest(w, T0)).toBe('speed5');
    expect(chestSpeed(s)).toBe(1);
    claimChest(w, T0, {}); // the boost runs from the claim, not the click
    expect(chestSpeed(s)).toBe(C.boosts.speed5.mult);
    expect(expireChest(s, T0 + C.boosts.speed5.seconds * 1000 - 1)).toBe(false);
    expect(expireChest(s, T0 + C.boosts.speed5.seconds * 1000)).toBe(true);
    expect(s.chest.boost).toBeNull();
    expect(chestSpeed(s)).toBe(1);
  });

  it('Mighty Taps makes chopping by hand ×10', () => {
    const w = smallWorld();
    const s = w.state;
    const tree = s.tiles.findIndex((_, i) => isChoppable(s, i));
    const tap = () => {
      const before = s.resources.wood;
      chopTree(w, tree);
      return s.resources.wood - before;
    };
    const plain = tap();
    s.chest.boost = { kind: 'taps', until: Infinity };
    expect(tap()).toBeCloseTo(plain * C.boosts.taps.mult);
  });

  it('Bountiful doubles gathering and walking without touching the clock', () => {
    const w = smallWorld(20, 2);
    const s = w.state;
    const before = getStats(s);
    s.chest.boost = { kind: 'bountiful', until: Infinity };
    const after = getStats(s);
    const k = C.boosts.bountiful.mult;
    for (const stat of ['chopRate', 'farmRate', 'mineRate', 'herdRate', 'speed', 'orchardSpeed'] as const) expect(after[stat]).toBeCloseTo(before[stat] * k);
    expect(after.carry).toBe(before.carry);
    expect(chestSpeed(s)).toBe(1);
  });

  it('a Windfall pays minutes of the current or lifetime income, whichever is more, and at least some wood', () => {
    const w = smallWorld();
    const s = w.state;
    s.time = 600;
    s.totals.food = 6000; // lifetime 600 food/min
    rigRoll(s, 'windfall');
    const wood = s.resources.wood;
    openChest(w, T0);
    const { reward, paid } = claimChest(w, T0, { wood: 0.5, food: 100, gold: 40 })!;
    expect(reward).toBe('windfall');
    expect(paid).toEqual({ wood: C.windfall.minWood, food: 600 * C.windfall.minutes, gold: 40 * C.windfall.minutes });
    expect(s.resources.wood).toBe(wood + C.windfall.minWood);
    expect(s.resources.gold).toBe(40 * C.windfall.minutes);
    expect(s.chest.boost).toBeNull();
  });

  it('keeps its cooldown and boost across a rebuild', () => {
    const w = smallWorld(30, 2);
    w.state.skills = { sharpAxes: 5, bigBaskets: 5, swiftFeet: 5 };
    w.state.chest = { readyAt: T0, boost: { kind: 'speed2', until: T0 + 5 }, pending: 'taps' };
    expect(prestige(w, 'masterHarvest')!.chest).toEqual(w.state.chest);
  });

  it('round-trips through a save, and a v20 save migrates with the chest ready', () => {
    const w = smallWorld();
    w.state.chest = { readyAt: T0, boost: { kind: 'bountiful', until: T0 + 9 }, pending: 'speed3' };
    expect(deserialize(serialize(w.state)).state.chest).toEqual(w.state.chest);
    const old = JSON.parse(serialize(w.state));
    old.version = 20;
    delete old.state.chest;
    expect(deserialize(JSON.stringify(old)).state.chest).toEqual({ readyAt: 0, boost: null, pending: null });
  });
});

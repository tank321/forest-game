import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { CHEST_REWARDS, chestMult, chestSpeed, chestTimeline, expireBoosts, rollChest, type ChestReward } from '../src/core/chest';
import { chopTree, claimChest, openChest, prestige } from '../src/core/commands';
import { isChoppable } from '../src/core/grid';
import { deserialize, serialize } from '../src/core/save';
import { getStats } from '../src/core/stats';
import type { GameState } from '../src/core/types';
import type { World } from '../src/core/world';
import { smallWorld } from './helpers';

const C = CONFIG.chest;
const T0 = 1_700_000_000_000; // a wall-clock time, in ms

/** Points the seeded randomness at a state whose next chest rolls are `rewards`, in order. */
function rigRoll(s: GameState, ...rewards: ChestReward[]): void {
  for (let rng = 0; ; rng++) {
    const probe = { ...s, rng };
    if (rewards.every((r) => rollChest(probe) === r)) {
      s.rng = rng;
      return;
    }
  }
}

/** Opens and claims every stored chest at `now` with the given rolls. */
function win(w: World, now: number, ...rewards: ChestReward[]) {
  rigRoll(w.state, ...rewards);
  expect(openChest(w, now)).toEqual(rewards);
  return claimChest(w, now, {})!;
}

const sec = (k: keyof typeof C.boosts) => C.boosts[k].seconds * 1000;

describe('Lucky Chest', () => {
  it('starts with one stored, then stores the next once its cooldown has passed in wall-clock time', () => {
    const w = smallWorld();
    const s = w.state;
    expect(openChest(w, T0)).toHaveLength(1);
    expect(s.chest.readyAt).toBe(T0 + C.cooldownMs);
    claimChest(w, T0, {});
    expect(openChest(w, T0 + C.cooldownMs - 1)).toBeNull();
    expect(openChest(w, T0 + C.cooldownMs)).toHaveLength(1);
  });

  it('stores up to three while unopened, and opens them all at once', () => {
    const w = smallWorld();
    const s = w.state;
    openChest(w, T0);
    claimChest(w, T0, {});
    const later = T0 + 10 * C.cooldownMs; // long enough for far more than three
    expect(openChest(w, later)).toHaveLength(C.store);
    expect(s.chest.stored).toBe(0);
    expect(s.chest.readyAt).toBe(later + C.cooldownMs); // the timer stopped while full, so it starts again now
  });

  it('keeps the progress toward the next chest when opening before it is full', () => {
    const w = smallWorld();
    const s = w.state;
    openChest(w, T0);
    claimChest(w, T0, {});
    expect(openChest(w, T0 + 2.5 * C.cooldownMs)).toHaveLength(2);
    claimChest(w, T0 + 2.5 * C.cooldownMs, {});
    expect(s.chest.readyAt).toBe(T0 + 3 * C.cooldownMs);
  });

  it('applies nothing until the rewards are claimed, and unclaimed chests open again to the same rewards', () => {
    const w = smallWorld();
    const s = w.state;
    rigRoll(s, 'windfall');
    const wood = s.resources.wood;
    expect(openChest(w, T0)).toEqual(['windfall']);
    expect(s.resources.wood).toBe(wood);
    const rng = s.rng;
    expect(openChest(w, T0 + 5)).toEqual(['windfall']); // no new roll, and the cooldown isn't restarted
    expect(s.rng).toBe(rng);
    expect(s.chest.readyAt).toBe(T0 + C.cooldownMs);
    expect(claimChest(w, T0 + 5, {})!.rewards).toEqual(['windfall']);
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
    expect(openChest(w, T0)).toEqual(['speed5']);
    expect(chestSpeed(s)).toBe(1);
    claimChest(w, T0, {}); // the boost runs from the claim, not the click
    expect(chestSpeed(s)).toBe(C.boosts.speed5.mult);
    expect(expireBoosts(s.chest, T0 + sec('speed5') - 1)).toEqual([]);
    expect(expireBoosts(s.chest, T0 + sec('speed5'))).toHaveLength(1);
    expect(s.chest.boosts).toEqual([]);
    expect(chestSpeed(s)).toBe(1);
  });

  it('two of the same boost add their time instead of stacking', () => {
    const w = smallWorld();
    const s = w.state;
    s.chest.stored = 2;
    win(w, T0, 'bountiful', 'bountiful');
    expect(s.chest.boosts).toEqual([{ kind: 'bountiful', until: T0 + 2 * sec('bountiful'), ms: 2 * sec('bountiful') }]);
    expect(chestMult(s, 'bountiful')).toBe(C.boosts.bountiful.mult);
  });

  it('different kinds run side by side', () => {
    const w = smallWorld();
    const s = w.state;
    s.chest.stored = 2;
    win(w, T0, 'speed3', 'bountiful');
    expect(chestSpeed(s)).toBe(C.boosts.speed3.mult);
    expect(chestMult(s, 'bountiful')).toBe(C.boosts.bountiful.mult);
  });

  it('speed boosts never run together: they queue fastest first, and a slower one running resumes after', () => {
    const w = smallWorld();
    const s = w.state;
    win(w, T0, 'speed2');
    const now = T0 + 60_000;
    s.chest.stored = 1; // a second chest, opened while the ×2 runs
    win(w, now, 'speed5');
    expect(s.chest.boosts.map((b) => b.kind)).toEqual(['speed5', 'speed2']);
    const five = now + sec('speed5');
    expect(s.chest.boosts[0].until).toBe(five);
    expect(s.chest.boosts[1]).toEqual({ kind: 'speed2', until: five + sec('speed2') - 60_000, ms: sec('speed2') - 60_000 });
    expect(chestSpeed(s)).toBe(C.boosts.speed5.mult);
    expect(chestMult(s, 'speed2')).toBe(1); // queued, not running
    expireBoosts(s.chest, five);
    expect(chestSpeed(s)).toBe(C.boosts.speed2.mult);
  });

  it('offline catch-up gets the speed of each stretch, ending where each boost ran out', () => {
    const w = smallWorld();
    const s = w.state;
    s.chest.stored = 3;
    win(w, T0, 'speed2', 'speed5', 'bountiful');
    const five = T0 + sec('speed5');
    const two = five + sec('speed2');
    expect(chestTimeline(s.chest, T0, two + 1000)).toEqual([
      { end: five, speed: C.boosts.speed5.mult },
      { end: T0 + sec('bountiful'), speed: C.boosts.speed2.mult }, // Bountiful ends partway through the ×2
      { end: two, speed: C.boosts.speed2.mult },
      { end: two + 1000, speed: 1 },
    ]);
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
    s.chest.boosts = [{ kind: 'taps', until: Infinity, ms: 1 }];
    expect(tap()).toBeCloseTo(plain * C.boosts.taps.mult);
  });

  it('Bountiful doubles gathering and walking without touching the clock', () => {
    const w = smallWorld(20, 2);
    const s = w.state;
    const before = getStats(s);
    s.chest.boosts = [{ kind: 'bountiful', until: Infinity, ms: 1 }];
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
    const { rewards, paid } = claimChest(w, T0, { wood: 0.5, food: 100, gold: 40 })!;
    expect(rewards).toEqual(['windfall']);
    expect(paid).toEqual({ wood: C.windfall.minWood, food: 600 * C.windfall.minutes, gold: 40 * C.windfall.minutes });
    expect(s.resources.wood).toBe(wood + C.windfall.minWood);
    expect(s.resources.gold).toBe(40 * C.windfall.minutes);
    expect(s.chest.boosts).toEqual([]);
  });

  it('two Windfalls opened together pay twice', () => {
    const w = smallWorld();
    w.state.chest.stored = 2;
    expect(win(w, T0, 'windfall', 'windfall').paid).toEqual({ wood: 2 * C.windfall.minWood });
  });

  it('keeps its chests and boosts across a rebuild', () => {
    const w = smallWorld(30, 2);
    w.state.skills = { sharpAxes: 2, powerSwing: 2, momentum: 3, keenEyes: 2, heartwood: 3, swiftFeet: 2, bigBaskets: 2 };
    w.state.chest = { stored: 2, readyAt: T0, boosts: [{ kind: 'speed2', until: T0 + 5, ms: 5 }], pending: ['taps'] };
    expect(prestige(w, 'masterHarvest')!.chest).toEqual(w.state.chest);
  });

  it('round-trips through a save; v21 and v20 saves migrate', () => {
    const w = smallWorld();
    w.state.chest = { stored: 2, readyAt: T0, boosts: [{ kind: 'bountiful', until: T0 + 9, ms: 9 }], pending: ['speed3', 'taps'] };
    expect(deserialize(serialize(w.state)).state.chest).toEqual(w.state.chest);
    const v21 = JSON.parse(serialize(w.state));
    v21.version = 21;
    v21.state.chest = { readyAt: T0, boost: { kind: 'speed3', until: T0 + 9 }, pending: 'windfall' };
    expect(deserialize(JSON.stringify(v21)).state.chest).toEqual({
      stored: 0, readyAt: T0, boosts: [{ kind: 'speed3', until: T0 + 9, ms: sec('speed3') }], pending: ['windfall'],
    });
    v21.state.chest = { readyAt: 0, boost: null, pending: null }; // ready to open
    expect(deserialize(JSON.stringify(v21)).state.chest).toEqual({ stored: 1, readyAt: 0, boosts: [], pending: [] });
    const v20 = JSON.parse(serialize(w.state));
    v20.version = 20;
    delete v20.state.chest;
    expect(deserialize(JSON.stringify(v20)).state.chest).toEqual({ stored: 1, readyAt: 0, boosts: [], pending: [] });
  });
});

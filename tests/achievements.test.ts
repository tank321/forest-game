import { expect, it } from 'vitest';
import { ACHIEVEMENT_IDS, lifetime, TOTAL_TIERS } from '../src/core/achievements';
import { prestige } from '../src/core/commands';
import { deserialize, serialize } from '../src/core/save';
import { tick } from '../src/core/sim';
import { smallWorld } from './helpers';

const earnedFx = (w: ReturnType<typeof smallWorld>) => w.fx.filter((f) => f.kind === 'achievement').map((f) => [f.id, f.n]);

it('records a crossed tier once, at the highest tier reached', () => {
  const w = smallWorld(20, 0);
  w.state.treesChopped = 150; // past the 10 and 100 tiers at once
  tick(w, 1);
  expect(w.state.career.earned.trees).toBe(2);
  expect(earnedFx(w)).toContainEqual(['trees', 2]);
  w.fx.length = 0;
  tick(w, 1);
  expect(earnedFx(w)).toEqual([]);
});

it('carries achievements and lifetime counters across a rebuild', () => {
  const w = smallWorld(30, 6);
  const s = w.state;
  s.skills = { sharpAxes: 2, powerSwing: 2, momentum: 3, keenEyes: 2, heartwood: 3, swiftFeet: 2, bigBaskets: 2 };
  s.treesChopped = 40;
  s.counts.taps = 12;
  s.career.past.trees = 100;
  s.career.past.pop = 1;
  s.career.earned = { taps: 1 };
  const next = prestige(w, 'masterHarvest')!;
  expect(next.career.earned).toEqual({ taps: 1 });
  expect(next.career.past.trees).toBe(140); // summed
  expect(next.career.past.taps).toBe(12);
  expect(next.career.past.pop).toBe(s.villagers.length); // best run
  expect(next.counts.taps).toBe(0);
  expect(lifetime(next, 'trees')).toBe(140);
});

it('migrates a v17 save to v18 with an empty career and the relics collected so far', () => {
  const w = smallWorld(30, 1);
  w.state.relicsSpawned = 3;
  w.state.relics = [5];
  const old = JSON.parse(serialize(w.state, 5));
  old.version = 17;
  delete old.state.counts;
  delete old.state.career;
  const { state } = deserialize(JSON.stringify(old));
  expect(state.counts.relics).toBe(2);
  expect(state.counts.taps).toBe(0);
  expect(state.career.earned).toEqual({});
  expect(Object.values(state.career.past).every((n) => n === 0)).toBe(true);
});

it('has the achievements and tiers the changelog lists', () => {
  expect(ACHIEVEMENT_IDS).toHaveLength(42);
  expect(TOTAL_TIERS).toBe(102);
});

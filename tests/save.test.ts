import { expect, it } from 'vitest';
import { toggleMark } from '../src/core/commands';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { createWorld } from '../src/core/world';
import { smallWorld } from './helpers';

it('round-trips mid-simulation state and continues identically', () => {
  const a = smallWorld(30, 4);
  simulate(a, 123.4, 1 / 30);
  toggleMark(a, (a.state.origin.y - 2) * a.state.w + a.state.origin.x);
  const { state, savedAt } = deserialize(serialize(a.state, 42));
  expect(savedAt).toBe(42);
  expect(state).toEqual(a.state);
  const b = createWorld(state);
  expect(b.fog).toEqual(a.fog);
  simulate(a, 300, 1);
  simulate(b, 300, 1);
  expect(b.state).toEqual(a.state);
});

it('rejects saves from an incompatible version', () => {
  expect(() => deserialize(JSON.stringify({ version: 1, savedAt: 0, state: {} }))).toThrow(/incompatible/);
});

it('migrates a v2 save to v3', () => {
  const a = smallWorld(30, 1);
  simulate(a, 60, 1);
  const v3 = JSON.parse(serialize(a.state, 7));
  const { skills: _1, totals: _2, treesChopped: _3, relics: _4, relicsSpawned: _5, nextRelicAt: _6, cards: _7, picksPending: _8, ...v2state } = v3.state;
  const { state } = deserialize(JSON.stringify({ version: 2, savedAt: 7, state: v2state }));
  expect(state.treesChopped).toBe(a.state.treesChopped);
  expect(state.relics).toEqual([]);
  expect(state.totals.wood).toBe(a.state.resources.wood);
});

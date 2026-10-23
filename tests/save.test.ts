import { expect, it } from 'vitest';
import { toggleMark } from '../src/core/commands';
import { addBuilding } from '../src/core/buildings';
import { buildingRefund } from '../src/core/economy';
import { linkedBuildings } from '../src/core/roads';
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

it('migrates v5 building costs from build order and saved discounts, then preserves payments', () => {
  const w = smallWorld();
  w.state.skills = { masterBuilders: 1, masons: 1 };
  addBuilding(w.state, 'well', 0, 0);
  addBuilding(w.state, 'well', 1, 0);
  const old = JSON.parse(serialize(w.state, 123));
  old.version = 5;
  for (const b of old.state.buildings) delete b.paidCost;
  const { state, savedAt } = deserialize(JSON.stringify(old));
  expect(savedAt).toBe(123);
  expect(state.buildings.map((b) => b.paidCost)).toEqual([{}, { wood: 120, stone: 27 }, { wood: 180, stone: 41 }]);
  state.skills = {};
  expect(buildingRefund(state.buildings[1])).toEqual({ wood: 60, stone: 13 });
  expect(deserialize(serialize(state)).state).toEqual(state);
});

it('migrates a v8 save to v9 with no gold', () => {
  const w = smallWorld(30, 1);
  simulate(w, 60, 1);
  const old = JSON.parse(serialize(w.state, 9));
  old.version = 8;
  delete old.state.resources.gold;
  delete old.state.totals.gold;
  const { state } = deserialize(JSON.stringify(old));
  expect(state.resources).toEqual({ ...w.state.resources, gold: 0 });
  expect(state.totals).toEqual({ ...w.state.totals, gold: 0 });
});

it('migrates a v13 save to v14 unchanged, its buildings isolated until roads reach them', () => {
  const w = smallWorld(30, 1);
  const farm = addBuilding(w.state, 'farm', 4, 13);
  const old = JSON.parse(serialize(w.state, 5));
  old.version = 13;
  const { state } = deserialize(JSON.stringify(old));
  expect(state).toEqual(w.state);
  expect(linkedBuildings(state).has(farm.id)).toBe(false);
});

it('migrates a v14 save to v15 with an empty Legacy', () => {
  const w = smallWorld(30, 1);
  const old = JSON.parse(serialize(w.state, 5));
  old.version = 14;
  delete old.state.legacy;
  expect(deserialize(JSON.stringify(old)).state.legacy).toEqual({ runs: 0, perks: {} });
});

it('migrates a v12 save to v13, unlocking the building kinds it already has', () => {
  const w = smallWorld(30, 1);
  addBuilding(w.state, 'quarry', 0, 0);
  addBuilding(w.state, 'market', 2, 0);
  addBuilding(w.state, 'farm', 4, 0);
  w.state.skills = { stonecutters: 2 };
  const old = JSON.parse(serialize(w.state));
  old.version = 12;
  expect(deserialize(JSON.stringify(old)).state.skills).toEqual({ stonecutters: 2, quarrying: 1, markets: 1 });
});

it('migrates a v9 save to v10, renaming leather to cloth', () => {
  const w = smallWorld(30, 1);
  addBuilding(w.state, 'house', 0, 0, { wood: 100, cloth: 20 });
  addBuilding(w.state, 'well', 1, 0, { wood: 150, stone: 40 });
  w.state.skills = { wells: 1 }; // granted by the v13 migration
  w.state.resources.cloth = 7;
  w.state.totals.cloth = 9;
  w.state.hires.cloth = 2;
  const old = JSON.parse(serialize(w.state, 9).replaceAll('"cloth"', '"leather"'));
  old.version = 9;
  const { state } = deserialize(JSON.stringify(old));
  expect(state).toEqual(w.state);
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

import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { addBuilding } from '../src/core/buildings';
import { villagerCost } from '../src/core/economy';
import { deserialize, serialize } from '../src/core/save';
import { WINTER } from '../src/core/seasons';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import { onBuildingsChanged, type World } from '../src/core/world';
import { clearArea, pave, smallWorld } from './helpers';

const F = CONFIG.skills.families;

/** A town of `villagers` with Growing Families at `level`, food enough for a surplus and no relics. */
function town(level: number, villagers = 2): World {
  const w = smallWorld(30, villagers);
  w.state.skills.growingFamilies = level;
  w.state.nextRelicAt = Infinity;
  w.state.resources.food = 1e6;
  return w;
}

/** Adds `n` Houses in a row north of the clearing, connected by road. */
function houses(w: World, n: number): World {
  clearArea(w, 2, 9, 27, 11);
  for (let k = 0; k < n; k++) addBuilding(w.state, 'house', 4 + 2 * k, 9);
  pave(w);
  onBuildingsChanged(w);
  return w;
}

describe('Growing Families', () => {
  it('brings no one without the skill', () => {
    const w = town(0);
    simulate(w, 2 * F.seconds, 1);
    expect(w.state.villagers).toHaveLength(2);
    expect(w.state.births).toBe(0);
  });

  it('brings a villager every 15 minutes, sooner with more Houses', () => {
    const w = town(1);
    simulate(w, F.seconds - 1, 1 / 30);
    expect(w.state.villagers).toHaveLength(2);
    simulate(w, 2, 1 / 30);
    expect(w.state.villagers).toHaveLength(3);
    expect(w.state.births).toBeLessThan(0.01);

    houses(w, 10);
    expect(getStats(w.state).birthRate).toBeCloseTo((1 + 10 * F.perHouse) / F.seconds);
    simulate(w, F.seconds / (1 + 10 * F.perHouse) + 1, 1);
    expect(w.state.villagers).toHaveLength(4);
  });

  it('gives the same births at both step sizes', () => {
    const a = town(1);
    const b = town(1);
    simulate(a, 2.5 * F.seconds, 1 / 30);
    simulate(b, 2.5 * F.seconds, 1);
    expect(a.state.villagers).toHaveLength(4);
    expect(b.state.villagers).toHaveLength(4);
    expect(a.state.births).toBeCloseTo(b.state.births);
  });

  it('waits, keeping its progress, while the town is full or short of a food surplus', () => {
    const w = town(1, 4);
    simulate(w, F.seconds / 2, 1);
    const half = w.state.births;
    expect(half).toBeCloseTo(0.5);

    w.state.resources.food = CONFIG.skills.wellFed.perVillager * 4 - 1; // just short of a surplus
    simulate(w, F.seconds, 1);
    expect(w.state.births).toBe(half);
    expect(w.state.villagers).toHaveLength(4);

    w.state.resources.food = 1e6;
    simulate(w, F.seconds / 2 + 1, 1);
    expect(w.state.villagers).toHaveLength(5); // the population cap
    simulate(w, 2 * F.seconds, 1);
    expect(w.state.villagers).toHaveLength(5);
  });

  it('are not hires: villager prices stay put', () => {
    const w = town(1);
    const price = villagerCost(w.state);
    const hires = { ...w.state.hires };
    simulate(w, F.seconds + 1, 1);
    expect(w.state.villagers).toHaveLength(3);
    expect(w.state.hires).toEqual(hires);
    expect(villagerCost(w.state)).toEqual(price);
  });
});

describe('Spring Births', () => {
  /** Runs the last half second of winter into spring (the same winter each time). */
  const winterEnds = (w: World) => {
    w.state.time = (WINTER + 1) * CONFIG.seasons.length - 0.5;
    w.fx.length = 0;
    simulate(w, 1, 1);
  };

  it('brings 1 villager per 5 Houses as spring begins, with level 2 only', () => {
    const one = houses(town(1), 10);
    winterEnds(one);
    expect(one.state.villagers).toHaveLength(2);

    const two = houses(town(2), 10);
    expect(getStats(two.state).springBirths).toBe(2);
    winterEnds(two);
    expect(two.state.villagers).toHaveLength(4);
    expect(two.fx.filter((f) => f.kind === 'springBirths')).toEqual([{ kind: 'springBirths', i: -1, n: 2 }]);
  });

  it('brings at least one, room and a food surplus allowing', () => {
    const w = town(2, 4);
    expect(getStats(w.state).springBirths).toBe(1);
    w.state.resources.food = 0;
    winterEnds(w);
    expect(w.state.villagers).toHaveLength(4);
    w.state.resources.food = 1e6;
    winterEnds(w);
    expect(w.state.villagers).toHaveLength(5);
    winterEnds(w); // full
    expect(w.state.villagers).toHaveLength(5);
  });
});

it('migrates a v26 save with no progress toward a birth', () => {
  const w = smallWorld(30, 1);
  const old = JSON.parse(serialize(w.state, 7));
  old.version = 26;
  delete old.state.births;
  expect(deserialize(JSON.stringify(old)).state.births).toBe(0);
});

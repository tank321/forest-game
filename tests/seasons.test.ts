import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { placeBuilding } from '../src/core/commands';
import { deserialize, serialize } from '../src/core/save';
import { seasonLeft, seasonOf, WINTER } from '../src/core/seasons';
import { simulate, tick } from '../src/core/sim';
import { spawnVillager } from '../src/core/state';
import { getStats } from '../src/core/stats';
import type { World } from '../src/core/world';
import { seasonEffects } from '../src/ui/seasonInfo';
import { clearArea, smallWorld } from './helpers';

const L = CONFIG.seasons.length;
const WINTER_AT = WINTER * L;

/** `villagers` (past the population cap if need be), a stocked town and no relics. */
function town(villagers: number, time = 0): World {
  const w = smallWorld(30);
  for (let k = 0; k < villagers; k++) spawnVillager(w.state);
  w.state.nextRelicAt = Infinity;
  w.state.time = time;
  w.state.resources = { wood: 100, food: 100, stone: 0, cloth: 0, gold: 0 };
  return w;
}

/** Town with a farm west of the clearing; its farmer is one of the villagers. */
function withFarm(villagers: number, time = 0): World {
  const w = town(villagers, time);
  const { x, y } = w.state.origin;
  clearArea(w, x - 3, y, x - 1, y + 2);
  w.state.resources.wood += 250;
  expect(placeBuilding(w, 'farm', x - 3, y)).toBe(true);
  w.state.resources.food = 0;
  return w;
}

describe('seasons', () => {
  it('cycles spring → winter from simulated time', () => {
    expect([0, L - 0.01, L, 2 * L, WINTER_AT, 4 * L].map(seasonOf)).toEqual([0, 0, 1, 2, 3, 0]);
    expect(seasonLeft(0)).toBe(L);
    expect(seasonLeft(L - 0.5)).toBeCloseTo(0.5);
  });

  it('splits a step at the season boundary', () => {
    const w = town(8, WINTER_AT - 0.5);
    tick(w, 1);
    expect(w.state.time).toBeCloseTo(WINTER_AT + 0.5);
    const extra = 8 - CONFIG.upkeep.freeVillagers;
    expect(w.state.resources.food).toBeCloseTo(100 - extra * CONFIG.upkeep.food);
    expect(w.state.resources.wood).toBeCloseTo(100 - 0.5 * extra * CONFIG.upkeep.wood); // burned only after the boundary
  });

  it('farms lie fallow in winter and harvest ×1.5 in autumn', () => {
    const rate = (t: number) => getStats(town(1, t).state).farmRate;
    expect(rate(2 * L) / rate(0)).toBeCloseTo(1.5);
    expect(rate(WINTER_AT)).toBe(0);
    const w = withFarm(2, WINTER_AT);
    simulate(w, L - 1, 1);
    expect(w.state.resources.food).toBe(0);
    expect(w.state.totals.food).toBe(0);
  });
});

describe('season effects text', () => {
  it('describes farms and the town upkeep for each season', () => {
    const small = getStats(town(2).state);
    expect(seasonEffects(small, 0)).toEqual([
      'Farms and orchards harvest normally',
      'No food upkeep yet (the first 5 villagers are free)',
      'No firewood needed',
    ]);
    expect(seasonEffects(small, WINTER)[2]).toBe('No firewood needed yet');
    const big = getStats(town(8).state); // spring stats still describe winter's burn
    expect(seasonEffects(big, 2)[0]).toBe('Farms and orchards harvest ×1.5');
    expect(seasonEffects(big, WINTER)).toEqual([
      'Farms and orchards lie fallow',
      'Villagers eat 0.30 food/s',
      'Fires burn 0.30 wood/s',
      'Out of food: chopping and mining ×0.5',
      'Out of firewood: farming, mining, herding and picking ×0.5',
    ]);
  });
});

describe('upkeep', () => {
  it('the first villagers live for free', () => {
    const w = town(CONFIG.upkeep.freeVillagers, WINTER_AT);
    const st = getStats(w.state);
    expect([st.eat, st.burn]).toEqual([0, 0]);
    simulate(w, 1, 1);
    expect(w.state.resources.food).toBe(100);
  });

  it('extra villagers eat all year and burn wood only in winter, never below 0', () => {
    const extra = 3;
    const w = town(5 + extra);
    expect(getStats(w.state).eat).toBeCloseTo(extra * CONFIG.upkeep.food);
    expect(getStats(w.state).burn).toBe(0);
    w.state.resources.food = 0.1;
    simulate(w, 10, 1 / 30);
    expect(w.state.resources.food).toBe(0);
    expect(getStats(w.state).hungry).toBe(true);
    w.state.time = WINTER_AT;
    expect(getStats(w.state).burn).toBeCloseTo(extra * CONFIG.upkeep.wood);
  });

  it('coats cut the firewood burned', () => {
    const w = town(8, WINTER_AT);
    const base = getStats(w.state).burn;
    w.state.upgrades.coats = 2;
    expect(getStats(w.state).burn).toBeCloseTo(base * 0.5);
    expect(getStats(w.state).winterBurn).toBeCloseTo(base * 0.5);
  });

  it('hunger slows chopping and mining; cold slows farming, mining and herding', () => {
    const w = town(8, WINTER_AT - 1); // autumn: farms work, nothing burns yet
    const fed = getStats(w.state);
    w.state.resources.food = 0;
    const hungry = getStats(w.state);
    expect(hungry.hungry).toBe(true);
    expect(hungry.chopRate).toBeCloseTo(fed.chopRate * CONFIG.upkeep.hungry);
    expect(hungry.mineRate).toBeCloseTo(fed.mineRate * CONFIG.upkeep.hungry);
    expect([hungry.farmRate, hungry.herdRate]).toEqual([fed.farmRate, fed.herdRate]);

    w.state.resources = { wood: 0, food: 100, stone: 0, cloth: 0, gold: 0 };
    w.state.time = WINTER_AT;
    const warm = getStats({ ...w.state, resources: { ...w.state.resources, wood: 1 } });
    const cold = getStats(w.state);
    expect(cold.cold).toBe(true);
    expect(cold.chopRate).toBe(warm.chopRate);
    expect(cold.mineRate).toBeCloseTo(warm.mineRate * CONFIG.upkeep.cold);
    expect(cold.herdRate).toBeCloseTo(warm.herdRate * CONFIG.upkeep.cold);
  });

  it('is independent of step size over a full year', () => {
    const a = withFarm(8);
    const b = withFarm(8);
    simulate(a, 4 * L, 1 / 30);
    simulate(b, 4 * L, 1);
    const close = (x: number, y: number) => expect(Math.abs(x - y)).toBeLessThanOrEqual(0.01 * Math.max(x, y) + 1);
    close(b.state.totals.food, a.state.totals.food);
    close(b.state.totals.wood, a.state.totals.wood);
    close(b.state.resources.food, a.state.resources.food);
    close(b.state.resources.wood, a.state.resources.wood);
  });

  it('migrates a v7 save to v8 with no coats', () => {
    const w = town(2);
    const old = JSON.parse(serialize(w.state, 1));
    old.version = 7;
    delete old.state.upgrades.coats;
    expect(deserialize(JSON.stringify(old)).state.upgrades).toEqual({ axe: 0, farm: 0, pick: 0, coats: 0 });
  });
});

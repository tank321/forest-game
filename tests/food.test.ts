import { describe, expect, it } from 'vitest';
import { hireVillager, placeBuilding, togglePause, upgrade } from '../src/core/commands';
import { buildingCost, upgradeCost, villagerCost } from '../src/core/economy';
import { pathHome } from '../src/core/pathing';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import type { World } from '../src/core/world';
import { clearArea, smallWorld, totalWood } from './helpers';

/** Small world with a cleared 3×3 west of the clearing and a farm on it. */
function withFarm(villagers = 2, seed = 1): { w: World; farmId: number } {
  const w = smallWorld(30, villagers, seed);
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  clearArea(w, x - 3, y, x - 1, y + 2);
  s.resources.wood = 250;
  s.resources.food = 0;
  expect(placeBuilding(w, 'farm', x - 3, y)).toBe(true);
  return { w, farmId: s.buildings[s.buildings.length - 1].id };
}

describe('farms', () => {
  it('take exactly one empty-handed villager and produce food', () => {
    const { w, farmId } = withFarm(3);
    const s = w.state;
    simulate(w, 120, 1 / 30);
    const farmers = s.villagers.filter((v) => v.job === 'farm');
    expect(farmers).toHaveLength(1);
    expect(farmers[0].workplace).toBe(farmId);
    expect(s.resources.food).toBeGreaterThan(0);
    expect(s.resources.food).toBeLessThanOrEqual(120 * getStats(s).farmRate);
    expect(s.totals.food).toBe(s.resources.food);
  });

  it('never loses wood when a lumberjack becomes a farmer', () => {
    const w = smallWorld(30, 3);
    const s = w.state;
    s.nextRelicAt = Infinity;
    const { x, y } = s.origin;
    clearArea(w, x - 3, y, x - 1, y + 2);
    simulate(w, 20, 1 / 30); // lumberjacks mid-trip
    s.resources.wood += 250;
    const total = totalWood(w);
    placeBuilding(w, 'farm', x - 3, y);
    simulate(w, 200, 1 / 30);
    expect(totalWood(w) + 250).toBeCloseTo(total, 6);
  });

  it('pausing returns the farmer to lumberjacking; resuming re-staffs', () => {
    const { w, farmId } = withFarm(2);
    const s = w.state;
    simulate(w, 30, 1 / 30);
    togglePause(w, farmId);
    simulate(w, 60, 1 / 30);
    expect(s.villagers.every((v) => v.job === 'lumber' && v.workplace === -1)).toBe(true);
    const food = s.resources.food;
    simulate(w, 30, 1 / 30);
    expect(s.resources.food).toBe(food);
    togglePause(w, farmId);
    simulate(w, 60, 1 / 30);
    expect(s.villagers.filter((v) => v.job === 'farm')).toHaveLength(1);
  });

  it('farmers deliver to the nearest food drop-off', () => {
    const { w } = withFarm(1);
    const s = w.state;
    const { x, y } = s.origin;
    const farmTile = (y + 1) * s.w + x - 3;
    expect(pathHome(w.fields.food, farmTile).length).toBeGreaterThan(2); // walks to the TC
    clearArea(w, x - 5, y, x - 4, y + 1);
    s.resources.wood = 150;
    expect(placeBuilding(w, 'barn', x - 5, y)).toBe(true);
    expect(pathHome(w.fields.food, farmTile)).toHaveLength(2); // barn is adjacent
    expect(w.fields.wood.dist[(y + 1) * s.w + x - 5]).not.toBe(0); // barns don't take wood
  });

  it('is independent of step size', () => {
    const a = withFarm(3, 4).w;
    const b = withFarm(3, 4).w;
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(b.state.resources.food).toBeCloseTo(a.state.resources.food, 3);
    expect(b.state.resources.wood).toBeCloseTo(a.state.resources.wood, 3);
  });
});

describe('food economy', () => {
  it('food hires use their own price track', () => {
    const w = smallWorld(30);
    const s = w.state;
    s.resources.food = 1e6;
    expect(villagerCost(s, 'food')).toEqual({ food: 20 });
    expect(hireVillager(w, 'food')).toBe(true);
    expect(villagerCost(s, 'food')).toEqual({ food: 40 });
    expect(villagerCost(s, 'wood')).toEqual({ wood: 10 });
    expect(s.villagers).toHaveLength(1);
  });

  it('houses, axe and farm upgrades start costing food', () => {
    const s = smallWorld().state;
    expect(upgradeCost(s, 'axe', 3)).toEqual({ wood: 550 });
    expect(upgradeCost(s, 'axe', 4)).toEqual({ wood: 850, food: 300 });
    expect(upgradeCost(s, 'farm', 0)).toEqual({ wood: 200 });
    expect(upgradeCost(s, 'farm', 9)).toEqual({ wood: 13000, food: 5000, stone: 1200, leather: 200 });
    expect(upgradeCost(s, 'farm', 10)).toBeNull();
    expect(buildingCost(s, 'house')).toEqual({ wood: 100 });
    for (let k = 0; k < 3; k++) s.buildings.push({ id: 900 + k, kind: 'house', x: 0, y: k, paidCost: {} });
    expect(buildingCost(s, 'house')).toEqual({ wood: 338, food: 50 });
  });

  it('farm upgrades and Green Thumbs raise harvest; Big Baskets raises farm carry', () => {
    const w = smallWorld();
    const s = w.state;
    const base = getStats(s);
    s.resources = { wood: 1e9, food: 1e9, stone: 1e9, leather: 1e9 };
    for (let k = 0; k < 10; k++) expect(upgrade(w, 'farm')).toBe(true);
    expect(upgrade(w, 'farm')).toBe(false);
    s.skills = { greenThumbs: 1, bigBaskets: 1 };
    const st = getStats(s);
    expect(st.farmRate).toBeCloseTo(base.farmRate * 1.05 ** 10 * 1.2);
    expect(st.farmCarry).toBeCloseTo((5 + 20 + 2) * 1.02 ** 10);
  });

  it('migrates a v3 save to v4', () => {
    const w = smallWorld(30, 2);
    const v4 = JSON.parse(serialize(w.state, 1));
    const { hires: _h, paused: _p, ...rest } = v4.state;
    const v3state = {
      ...rest,
      resources: { wood: 5 },
      totals: { wood: 9 },
      upgrades: { axe: 2 },
      villagers: rest.villagers.map(({ job: _j, workplace: _w, ...v }: Record<string, unknown>) => v),
    };
    const { state } = deserialize(JSON.stringify({ version: 3, savedAt: 1, state: v3state }));
    expect(state.resources).toEqual({ wood: 5, food: 0, stone: 0, leather: 0 });
    expect(state.upgrades).toEqual({ axe: 2, farm: 0, pick: 0 });
    expect(state.hires).toEqual({ wood: 2, food: 0, leather: 0 });
    expect(state.villagers.every((v) => v.job === 'lumber' && v.workplace === -1)).toBe(true);
  });
});

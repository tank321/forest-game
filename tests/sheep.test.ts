import { describe, expect, it } from 'vitest';
import { hireVillager, placeBuilding, removeBuilding, togglePause } from '../src/core/commands';
import { buildingCost, upgradeCost, villagerCost } from '../src/core/economy';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { availableSkills } from '../src/core/skills';
import { getStats } from '../src/core/stats';
import type { World } from '../src/core/world';
import { clearArea, smallWorld } from './helpers';

/** Small world with a cleared 3×3 west of the clearing and a sheep farm on it. */
function withSheepFarm(villagers = 2, seed = 1): { w: World; farmId: number } {
  const w = smallWorld(30, villagers, seed);
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  clearArea(w, x - 3, y, x - 1, y + 2);
  s.resources.wood = 600;
  s.resources.food = 150;
  expect(placeBuilding(w, 'sheepFarm', x - 3, y)).toBe(true);
  return { w, farmId: s.buildings[s.buildings.length - 1].id };
}

const totalLeather = (w: World) =>
  w.state.resources.leather + w.state.villagers.reduce((a, v) => a + (v.job === 'herd' ? v.carry : 0), 0);

describe('sheep farms', () => {
  it('take one empty-handed villager and deliver only leather to the Town Center', () => {
    const { w, farmId } = withSheepFarm(2);
    const s = w.state;
    expect(s.resources).toEqual({ wood: 0, food: 0, stone: 0, leather: 0 });
    simulate(w, 120, 1 / 30);
    const herders = s.villagers.filter((v) => v.job === 'herd');
    expect(herders).toHaveLength(1);
    expect(herders[0].workplace).toBe(farmId);
    expect(s.resources.leather).toBeGreaterThan(0);
    expect(s.resources.leather).toBeLessThanOrEqual(120 * getStats(s).herdRate);
    expect(s.totals.leather).toBe(s.resources.leather);
    expect(s.totals.food).toBe(0);
  });

  it('Fertile Herding delivers as much food as leather', () => {
    const { w } = withSheepFarm(1);
    const s = w.state;
    s.skills = { fertileHerding: 1 };
    simulate(w, 120, 1 / 30);
    expect(s.totals.leather).toBeGreaterThan(0);
    expect(s.totals.food).toBe(s.totals.leather);
  });

  it('pausing or removal returns the herder without losing carried leather', () => {
    for (const stop of [togglePause, removeBuilding]) {
      const { w, farmId } = withSheepFarm(1);
      const s = w.state;
      simulate(w, 30, 1 / 30); // herder mid-trip
      const total = totalLeather(w);
      expect(total).toBeGreaterThan(s.resources.leather);
      stop(w, farmId);
      simulate(w, 60, 1 / 30);
      expect(s.villagers.every((v) => v.job === 'lumber' && v.workplace === -1)).toBe(true);
      expect(s.resources.leather).toBeCloseTo(total, 6);
    }
  });

  it('is independent of step size', () => {
    const a = withSheepFarm(2, 4).w;
    const b = withSheepFarm(2, 4).w;
    a.state.skills = b.state.skills = { fertileHerding: 1 };
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(b.state.resources.leather).toBeCloseTo(a.state.resources.leather, 3);
    expect(b.state.resources.food).toBeCloseTo(a.state.resources.food, 3);
  });

  it('deliver to a nearer Barn, food included', () => {
    const w = smallWorld(30, 1);
    const s = w.state;
    s.nextRelicAt = Infinity;
    s.skills = { fertileHerding: 1 };
    const { x, y } = s.origin;
    clearArea(w, x - 9, y, x - 1, y + 2); // sheep farm far west, barn between it and the Town Center
    s.resources = { wood: 750, food: 150, stone: 0, leather: 0 };
    expect(placeBuilding(w, 'sheepFarm', x - 9, y)).toBe(true);
    expect(placeBuilding(w, 'barn', x - 6, y)).toBe(true);
    const barn = s.buildings[s.buildings.length - 1];
    expect(w.fields.leather.dist[barn.y * s.w + barn.x]).toBe(0);
    const herder = s.villagers[0];
    let delivered = false;
    for (let t = 0; t < 60 * 30 && !delivered; t++) {
      const carry = herder.carry;
      simulate(w, 1 / 30, 1 / 30);
      if (carry > 0 && herder.carry === 0) {
        delivered = true;
        expect(Math.max(Math.abs(herder.x - (barn.x + 1)), Math.abs(herder.y - (barn.y + 1)))).toBeLessThanOrEqual(1.5);
      }
    }
    expect(delivered).toBe(true);
    expect(s.resources.food).toBe(s.resources.leather);
  });

  it('Barn upgrades raise herding speed and carry', () => {
    const s = smallWorld().state;
    const base = getStats(s);
    s.upgrades.farm = 10;
    const st = getStats(s);
    expect(st.herdRate).toBeCloseTo(base.herdRate * 1.05 ** 10);
    expect(st.herdCarry).toBeCloseTo((10 + 20) * 1.02 ** 10);
  });

  it('Fertile Herding is offered without prerequisites', () => {
    expect(availableSkills(smallWorld().state)).toContain('fertileHerding');
  });
});

describe('leather economy', () => {
  it('leather hires use their own price track', () => {
    const w = smallWorld(30);
    const s = w.state;
    s.resources.leather = 1e6;
    expect(villagerCost(s, 'leather')).toEqual({ leather: 40 });
    expect(hireVillager(w, 'leather')).toBe(true);
    expect(villagerCost(s, 'leather')).toEqual({ leather: 80 });
    expect(villagerCost(s, 'wood')).toEqual({ wood: 10 });
    expect(villagerCost(s, 'food')).toEqual({ food: 20 });
  });

  it('the last two upgrade levels and houses from the 10th cost leather', () => {
    const s = smallWorld().state;
    expect(upgradeCost(s, 'axe', 7)?.leather).toBeUndefined();
    expect(upgradeCost(s, 'axe', 8)?.leather).toBe(50);
    expect(upgradeCost(s, 'farm', 9)?.leather).toBe(200);
    expect(upgradeCost(s, 'pick', 8)?.leather).toBe(80);
    for (let k = 0; k < 8; k++) s.buildings.push({ id: 900 + k, kind: 'house', x: 0, y: k, paidCost: {} });
    expect(buildingCost(s, 'house').leather).toBeUndefined();
    s.buildings.push({ id: 908, kind: 'house', x: 0, y: 8, paidCost: {} });
    expect(buildingCost(s, 'house').leather).toBe(20);
  });

  it('migrates a v6 save to v7', () => {
    const w = smallWorld(30, 2);
    const v7 = JSON.parse(serialize(w.state, 1));
    const v6state = {
      ...v7.state,
      resources: { wood: 5, food: 3, stone: 2 },
      totals: { wood: 9, food: 4, stone: 2 },
      hires: { wood: 2, food: 1 },
    };
    const { state } = deserialize(JSON.stringify({ version: 6, savedAt: 1, state: v6state }));
    expect(state.resources).toEqual({ wood: 5, food: 3, stone: 2, leather: 0 });
    expect(state.totals).toEqual({ wood: 9, food: 4, stone: 2, leather: 0 });
    expect(state.hires).toEqual({ wood: 2, food: 1, leather: 0 });
  });
});

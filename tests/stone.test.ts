import { describe, expect, it } from 'vitest';
import { placeBuilding, togglePause, upgrade } from '../src/core/commands';
import { buildingCost, upgradeCost } from '../src/core/economy';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { availableSkills } from '../src/core/skills';
import { getStats } from '../src/core/stats';
import type { World } from '../src/core/world';
import { clearArea, pave, smallWorld, unlockBuildings } from './helpers';

/** Small world with a cleared 2×2 west of the clearing and a quarry on it. */
function withQuarry(villagers = 3, seed = 1): { w: World; quarryId: number } {
  const w = unlockBuildings(smallWorld(30, villagers, seed));
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  clearArea(w, x - 2, y, x - 1, y + 1);
  s.resources.wood = 400;
  expect(placeBuilding(w, 'quarry', x - 2, y)).toBe(true);
  pave(w);
  return { w, quarryId: s.buildings[s.buildings.length - 1].id };
}

const totalStone = (w: World) =>
  w.state.resources.stone + w.state.villagers.reduce((a, v) => a + (v.job === 'mine' ? v.carry : 0), 0);

describe('quarries', () => {
  it('take two empty-handed villagers and deliver stone to the Town Center', () => {
    const { w, quarryId } = withQuarry(3);
    const s = w.state;
    simulate(w, 120, 1 / 30);
    const miners = s.villagers.filter((v) => v.job === 'mine');
    expect(miners).toHaveLength(2);
    expect(miners.every((v) => v.workplace === quarryId)).toBe(true);
    expect(s.resources.stone).toBeGreaterThan(0);
    expect(s.resources.stone).toBeLessThanOrEqual(2 * 120 * getStats(s).mineRate);
    expect(s.totals.stone).toBe(s.resources.stone);
    expect(w.fields.stone.dist[s.buildings[0].y * s.w + s.buildings[0].x]).toBe(0); // TC takes stone
  });

  it('pausing returns miners to lumberjacking without losing carried stone', () => {
    const { w, quarryId } = withQuarry(2);
    const s = w.state;
    simulate(w, 37, 1 / 30); // miners mid-trip
    const total = totalStone(w);
    expect(total).toBeGreaterThan(s.resources.stone); // someone is carrying
    togglePause(w, quarryId);
    simulate(w, 60, 1 / 30);
    expect(s.villagers.every((v) => v.job === 'lumber' && v.workplace === -1)).toBe(true);
    expect(s.resources.stone).toBeCloseTo(total, 6);
  });

  it('is independent of step size', () => {
    const a = withQuarry(3, 4).w;
    const b = withQuarry(3, 4).w;
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(b.state.resources.stone).toBeCloseTo(a.state.resources.stone, 3);
  });

  it('pick upgrades cost stone and raise mining', () => {
    const w = smallWorld();
    const s = w.state;
    expect(upgradeCost(s, 'pick', 0)).toEqual({ wood: 300 });
    expect(upgradeCost(s, 'pick', 1)).toEqual({ wood: 500, stone: 50 });
    expect(upgradeCost(s, 'pick', 10)).toEqual({ wood: 17550, stone: 4050, cloth: 270 }); // past the table: ×1.35
    const base = getStats(s);
    s.resources = { wood: 1e9, food: 0, stone: 1e9, cloth: 1e9, gold: 0 };
    for (let k = 0; k < 10; k++) expect(upgrade(w, 'pick')).toBe(true);
    const st = getStats(s);
    expect(st.mineRate).toBeCloseTo(base.mineRate * 1.05 ** 10);
    expect(st.mineCarry).toBeCloseTo((5 + 20) * 1.02 ** 10);
    expect(upgrade(w, 'pick')).toBe(true); // past the table
    expect(getStats(s).mineRate).toBeCloseTo(st.mineRate * 1.15);
    expect(getStats(s).mineCarry).toBeCloseTo(st.mineCarry * 1.15);
  });

  it('late axe and farm levels and houses from the 7th cost stone', () => {
    const s = smallWorld().state;
    expect(upgradeCost(s, 'axe', 5)).toEqual({ wood: 1300, food: 500 });
    expect(upgradeCost(s, 'axe', 6)).toEqual({ wood: 2000, food: 800, stone: 100 });
    expect(upgradeCost(s, 'farm', 6)).toEqual({ wood: 4000, food: 1600, stone: 150 });
    for (let k = 0; k < 5; k++) s.buildings.push({ id: 900 + k, kind: 'house', x: 0, y: k, paidCost: {}, tally: {} });
    expect(buildingCost(s, 'house').stone).toBeUndefined();
    s.buildings.push({ id: 905, kind: 'house', x: 0, y: 5, paidCost: {}, tally: {} });
    expect(buildingCost(s, 'house')).toEqual({ wood: 1139, food: 169, stone: 30 });
  });

  it('migrates a v4 save to v5', () => {
    const w = smallWorld(30, 1);
    const v5 = JSON.parse(serialize(w.state, 1));
    const v4state = {
      ...v5.state,
      resources: { wood: 5, food: 3 },
      totals: { wood: 9, food: 4 },
      upgrades: { axe: 2, farm: 1 },
    };
    const { state } = deserialize(JSON.stringify({ version: 4, savedAt: 1, state: v4state }));
    expect(state.resources).toEqual({ wood: 5, food: 3, stone: 0, cloth: 0, gold: 0 });
    expect(state.totals).toEqual({ wood: 9, food: 4, stone: 0, cloth: 0, gold: 0 });
    expect(state.upgrades).toEqual({ axe: 2, farm: 1, pick: 0, coats: 0, shoes: 0, backpack: 0, satchel: 0 });
  });

  it('Stonecutters speeds mining; Masons discounts only the stone part of costs', () => {
    const s = smallWorld().state;
    const base = getStats(s).mineRate;
    s.skills = { stonecutters: 2 };
    expect(getStats(s).mineRate).toBeCloseTo(base * 2);
    s.skills = { stonecutters: 1, masons: 2 };
    expect(upgradeCost(s, 'axe', 6)).toEqual({ wood: 2000, food: 800, stone: 56 }); // 100 × 0.75²
    expect(upgradeCost(s, 'axe', 0)).toEqual({ wood: 100 });
    expect(buildingCost(s, 'well')).toEqual({ wood: 150, stone: 23 }); // 40 × 0.75²
  });

  it('Quarry Crews is offered after Stonecutters, Masons after Quarrying', () => {
    const s = smallWorld().state;
    expect(availableSkills(s)).not.toContain('masons');
    expect(availableSkills(s)).not.toContain('quarryCrews');
    s.skills = { stonecutters: 1 };
    expect(availableSkills(s)).toContain('quarryCrews');
    expect(availableSkills(s)).not.toContain('masons');
    s.skills = { quarrying: 1 };
    expect(availableSkills(s)).toContain('masons');
  });

  it('Quarry Crews adds a miner per level', () => {
    const { w, quarryId } = withQuarry(5);
    const s = w.state;
    s.skills = { stonecutters: 1, quarryCrews: 2 };
    simulate(w, 60, 1 / 30);
    expect(s.villagers.filter((v) => v.workplace === quarryId)).toHaveLength(4);
  });
});

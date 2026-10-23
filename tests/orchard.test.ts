import { describe, expect, it } from 'vitest';
import { placeBuilding, removeBuilding, togglePause } from '../src/core/commands';
import { buildingCost } from '../src/core/economy';
import { WINTER } from '../src/core/seasons';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import type { World } from '../src/core/world';
import { CONFIG } from '../src/config';
import { clearArea, pave, smallWorld, unlockBuildings } from './helpers';

/** Small world with a cleared 5×5 west of the clearing and a fruit orchard on it. */
function withOrchard(villagers = 5, seed = 1): { w: World; id: number } {
  const w = unlockBuildings(smallWorld(30, villagers, seed));
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  clearArea(w, x - 5, y, x - 1, y + 4);
  s.resources.wood = 3000;
  s.resources.stone = 300;
  s.resources.cloth = 100;
  expect(placeBuilding(w, 'orchard', x - 5, y)).toBe(true);
  pave(w);
  return { w, id: s.buildings[s.buildings.length - 1].id };
}

const orchardFood = (w: World) =>
  w.state.resources.food + w.state.villagers.reduce((a, v) => a + (v.job === 'orchard' ? v.carry : 0), 0);

describe('fruit orchards', () => {
  it('take three empty-handed villagers and deliver food', () => {
    const { w, id } = withOrchard();
    const s = w.state;
    simulate(w, 120, 1 / 30);
    const workers = s.villagers.filter((v) => v.job === 'orchard');
    expect(workers).toHaveLength(3);
    expect(workers.every((v) => v.workplace === id)).toBe(true);
    expect(s.villagers.filter((v) => v.job === 'lumber')).toHaveLength(2);
    expect(s.resources.food).toBeGreaterThan(0);
    expect(s.totals.food).toBeLessThanOrEqual(120 * 3 * getStats(s).orchardRate);
  });

  it('walk ×2, harvest ×2 and carry ×5 a farmer, Barn upgrades and seasons included', () => {
    const s = smallWorld().state;
    for (const farm of [0, 10]) {
      s.upgrades.farm = farm;
      const st = getStats(s);
      expect(st.orchardSpeed).toBeCloseTo(st.speed * 2);
      expect(st.orchardRate).toBeCloseTo(st.farmRate * 2);
      expect(st.orchardCarry).toBeCloseTo(st.farmCarry * 5);
    }
    s.time = WINTER * CONFIG.seasons.length;
    expect(getStats(s).orchardRate).toBe(0);
  });

  it('orchardists walk at their own speed', () => {
    const { w } = withOrchard(1);
    const s = w.state;
    const v = s.villagers[0];
    simulate(w, 1 / 30, 1 / 30);
    expect(v.state).toBe('toWork');
    const [x, y] = [v.x, v.y];
    simulate(w, 0.2, 0.2);
    const st = getStats(s);
    expect(Math.hypot(v.x - x, v.y - y)).toBeGreaterThan(0.2 * st.speed * 1.5);
    expect(Math.hypot(v.x - x, v.y - y)).toBeLessThanOrEqual(0.2 * st.orchardSpeed + 1e-9);
  });

  it('pausing or removal returns the orchardists without losing carried food', () => {
    for (const stop of [togglePause, removeBuilding]) {
      const { w, id } = withOrchard(3);
      const s = w.state;
      simulate(w, 20, 1 / 30);
      while (orchardFood(w) === s.resources.food) simulate(w, 1, 1 / 30); // orchardists mid-trip
      const total = orchardFood(w);
      stop(w, id);
      simulate(w, 60, 1 / 30);
      expect(s.villagers.every((v) => v.job === 'lumber' && v.workplace === -1)).toBe(true);
      expect(s.resources.food).toBeCloseTo(total, 6);
    }
  });

  it('is independent of step size', () => {
    const a = withOrchard(3, 4).w;
    const b = withOrchard(3, 4).w;
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(a.state.totals.food).toBeGreaterThan(0);
    expect(b.state.totals.food).toBeCloseTo(a.state.totals.food, 3);
  });

  it('costs cloth', () => {
    const w = smallWorld(30);
    const s = w.state;
    expect(buildingCost(s, 'orchard')).toEqual({ wood: 3000, stone: 300, cloth: 100 });
    const { x, y } = s.origin;
    clearArea(w, x - 5, y, x - 1, y + 4);
    s.resources = { ...s.resources, wood: 3000, stone: 300, cloth: 99 };
    expect(placeBuilding(w, 'orchard', x - 5, y)).toBe(false);
  });
});

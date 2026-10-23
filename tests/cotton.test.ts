import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../src/core/buildings';
import { placeBuilding, removeBuilding, togglePause } from '../src/core/commands';
import { buildingCost } from '../src/core/economy';
import { tileAt } from '../src/core/grid';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import type { World } from '../src/core/world';
import { clearArea, smallWorld, unlockBuildings } from './helpers';

/** Small world with a cleared 6×6 west of the clearing and a cotton plantation on it. */
function withPlantation(villagers = 5, seed = 1): { w: World; id: number } {
  const w = unlockBuildings(smallWorld(30, villagers, seed));
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  clearArea(w, x - 6, y, x - 1, y + 5);
  s.resources.wood = 5000;
  s.resources.stone = 500;
  s.resources.gold = 250;
  expect(placeBuilding(w, 'cottonPlantation', x - 6, y)).toBe(true);
  return { w, id: s.buildings[s.buildings.length - 1].id };
}

const totalCloth = (w: World) =>
  w.state.resources.cloth + w.state.villagers.reduce((a, v) => a + (v.job === 'cotton' ? v.carry : 0), 0);

describe('cotton plantations', () => {
  it('take five empty-handed villagers and deliver only cloth', () => {
    const { w, id } = withPlantation();
    const s = w.state;
    s.skills = { fertileHerding: 1 }; // herders only
    simulate(w, 120, 1 / 30);
    const pickers = s.villagers.filter((v) => v.job === 'cotton');
    expect(pickers).toHaveLength(5);
    expect(pickers.every((v) => v.workplace === id)).toBe(true);
    expect(s.resources.cloth).toBeGreaterThan(0);
    expect(s.resources.cloth).toBeLessThanOrEqual(120 * 5 * getStats(s).cottonRate);
    expect(s.totals.food).toBe(0);
  });

  it('pick ×3 as fast and carry ×3 as much as a herder, Barn upgrades included', () => {
    const s = smallWorld().state;
    for (const farm of [0, 10]) {
      s.upgrades.farm = farm;
      const st = getStats(s);
      expect(st.cottonRate).toBeCloseTo(st.herdRate * 3);
      expect(st.cottonCarry).toBeCloseTo(st.herdCarry * 3);
    }
    expect(getStats(s).cottonCarry).toBeCloseTo((10 + 20) * 1.02 ** 10 * 3);
  });

  it('spread their pickers over separate tiles inside the fence', () => {
    const { w, id } = withPlantation();
    const s = w.state;
    const b = s.buildings.find((p) => p.id === id)!;
    const { w: bw, h: bh } = BUILDINGS.cottonPlantation;
    for (let t = 0; t < 120 && !s.villagers.every((v) => v.state === 'work'); t++) simulate(w, 0.5, 1 / 30);
    const tiles = s.villagers.map((v) => tileAt(s, v.x, v.y));
    expect(new Set(tiles).size).toBe(5);
    for (const i of tiles) {
      const x = i % s.w;
      const y = (i / s.w) | 0;
      expect(x > b.x && x < b.x + bw - 1 && y > b.y && y < b.y + bh - 1).toBe(true);
    }
  });

  it('pausing or removal returns the pickers without losing carried cloth', () => {
    for (const stop of [togglePause, removeBuilding]) {
      const { w, id } = withPlantation();
      const s = w.state;
      simulate(w, 20, 1 / 30);
      while (totalCloth(w) === s.resources.cloth) simulate(w, 1, 1 / 30); // pickers mid-trip
      const total = totalCloth(w);
      stop(w, id);
      simulate(w, 60, 1 / 30);
      expect(s.villagers.every((v) => v.job === 'lumber' && v.workplace === -1)).toBe(true);
      expect(s.resources.cloth).toBeCloseTo(total, 6);
    }
  });

  it('is independent of step size', () => {
    const a = withPlantation(5, 4).w;
    const b = withPlantation(5, 4).w;
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(b.state.resources.cloth).toBeCloseTo(a.state.resources.cloth, 3);
  });

  it('costs gold', () => {
    const w = unlockBuildings(smallWorld(30));
    const s = w.state;
    expect(buildingCost(s, 'cottonPlantation')).toEqual({ wood: 5000, stone: 500, gold: 250 });
    const { x, y } = s.origin;
    clearArea(w, x - 6, y, x - 1, y + 5);
    s.resources = { ...s.resources, wood: 5000, stone: 500, gold: 249 };
    expect(placeBuilding(w, 'cottonPlantation', x - 6, y)).toBe(false);
  });
});

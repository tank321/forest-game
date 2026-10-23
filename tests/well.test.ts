import { describe, expect, it } from 'vitest';
import { addBuilding } from '../src/core/buildings';
import { placeBuilding } from '../src/core/commands';
import { buildingCost } from '../src/core/economy';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import type { World } from '../src/core/world';
import { clearArea, pave, smallWorld, unlockBuildings } from './helpers';

/** Farm on a cleared 3×3 west of the clearing (x-3..x-1, y..y+2); optional Well at (wx, wy). */
function farmWorld(well?: [dx: number, dy: number]): { w: World; farmId: number } {
  const w = unlockBuildings(smallWorld(30, 2, 1));
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  clearArea(w, x - 6, y - 2, x - 1, y + 4);
  s.resources = { wood: 1e4, food: 0, stone: 1e3, cloth: 0, gold: 0 };
  expect(placeBuilding(w, 'farm', x - 3, y)).toBe(true);
  const farmId = s.buildings[s.buildings.length - 1].id;
  if (well) expect(placeBuilding(w, 'well', x + well[0], y + well[1])).toBe(true);
  s.resources = { wood: 0, food: 0, stone: 0, cloth: 0, gold: 0 };
  pave(w);
  return { w, farmId };
}

describe('wells', () => {
  it('cost wood and stone', () => {
    expect(buildingCost(smallWorld().state, 'well')).toEqual({ wood: 150, stone: 40 });
  });

  it('boost farms within one tile, diagonals included', () => {
    expect(getStats(farmWorld([-4, 1]).w.state).wellFarms.size).toBe(1); // touching the west edge
    const diag = farmWorld([-4, -1]);
    expect(getStats(diag.w.state).wellFarms.has(diag.farmId)).toBe(true); // corner
    expect(getStats(farmWorld([-5, 1]).w.state).wellFarms.size).toBe(0); // one tile gap
  });

  it('one well boosts every farm in range; extra wells do not stack', () => {
    const { w, farmId } = farmWorld([-4, 1]);
    const s = w.state;
    const { x, y } = s.origin;
    addBuilding(s, 'well', x - 4, y + 2);
    clearArea(w, x - 6, y - 2, x, y - 1);
    const other = addBuilding(s, 'farm', x - 6, y - 2); // corner at (x-4, y): touches the first well
    pave(w);
    const st = getStats(s);
    expect([...st.wellFarms].sort()).toEqual([farmId, other.id].sort());
  });

  it('farms by a well produce well over twice the food', () => {
    const plain = farmWorld().w;
    const boosted = farmWorld([-4, 1]).w;
    simulate(plain, 600, 1 / 30);
    simulate(boosted, 600, 1 / 30);
    const ratio = boosted.state.resources.food / plain.state.resources.food;
    // ×3 harvest; ×2 carry halves trips. Walking is unboosted, so this lands near 2.5 here, not 3.
    expect(ratio).toBeGreaterThan(2.2);
    expect(ratio).toBeLessThanOrEqual(3);
  });

  it('Deep Wells reaches farms two tiles away', () => {
    const { w, farmId } = farmWorld([-5, 1]);
    const s = w.state;
    expect(getStats(s).wellFarms.has(farmId)).toBe(false);
    s.skills = { greenThumbs: 1, deepWells: 1 };
    expect(getStats(s).wellFarms.has(farmId)).toBe(true);
  });
});

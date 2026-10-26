import { describe, expect, it } from 'vitest';
import { buildingAt, footprint } from '../src/core/buildings';
import { placeBuilding, removeBuilding } from '../src/core/commands';
import { linkedBuildings, roadNetwork, wouldLink } from '../src/core/roads';
import { simulate } from '../src/core/sim';
import type { Building } from '../src/core/types';
import { onBuildingsChanged, type World } from '../src/core/world';
import { clearArea, smallWorld } from './helpers';

/** A world with the ground west of the Town Center cleared for farms (columns tc.x−9…tc.x−1, rows tc.y−3…tc.y+5). */
function westOfTown(villagers = 0): { w: World; tc: Building; farm: (dx: number, dy: number) => Building } {
  const w = smallWorld(30, villagers, 4);
  const s = w.state;
  s.nextRelicAt = Infinity;
  const tc = s.buildings.find((b) => b.kind === 'townCenter')!;
  clearArea(w, tc.x - 9, tc.y - 3, tc.x - 1, tc.y + 5);
  const farm = (dx: number, dy: number) => {
    s.resources.wood = 1e6;
    expect(placeBuilding(w, 'farm', tc.x + dx, tc.y + dy)).toBe(true);
    s.resources.wood = 0;
    return buildingAt(s, (tc.y + dy) * s.w + tc.x + dx)!;
  };
  return { w, tc, farm };
}

const learn = (w: World) => {
  w.state.skills.fieldPaths = 1;
  onBuildingsChanged(w);
};

describe('Field Paths', () => {
  it('links farms joined edge to edge, farm by farm, to a connected farm', () => {
    const { w, farm } = westOfTown();
    const s = w.state;
    const anchor = farm(-3, 0); // touches the Town Center
    const bridge = farm(-6, 0);
    const far = farm(-9, 0);
    const ids = () => [anchor, bridge, far].map((b) => linkedBuildings(s).has(b.id));
    expect(ids()).toEqual([true, false, false]);
    learn(w);
    expect(ids()).toEqual([true, true, true]);

    removeBuilding(w, anchor.id); // a chain needs a farm on a road at one end
    expect(linkedBuildings(s).has(bridge.id)).toBe(false);
    expect(linkedBuildings(s).has(far.id)).toBe(false);
  });

  it('farms touching only at a corner do not link', () => {
    const { w, farm } = westOfTown();
    const s = w.state;
    learn(w);
    farm(-3, 0);
    const corner = farm(-6, -3);
    expect(linkedBuildings(s).has(corner.id)).toBe(false);
    const bridge = farm(-6, 0);
    expect(linkedBuildings(s).has(bridge.id)).toBe(true);
    expect(linkedBuildings(s).has(corner.id)).toBe(true);
  });

  it('shows a farm beside a connected farm as connected only with the skill', () => {
    const { w, tc, farm } = westOfTown();
    const s = w.state;
    const anchor = farm(-3, 0);
    const spot = { kind: 'farm' as const, x: tc.x - 6, y: tc.y };
    const check = (self?: number) => wouldLink(s, spot, roadNetwork(s), linkedBuildings(s), self);
    expect(check()).toBe(false);
    learn(w);
    expect(check()).toBe(true);
    expect(check(anchor.id)).toBe(false); // moving the anchor itself there
    expect(wouldLink(s, { kind: 'house', x: tc.x - 5, y: tc.y }, roadNetwork(s), linkedBuildings(s))).toBe(false);
  });

  it('staffs a farm hemmed in by farms, whose farmers walk across the fields, at any step size', () => {
    const run = (step: number) => {
      const { w, farm } = westOfTown(14);
      const s = w.state;
      const block: Building[] = [];
      for (const dy of [-3, 0, 3]) for (const dx of [-9, -6, -3]) block.push(farm(dx, dy));
      const middle = block[4];
      expect(linkedBuildings(s).has(middle.id)).toBe(false);
      learn(w);
      expect(linkedBuildings(s).has(middle.id)).toBe(true);
      const tiles = new Set(footprint(s, middle));
      let worked = false;
      let delivered = false;
      for (let t = 0; t < 120; t++) {
        const before = s.villagers.filter((v) => v.workplace === middle.id).map((v) => v.carry);
        simulate(w, 1, step);
        const staff = s.villagers.filter((v) => v.workplace === middle.id);
        worked ||= staff.some((v) => v.state === 'work' && tiles.has(Math.floor(v.y) * s.w + Math.floor(v.x)));
        delivered ||= staff.some((v, k) => (before[k] ?? 0) > 0 && v.carry < before[k]);
      }
      expect(worked).toBe(true);
      expect(delivered).toBe(true);
      return s.resources.food;
    };
    expect(run(1 / 30)).toBeCloseTo(run(1), 6);
  });
});

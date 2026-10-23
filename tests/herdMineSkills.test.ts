import { describe, expect, it } from 'vitest';
import { BUILDINGS, buildingGap, distToBuilding, type BuildingKind } from '../src/core/buildings';
import { blast, placeBuilding } from '../src/core/commands';
import { isChoppable } from '../src/core/grid';
import { simulate } from '../src/core/sim';
import { availableSkills } from '../src/core/skills';
import { getStats } from '../src/core/stats';
import { walk } from '../src/core/systems/movement';
import { Tile } from '../src/core/types';
import type { World } from '../src/core/world';
import { clearArea, freeRoads, pave, smallWorld, totalWood } from './helpers';

const SEASON = 180;
const WINTER_END = 4 * SEASON;

/** One `kind` building just west of the clearing, connected by road. */
function withBuilding(kind: BuildingKind, villagers = 0): World {
  const w = smallWorld(30, villagers, 4);
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  const { w: bw, h: bh } = BUILDINGS[kind];
  clearArea(w, x - bw, y, x - 1, y + bh); // the last row stays open for the road
  Object.assign(s.resources, { wood: 1e6, food: 1e6 });
  s.skills = { sheepFarms: 1, quarrying: 1 };
  expect(placeBuilding(w, kind, x - bw, y)).toBe(true);
  Object.assign(s.resources, { wood: 0, food: 0 });
  return pave(w);
}

/** Trees within `r` of the building, with their wood. */
function treesNear(w: World, kind: BuildingKind, r: number): Map<number, number> {
  const s = w.state;
  const b = s.buildings.find((o) => o.kind === kind)!;
  const out = new Map<number, number>();
  for (let i = 0; i < s.tiles.length; i++) {
    if (s.tiles[i] === Tile.Tree && distToBuilding(b, i % s.w, (i / s.w) | 0) <= r) out.set(i, s.wood[i]);
  }
  return out;
}

describe('herding and mining skills', () => {
  it('apply Open Pastures, Weavers, Rich Veins, Deep Shafts and Cobblestone, and gate the Masteries', () => {
    const w = withBuilding('sheepFarm');
    const s = w.state;
    const farm = s.buildings.find((b) => b.kind === 'sheepFarm')!;
    s.skills = { openPastures: 2 };
    const before = getStats(s).pastureBonus.get(farm.id)!;
    const tree = [...treesNear(w, 'sheepFarm', 2).keys()].find((i) => isChoppable(s, i))!;
    clearArea(w, tree % s.w, (tree / s.w) | 0, tree % s.w, (tree / s.w) | 0);
    expect(getStats(s).pastureBonus.get(farm.id)).toBeCloseTo(before + 0.02);

    s.skills = {};
    const herd = getStats(s).herdRate;
    s.upgrades.shoes = 2;
    s.upgrades.coats = 1;
    s.skills = { weavers: 1 };
    expect(getStats(s).herdRate).toBeCloseTo(herd * 1.12);

    const q = withBuilding('quarry');
    const quarry = q.state.buildings.find((b) => b.kind === 'quarry')!;
    const tc = q.state.buildings.find((b) => b.kind === 'townCenter')!;
    q.state.skills = { richVeins: 3 };
    expect(getStats(q.state).veinBonus.get(quarry.id)).toBeCloseTo(1 + 0.06 * buildingGap(quarry, tc));
    q.state.skills = {};
    const mine = getStats(q.state).mineRate;
    q.state.skills = { deepShafts: 1 };
    expect(getStats(q.state).mineRate).toBe(mine);
    q.state.time = 3 * SEASON + 1;
    expect(getStats(q.state).mineRate).toBeCloseTo(mine * 1.5);

    const r = smallWorld(20, 1);
    const v = r.state.villagers[0];
    const a = r.state.origin.y * r.state.w + r.state.origin.x;
    freeRoads(r, [a, a + 1]);
    Object.assign(v, { x: (a % r.state.w) + 0.5, y: r.state.origin.y + 0.5, path: [a, a + 1], pathI: 0 });
    walk(r, v, 0.5, 1, { roadWalk: 1.4, emptyWalk: 1, toll: 0 });
    expect(v.x - ((a % r.state.w) + 0.5)).toBeCloseTo(0.7);

    s.skills = { sheepFarms: 1, openPastures: 3, fertileHerding: 1, goldenFleece: 2 };
    expect(availableSkills(s)).not.toContain('grazingFlocks');
    s.skills.goldenFleece = 3;
    expect(availableSkills(s)).toContain('grazingFlocks');
    expect(availableSkills(s)).not.toContain('dynamite');
  });

  it('Golden Fleece and Geodes pay jackpots on deliveries', () => {
    const h = withBuilding('sheepFarm', 2);
    h.state.skills = { goldenFleece: 50 }; // every delivery hits
    simulate(h, 120, 1 / 30);
    expect(h.gathered.herd.cloth).toBeGreaterThan(0);
    expect(h.gathered.bonus.cloth).toBeCloseTo(9 * h.gathered.herd.cloth);
    expect(h.fx.some((f) => f.kind === 'fleece')).toBe(true);

    const m = withBuilding('quarry', 3);
    m.state.skills = { geodes: 50 };
    simulate(m, 120, 1 / 30);
    expect(m.gathered.mine.stone).toBeGreaterThan(0);
    expect(m.gathered.bonus.gold).toBeCloseTo(25 * m.gathered.mine.stone);
  });

  it('Shearing Day pays a minute of wool as spring begins, at any step size', () => {
    const shearing = (step: number) => {
      const w = withBuilding('sheepFarm', 2);
      w.state.skills = { shearingDay: 1 };
      w.state.time = WINTER_END - 30;
      simulate(w, 20, step); // herder staffed, still winter
      const herders = w.state.villagers.filter((v) => v.job === 'herd').length;
      const expected = 60 * getStats(w.state).herdRate * herders;
      expect(w.gathered.bonus.cloth).toBe(0);
      simulate(w, 20, step);
      expect(w.fx.find((f) => f.kind === 'shearing')?.n).toBeCloseTo(expected);
      return w.gathered.bonus.cloth;
    };
    const fine = shearing(1 / 30);
    expect(fine).toBeGreaterThan(0);
    expect(shearing(1)).toBeCloseTo(fine);
  });

  it('Grazing Flocks eat trees at 3 lumberjacks\' rate, conserving wood, at any step size', () => {
    const graze = (step: number) => {
      const w = withBuilding('sheepFarm');
      w.state.skills = { grazingFlocks: 1 };
      const [total, left] = [totalWood(w), w.state.treesLeft];
      const rate = getStats(w.state).chopRate;
      simulate(w, 60, step);
      expect(w.gathered.bonus.wood).toBeCloseTo(3 * rate * 60);
      expect(totalWood(w)).toBeCloseTo(total);
      expect(w.state.treesLeft).toBeLessThan(left);
      return w.state.wood.slice();
    };
    const fine = graze(1 / 30);
    graze(1).forEach((n, i) => expect(n).toBeCloseTo(fine[i]));
  });

  it('Dynamite pays stone and hits nearby trees like 100 taps, then waits out its cooldown', () => {
    const w = withBuilding('quarry', 3);
    const s = w.state;
    simulate(w, 20, 1 / 30); // miners staffed
    const quarry = s.buildings.find((b) => b.kind === 'quarry')!;
    expect(blast(w, quarry.id)).toBe(false); // not learned
    s.skills = { dynamite: 1 };
    const st = getStats(s);
    const miners = s.villagers.filter((v) => v.workplace === quarry.id).length;
    const near = treesNear(w, 'quarry', 2);
    const stone = s.resources.stone;
    expect(blast(w, quarry.id)).toBe(true);
    expect(s.resources.stone - stone).toBeCloseTo(30 * st.mineRate * miners);
    for (const [i, wood] of near) expect(s.wood[i]).toBe(Math.max(0, wood - 100 * st.manualChop));
    expect(blast(w, quarry.id)).toBe(false);
    s.time += 90;
    expect(blast(w, quarry.id)).toBe(true);
  });
});

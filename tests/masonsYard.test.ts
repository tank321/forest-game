import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { addBuilding, atLimit, buildingById } from '../src/core/buildings';
import { buildStoneHouse, buyRoad, canPlace, moveBuilding, removeBuilding } from '../src/core/commands';
import { buildingRefund, popCap, roadCost, stoneHouseCost } from '../src/core/economy';
import { roadStock } from '../src/core/roads';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { availableSkills } from '../src/core/skills';
import type { World } from '../src/core/world';
import { clearArea, pave, smallWorld } from './helpers';

const K = CONFIG.masonsYard;

/** A Mason's Yard well west of the Town Center, a Quarry just beyond it and, with `house`, a house on the TC's north side. */
function withYard(villagers = 0, house = false): { w: World; yard: number; quarry: number; home: number } {
  const w = smallWorld(40, villagers);
  const s = w.state;
  s.nextRelicAt = Infinity;
  s.skills = { quarrying: 1, masons: 1, masonsYard: 1 };
  const { x, y } = s.origin;
  clearArea(w, x - 14, y, x - 1, y + 4);
  const quarry = addBuilding(s, 'quarry', x - 14, y).id;
  const yard = addBuilding(s, 'masonsYard', x - 11, y).id;
  const tc = s.buildings[0];
  const home = house ? addBuilding(s, 'house', tc.x, tc.y - 1).id : -1;
  pave(w);
  return { w, yard, quarry, home };
}

describe("Mason's Yard", () => {
  it('is offered under Masons once 4 levels are learned in Mining, and only one may stand', () => {
    const w = smallWorld(40);
    const s = w.state;
    s.skills = { quarrying: 1, masons: 1, stonecutters: 1 };
    expect(availableSkills(s)).not.toContain('masonsYard'); // 3 levels
    s.skills.stonecutters = 2;
    expect(availableSkills(s)).toContain('masonsYard');
    s.skills = { quarrying: 1, stonecutters: 2, quarryCrews: 1 };
    expect(availableSkills(s)).not.toContain('masonsYard'); // 4 levels, but no Masons

    const { w: built, yard } = withYard();
    expect(atLimit(built.state, 'masonsYard')).toBe(true);
    expect(removeBuilding(built, yard)).toBe(true);
    expect(atLimit(built.state, 'masonsYard')).toBe(false);
    expect(canPlace(built, 'masonsYard', built.state.origin.x - 11, built.state.origin.y)).toBe(true);
  });

  it('takes stone from the miners of a nearby Quarry', () => {
    const { w, yard, quarry } = withYard(2);
    const s = w.state;
    simulate(w, 120, 1 / 30);
    expect(s.villagers.filter((v) => v.workplace === quarry)).toHaveLength(2);
    expect(buildingById(s, yard)!.tally.stone).toBeGreaterThan(0);
    expect(s.buildings[0].tally.stone ?? 0).toBe(0); // the Town Center is farther
    expect(s.resources.stone).toBe(buildingById(s, yard)!.tally.stone);
  });

  it('sells roads one at a time, each dearer than the last, while connected', () => {
    const { w, yard } = withYard();
    const s = w.state;
    const stock = roadStock(s);
    // Masons (level 1) takes a quarter off the stone.
    expect(roadCost(s)).toEqual({ stone: Math.round(K.road.cost.stone * CONFIG.skills.masons) });
    s.resources.stone = 10_000;
    expect(buyRoad(w)).toBe(true);
    expect(buyRoad(w)).toBe(true);
    expect(roadStock(s)).toBe(stock + 2);
    expect(s.resources.stone).toBe(10_000 - Math.round(K.road.cost.stone * 0.75) - Math.round(K.road.cost.stone * K.road.growth * 0.75));
    expect(roadCost(s).stone).toBe(Math.round(K.road.cost.stone * K.road.growth ** 2 * 0.75));

    s.resources.stone = 0;
    expect(buyRoad(w)).toBe(false); // can't afford it
    s.resources.stone = 10_000;
    expect(removeBuilding(w, yard)).toBe(true);
    expect(buyRoad(w)).toBe(false); // no yard
    expect(roadStock(s)).toBe(stock + 2); // bought roads stay

    const { state } = deserialize(serialize(s, 1));
    expect(state.roadsBought).toBe(2);
  });

  it('rebuilds houses in stone for more room, once each, while connected', () => {
    const { w, yard, home } = withYard(0, true);
    const s = w.state;
    const cap = popCap(s);
    s.resources = { ...s.resources, wood: 1e6, stone: 1e6 };
    const first = stoneHouseCost(s);
    expect(first).toEqual({ wood: K.stoneHouse.cost.wood, stone: Math.round(K.stoneHouse.cost.stone * 0.75) });
    expect(buildStoneHouse(w, yard)).toBe(false); // not a house
    expect(buildStoneHouse(w, home)).toBe(true);
    expect(buildStoneHouse(w, home)).toBe(false); // already stone
    expect(popCap(s)).toBe(cap + K.stoneHouse.pop);
    expect(s.resources.wood).toBe(1e6 - first.wood!);

    // The next costs more; the upgrade counts toward the refund, and moving keeps it stone.
    const tc = s.buildings[0];
    const second = addBuilding(s, 'house', tc.x + 1, tc.y - 1).id;
    pave(w);
    expect(stoneHouseCost(s).stone).toBe(Math.round(K.stoneHouse.cost.stone * K.stoneHouse.growth * 0.75));
    expect(buildStoneHouse(w, second)).toBe(true);
    const b = buildingById(s, home)!;
    expect(buildingRefund(b)).toEqual({ wood: Math.floor(first.wood! / 2), stone: Math.floor(first.stone! / 2) });
    expect(moveBuilding(w, home, tc.x + 2, tc.y - 1)).toBe(true);
    expect(buildingById(s, home)!.stone).toBe(true);

    const third = addBuilding(s, 'house', tc.x + 3, tc.y - 1).id;
    pave(w);
    expect(removeBuilding(w, yard)).toBe(true);
    expect(buildStoneHouse(w, third)).toBe(false); // no yard
    expect(buildingById(s, home)!.stone).toBe(true); // stone houses stay stone

    const { state } = deserialize(serialize(s, 1));
    expect(state.buildings.filter((h) => h.stone).map((h) => h.id)).toEqual([home, second]);
  });

  it('v29 saves migrate with no roads bought', () => {
    const { w } = withYard();
    const old = JSON.parse(serialize(w.state, 1));
    old.version = 29;
    delete old.state.roadsBought;
    expect(deserialize(JSON.stringify(old)).state.roadsBought).toBe(0);
  });
});

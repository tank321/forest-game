import { describe, expect, it } from 'vitest';
import { buildingById, footprint, type BuildingKind } from '../src/core/buildings';
import { canMoveBuilding, hireVillager, moveBuilding, placeBuilding, removeBuilding, togglePause } from '../src/core/commands';
import { buildingRefund, popCap } from '../src/core/economy';
import { neighbors4, tileAt } from '../src/core/grid';
import { deserialize, serialize } from '../src/core/save';
import { simulate, tick } from '../src/core/sim';
import { goHome } from '../src/core/systems/movement';
import { Tile } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { clearArea, smallWorld } from './helpers';

function ready(villagers = 0) {
  const w = smallWorld(30, villagers);
  w.state.nextRelicAt = Infinity;
  clearArea(w, 3, 3, 26, 26);
  w.state.resources = { wood: 1e7, food: 1e7, stone: 1e7, cloth: 1e7, gold: 0 };
  return w;
}

function build(w: ReturnType<typeof ready>, kind: BuildingKind, x: number, y: number) {
  expect(placeBuilding(w, kind, x, y)).toBe(true);
  return w.state.buildings.at(-1)!;
}

describe('moving buildings', () => {
  it.each(['house', 'lumberCamp', 'barn', 'farm', 'quarry', 'well'] as const)('moves a %s for free while preserving its identity and payment', (kind) => {
    const w = ready();
    const b = build(w, kind, kind === 'house' ? 12 : 4, kind === 'house' ? 13 : 4);
    const original = footprint(w.state, b);
    const paid = { ...b.paidCost };
    const resources = { ...w.state.resources };
    const upgrades = { ...w.state.upgrades };
    const [x, y] = kind === 'house' ? [17, 14] : [8, 4];
    expect(moveBuilding(w, b.id, x, y)).toBe(true);
    expect(buildingById(w.state, b.id)).toBe(b);
    expect(b).toMatchObject({ x, y, paidCost: paid });
    expect(w.state.resources).toEqual(resources);
    expect(w.state.upgrades).toEqual(upgrades);
    expect(original.every((i) => w.state.tiles[i] === Tile.Grass)).toBe(true);
    expect(footprint(w.state, b).every((i) => w.state.tiles[i] === Tile.Building)).toBe(true);
  });

  it('allows overlapping the original footprint and preserves pause state', () => {
    const w = ready();
    const b = build(w, 'quarry', 4, 4);
    togglePause(w, b.id);
    expect(moveBuilding(w, b.id, 5, 4)).toBe(true);
    expect(w.state.tiles[4 * 30 + 4]).toBe(Tile.Grass);
    expect(w.state.tiles[4 * 30 + 5]).toBe(Tile.Building);
    expect(w.state.paused).toContain(b.id);
  });

  it('rejects trees, buildings, out-of-bounds and fractional destinations without mutations', () => {
    const w = ready();
    const b = build(w, 'barn', 4, 4);
    build(w, 'quarry', 8, 4);
    const before = serialize(w.state, 0);
    for (const [x, y] of [[0, 0], [8, 4], [13, 13], [-1, 4], [29, 29], [4.5, 4], [NaN, 4]]) {
      expect(canMoveBuilding(w, b.id, x, y)).toBe(false);
      expect(moveBuilding(w, b.id, x, y)).toBe(false);
      expect(serialize(w.state, 0)).toBe(before);
    }
  });

  it('does not let a house use its old position as its required neighbor', () => {
    const w = ready();
    const b = build(w, 'house', 12, 13);
    expect(canMoveBuilding(w, b.id, 12, 12)).toBe(false);
    expect(canMoveBuilding(w, b.id, 17, 14)).toBe(true);
  });

  it('protects the Town Center and ignores nonexistent IDs', () => {
    const w = ready();
    const before = serialize(w.state, 0);
    for (const id of [w.state.buildings[0].id, -1]) {
      expect(canMoveBuilding(w, id, 4, 4)).toBe(false);
      expect(moveBuilding(w, id, 4, 4)).toBe(false);
      expect(removeBuilding(w, id)).toBe(false);
    }
    expect(serialize(w.state, 0)).toBe(before);
  });
});

describe('building refunds', () => {
  it('refunds each original payment, independent of later buildings or discounts, exactly once', () => {
    const w = ready();
    const first = build(w, 'lumberCamp', 4, 4);
    const second = build(w, 'lumberCamp', 8, 4);
    build(w, 'lumberCamp', 20, 20);
    w.state.skills.masterBuilders = 1;
    const wood = w.state.resources.wood;
    const totals = { ...w.state.totals };
    expect(removeBuilding(w, first.id)).toBe(true);
    expect(w.state.resources.wood).toBe(wood + 50);
    expect(removeBuilding(w, first.id)).toBe(false);
    expect(removeBuilding(w, second.id)).toBe(true);
    expect(w.state.resources.wood).toBe(wood + 150);
    expect(w.state.totals).toEqual(totals);
  });

  it('records discounts actually paid and refunds all construction resources after moving', () => {
    const w = ready();
    w.state.skills = { masterBuilders: 1, masons: 2 };
    const b = build(w, 'well', 4, 4);
    expect(b.paidCost).toEqual({ wood: 120, stone: 23 });
    expect(buildingRefund(b)).toEqual({ wood: 60, stone: 11 });
    w.state.skills = {};
    moveBuilding(w, b.id, 20, 20);
    const before = { ...w.state.resources };
    removeBuilding(w, b.id);
    expect(w.state.resources).toEqual({ wood: before.wood + 60, food: before.food, stone: before.stone + 11, cloth: before.cloth, gold: before.gold });
  });

  it('refunds wood, food and stone for a late house and keeps existing villagers', () => {
    const w = ready(5);
    let last = w.state.buildings[0];
    for (let n = 0; n < 7; n++) last = build(w, 'house', 12 - n, 13);
    expect(buildingRefund(last)).toEqual({ wood: 569, food: 84, stone: 15 });
    while (w.state.villagers.length < popCap(w.state)) hireVillager(w);
    const population = w.state.villagers.length;
    const before = { ...w.state.resources };
    expect(removeBuilding(w, last.id)).toBe(true);
    expect(w.state.resources).toEqual({ wood: before.wood + 569, food: before.food + 84, stone: before.stone + 15, cloth: before.cloth, gold: before.gold });
    expect(w.state.villagers).toHaveLength(population);
    expect(hireVillager(w)).toBe(false);
    expect(footprint(w.state, last).every((i) => w.state.tiles[i] === Tile.Grass)).toBe(true);
  });
});

describe('workers and delivery routes', () => {
  it.each(['farm', 'quarry'] as const)('removes a staffed %s without losing its carried resources', (kind) => {
    const w = ready(2);
    const b = build(w, kind, 5, 5);
    tick(w, 1);
    const staff = w.state.villagers.filter((v) => v.workplace === b.id);
    const resource = kind === 'farm' ? 'food' : 'stone';
    for (const v of staff) { v.x = 5.5; v.y = 5.5; v.state = 'work'; v.carry = 3.25; }
    const total = w.state.resources[resource] + 3.25 * staff.length;
    w.state.paused.push(b.id);
    removeBuilding(w, b.id);
    expect(w.state.paused).not.toContain(b.id);
    expect(staff.every((v) => v.carry === 3.25)).toBe(true);
    simulate(w, 100, 1);
    expect(w.state.resources[resource]).toBeCloseTo(total, 6);
    expect(staff.every((v) => v.job === 'lumber' && v.workplace === -1)).toBe(true);
  });

  it('redirects workers to their moved workplace after delivering their load', () => {
    const w = ready(1);
    const b = build(w, 'farm', 5, 5);
    tick(w, 1);
    const v = w.state.villagers[0];
    v.x = 5.5; v.y = 5.5; v.state = 'work'; v.carry = 3.25;
    moveBuilding(w, b.id, 8, 5);
    expect(v.carry).toBe(3.25);
    const goals = footprint(w.state, b);
    let worked = false;
    for (let n = 0; n < 100; n++) {
      tick(w, 1);
      const current = w.state.villagers[0];
      if (current.state === 'work') { worked = true; expect(goals).toContain(tileAt(w.state, current.x, current.y)); }
      if (current.state === 'toWork') expect(goals).toContain(current.path.at(-1));
    }
    expect(worked).toBe(true);
    expect(v.workplace).toBe(b.id);
  });

  it.each(['move', 'remove'] as const)('rebuilds drop-off routes on %s, including the return to a claimed tree', (action) => {
    const w = ready(1);
    const b = build(w, 'lumberCamp', 5, 5);
    const v = w.state.villagers[0];
    v.x = 4.5; v.y = 5.5; v.target = 5 * 30 + 2; v.carry = 4;
    goHome(w, v, 'wood');
    const oldTile = 5 * 30 + 5;
    expect(w.fields.wood.dist[oldTile]).toBe(0);
    if (action === 'move') moveBuilding(w, b.id, 20, 20);
    else removeBuilding(w, b.id);
    expect(w.fields.wood.dist[oldTile]).toBeGreaterThan(0);
    expect(footprint(w.state, w.state.buildings[0])).toContain(v.path.at(-1));
    let chopped = false;
    for (let n = 0; n < 500; n++) {
      tick(w, 0.1);
      if (v.state === 'chop') {
        chopped = true;
        expect(neighbors4(w.state, tileAt(w.state, v.x, v.y))).toContain(v.target);
      }
    }
    expect(chopped).toBe(true);
  });

  it.each(['move', 'remove'] as const)('preserves loads above the new capacity when a Well is %sd', (action) => {
    const w = ready(1);
    build(w, 'farm', 5, 5);
    const well = build(w, 'well', 4, 5);
    tick(w, 1);
    const v = w.state.villagers[0];
    v.x = 5.5; v.y = 5.5; v.state = 'work'; v.carry = 8;
    if (action === 'move') moveBuilding(w, well.id, 20, 20);
    else removeBuilding(w, well.id);
    tick(w, 0.01);
    expect(v.carry).toBe(8);
    expect(v.state).toBe('toHome');
  });

  it('continues deterministically after moving and removing buildings', () => {
    const a = ready(2);
    const farm = build(a, 'farm', 5, 5);
    const barn = build(a, 'barn', 8, 5);
    simulate(a, 40, 1);
    moveBuilding(a, farm.id, 5, 10);
    removeBuilding(a, barn.id);
    const b = createWorld(deserialize(serialize(a.state)).state);
    simulate(a, 120, 1 / 30);
    simulate(b, 120, 1);
    expect(b.state.resources.food).toBeCloseTo(a.state.resources.food, 4);
    expect(b.state.resources.wood).toBeCloseTo(a.state.resources.wood, 4);
  });
});

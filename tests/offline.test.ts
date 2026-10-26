import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { placeBuilding } from '../src/core/commands';
import { awayEarnings } from '../src/core/offline';
import { clearArea, pave, smallWorld } from './helpers';

const NOW = 1_700_000_000_000;

/** A town with lumberjacks and a farm, stocked with nothing. */
function town() {
  const w = smallWorld(30, 4, 4);
  const s = w.state;
  s.nextRelicAt = Infinity;
  s.resources.wood = 1e6;
  const { x, y } = s.origin;
  clearArea(w, x - 3, y, x - 1, y + 3);
  expect(placeBuilding(w, 'farm', x - 3, y)).toBe(true);
  pave(w);
  s.resources = { wood: 0, food: 0, stone: 0, cloth: 0, gold: 0 };
  return w;
}

describe('time away', () => {
  it('pays only resources: the map, villagers and clock stay as they were left', () => {
    const w = town();
    const s = w.state;
    const tiles = [...s.tiles];
    const wood = [...s.wood];
    const villagers = JSON.stringify(s.villagers);
    const [time, trees, totals] = [s.time, s.treesLeft, { ...s.totals }];
    const got = awayEarnings(w, 600, NOW);
    expect(got.wood).toBeGreaterThan(0);
    expect(got.food).toBeGreaterThan(0);
    expect(s.resources).toEqual(got);
    expect(s.totals.wood).toBe(totals.wood + got.wood); // counts toward achievements
    expect([...s.tiles]).toEqual(tiles);
    expect([...s.wood]).toEqual(wood);
    expect(s.treesLeft).toBe(trees);
    expect(JSON.stringify(s.villagers)).toBe(villagers);
    expect(s.time).toBe(time);
  });

  it(`counts at most ${CONFIG.sim.maxOfflineSeconds / 3600} hours`, () => {
    const capped = awayEarnings(town(), CONFIG.sim.maxOfflineSeconds, NOW);
    expect(awayEarnings(town(), CONFIG.sim.maxOfflineSeconds + 5 * 3600, NOW)).toEqual(capped);
  });

  it('never takes resources away', () => {
    const w = town();
    w.state.resources.food = 1e6; // far more than the farm makes back: upkeep eats into it
    const got = awayEarnings(w, 600, NOW);
    expect(Object.values(got).every((n) => n >= 0)).toBe(true);
    expect(w.state.resources.food).toBe(1e6 + got.food);
  });
});

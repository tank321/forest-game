import { describe, expect, it } from 'vitest';
import { placeBuilding } from '../src/core/commands';
import { simulate } from '../src/core/sim';
import { tileAt } from '../src/core/grid';
import { jobSystem } from '../src/core/systems/jobs';
import { Tile } from '../src/core/types';
import { clearArea, smallWorld } from './helpers';

/**
 * A farm east of the Town Center, a lumberjack close to it in a straight line but shut in a clearing in the forest
 * (no walk to the farm), and one further off in the village.
 */
function cutOff() {
  const w = smallWorld(30, 2);
  const s = w.state;
  s.nextRelicAt = Infinity;
  const o = s.origin.x;
  clearArea(w, o + 6, o, o + 8, o + 3);
  s.resources.wood = 1e6;
  expect(placeBuilding(w, 'farm', o + 5, o + 1)).toBe(true);
  const pocket = (o + 1) * s.w + o + 10; // a tree's width beyond the cleared land
  s.tiles[pocket] = Tile.Grass;
  s.wood[pocket] = 0;
  const [shut, open] = s.villagers;
  for (const [v, x, y] of [[shut, o + 10, o + 1], [open, o, o + 5]] as const) {
    Object.assign(v, { job: 'lumber', workplace: -1, x: x + 0.5, y: y + 0.5, state: 'idle', target: -1, carry: 0, path: [], pathI: 0 });
  }
  return { w, s, farm: s.buildings.at(-1)!, shut, open };
}

describe('staffing', () => {
  it('picks the nearest lumberjack that can walk to the workplace, not the nearest in a straight line', () => {
    const { w, farm, shut, open } = cutOff();
    jobSystem(w);
    expect(shut.job).toBe('lumber');
    expect([open.job, open.workplace]).toEqual(['farm', farm.id]);
  });

  it('a worker that cannot walk to its workplace gives the job back, then walks out of its pocket', () => {
    const { w, s, farm, shut } = cutOff();
    Object.assign(shut, { job: 'farm', workplace: farm.id });
    simulate(w, 1 / 30, 1 / 30); // it finds no walk and quits
    expect([shut.job, shut.workplace]).toEqual(['lumber', -1]);
    simulate(w, 1 / 30, 1 / 30); // stranded with nothing to chop: it heads for a drop-off over the trees
    expect(shut.state).toBe('toHome');
    simulate(w, 20, 1 / 30);
    expect(w.fields.wood.dist[tileAt(s, shut.x, shut.y)]).not.toBe(-1);
  });
});

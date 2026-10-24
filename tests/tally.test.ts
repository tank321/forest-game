import { describe, expect, it } from 'vitest';
import { addBuilding } from '../src/core/buildings';
import { placeBuilding } from '../src/core/commands';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { tallyHtml } from '../src/ui/actions';
import { clearArea, pave, smallWorld } from './helpers';

describe('building tallies', () => {
  it('credit a farm with what it produced and the Town Center with what it collected', () => {
    const w = smallWorld(30, 2);
    const s = w.state;
    s.nextRelicAt = Infinity;
    const { x, y } = s.origin;
    clearArea(w, x - 3, y, x - 1, y + 2);
    s.resources.wood = 250;
    expect(placeBuilding(w, 'farm', x - 3, y)).toBe(true);
    const farm = s.buildings[s.buildings.length - 1];
    pave(w);
    const tc = s.buildings.find((b) => b.kind === 'townCenter')!;
    const handChopped = s.totals.wood; // clearArea chops by hand, which no building collects
    simulate(w, 200, 1 / 30);
    expect(s.totals.food).toBeGreaterThan(0);
    expect(farm.tally).toEqual({ food: s.totals.food });
    expect(tc.tally.food).toBe(s.totals.food);
    expect(tc.tally.wood).toBeCloseTo(s.totals.wood - handChopped, 9);
  });

  it('show produced for workplaces, collected for drop-offs, nothing for houses', () => {
    const w = smallWorld(30);
    const s = w.state;
    expect(tallyHtml(addBuilding(s, 'quarry', 2, 2))).toMatch(/^<span>Total produced<\/span>.*title="stone"/);
    expect(tallyHtml(addBuilding(s, 'barn', 5, 2))).toMatch(/Total collected.*title="food".*title="cloth"/);
    expect(tallyHtml(addBuilding(s, 'house', 8, 2))).toBeUndefined();
  });

  it('migrate a v11 save to v12 with empty tallies', () => {
    const w = smallWorld();
    const old = JSON.parse(serialize(w.state, 1));
    old.version = 11;
    for (const b of old.state.buildings) delete b.tally;
    expect(deserialize(JSON.stringify(old)).state.buildings.map((b) => b.tally)).toEqual([{}]);
  });
});

describe('gathered sources', () => {
  it('add up to the lifetime totals, by job, hand and tax', () => {
    const w = smallWorld(30, 3);
    const s = w.state;
    s.nextRelicAt = Infinity;
    const { x, y } = s.origin;
    clearArea(w, x - 3, y, x - 1, y + 2); // by hand
    s.resources.wood = 250;
    expect(placeBuilding(w, 'farm', x - 3, y)).toBe(true);
    addBuilding(s, 'taxOffice', 13, 11);
    addBuilding(s, 'house', 12, 12);
    pave(w);
    simulate(w, 200, 1 / 30);
    const g = w.gathered;
    expect(g.tax.gold).toBeGreaterThan(0);
    expect(g.hand.wood).toBeGreaterThan(0);
    expect(g.lumber.wood).toBeGreaterThan(0);
    expect(g.farm.food).toBe(s.totals.food);
    expect(g.tax.gold).toBeCloseTo(s.totals.gold, 9);
    expect(g.hand.wood + g.lumber.wood).toBeCloseTo(s.totals.wood, 9);
  });
});

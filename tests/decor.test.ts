import { describe, expect, it } from 'vitest';
import { nextCareer } from '../src/core/achievements';
import { BUILDINGS } from '../src/core/buildings';
import {
  canPlaceDecor, moveBuilding, moveDecor, moveRoad, placeBuilding, placeDecor, placeRoad, removeDecor,
} from '../src/core/commands';
import { DECOR, DECOR_KINDS, decorAt, isDecorUnlocked } from '../src/core/decor';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { createInitialState } from '../src/core/state';
import { Tile } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { smallWorld } from './helpers';

/** A 24×24 map with a 12×12 clearing (tiles 6–17) around the Town Center (10–13), stocked for decorating. */
function yard() {
  const w = createWorld(createInitialState(1, 24, 12));
  w.state.nextRelicAt = Infinity;
  w.state.resources = { wood: 1000, food: 1000, stone: 1000, cloth: 1000, gold: 1000 };
  return w;
}
const at = (w: ReturnType<typeof yard>, x: number, y: number) => y * w.state.w + x;

describe('decorations', () => {
  it('stand on open ground for their flat cost, one of each layer per tile', () => {
    const w = yard();
    const s = w.state;
    expect(placeDecor(w, 'paving', 6, 6)).toBe(true);
    expect(s.resources.stone).toBe(1000 - DECOR.paving.cost.stone!);
    expect(placeDecor(w, 'bench', 6, 6)).toBe(true); // a prop on the paving
    expect(placeDecor(w, 'flowerBed', 6, 6)).toBe(false); // the ground there is taken
    expect(placeDecor(w, 'lamp', 6, 6)).toBe(false); // and so is the prop
    expect(decorAt(s, at(w, 6, 6), 'ground')?.kind).toBe('paving');
    expect(decorAt(s, at(w, 6, 6), 'prop')?.kind).toBe('bench');

    expect(placeDecor(w, 'pond', 7, 6)).toBe(true);
    expect(decorAt(s, at(w, 8, 7), 'ground')?.kind).toBe('pond'); // a 2×2 covers all four tiles
    expect(placeDecor(w, 'flowerBed', 8, 7)).toBe(false);

    expect(canPlaceDecor(w, 'lamp', 10, 10)).toBe(false); // the Town Center
    expect(canPlaceDecor(w, 'lamp', 5, 5)).toBe(false); // forest
    expect(canPlaceDecor(w, 'pond', 17, 17)).toBe(false); // half off the clearing
    expect(canPlaceDecor(w, 'lamp', 6.5, 9)).toBe(false);
    s.tiles[at(w, 6, 9)] = Tile.Road;
    expect(canPlaceDecor(w, 'lamp', 6, 9)).toBe(false);

    s.resources.wood = 0;
    expect(placeDecor(w, 'fence', 6, 10)).toBe(false); // can't pay
    expect(decorAt(s, at(w, 6, 10), 'prop')).toBeUndefined();
  });

  it('keep trophies locked until their achievement tier is earned, and across a rebuild', () => {
    const w = yard();
    const s = w.state;
    const t = DECOR.fountain.trophy!;
    expect(isDecorUnlocked(s, 'bench')).toBe(true);
    expect(isDecorUnlocked(s, 'fountain')).toBe(false);
    expect(placeDecor(w, 'fountain', 6, 6)).toBe(false);
    s.career.earned[t.achievement] = t.tier - 1;
    expect(isDecorUnlocked(s, 'fountain')).toBe(false);
    s.career.earned[t.achievement] = t.tier;
    expect(placeDecor(w, 'fountain', 6, 6)).toBe(true);

    const next = createInitialState(2, 24, 12, s.legacy, nextCareer(s));
    expect(next.decor).toEqual([]); // a new map starts bare
    expect(isDecorUnlocked(next, 'fountain')).toBe(true);
  });

  it('move for free and come back whole when removed', () => {
    const w = yard();
    const s = w.state;
    placeDecor(w, 'paving', 6, 6);
    placeDecor(w, 'pond', 8, 6);
    placeDecor(w, 'cherry', 16, 6);
    const paid = { ...s.resources };

    expect(moveDecor(w, at(w, 9, 7), 'ground', 6, 6)).toBe(false); // onto the paving
    expect(moveDecor(w, at(w, 9, 7), 'ground', 9, 6)).toBe(true); // overlapping where it was
    expect(s.decor.find((d) => d.kind === 'pond')).toMatchObject({ x: 9, y: 6 });
    expect(moveDecor(w, at(w, 16, 6), 'prop', 6, 6)).toBe(true); // a prop onto paving
    expect(moveDecor(w, at(w, 16, 6), 'prop', 7, 7)).toBe(false); // nothing left there
    expect(s.resources).toEqual(paid);

    expect(removeDecor(w, at(w, 10, 7), 'ground')).toBe(true);
    expect(s.resources.stone).toBe(paid.stone + DECOR.pond.cost.stone!);
    expect(removeDecor(w, at(w, 6, 6), 'prop')).toBe(true);
    expect(s.decor.map((d) => d.kind)).toEqual(['paving']);
    expect(removeDecor(w, at(w, 6, 6), 'prop')).toBe(false);
    expect(removeDecor(w, -1, 'ground')).toBe(false);
  });

  it('are handed back when a building or road takes their tile', () => {
    const w = yard();
    const s = w.state;
    placeDecor(w, 'paving', 7, 6);
    placeDecor(w, 'bench', 7, 6);
    placeDecor(w, 'flowerBed', 9, 6);
    placeDecor(w, 'pond', 6, 15);
    placeDecor(w, 'lamp', 12, 6);
    const before = { ...s.resources };

    expect(placeBuilding(w, 'lumberCamp', 6, 6)).toBe(true); // covers (7, 6): paving and bench go back
    const camp = s.buildings.at(-1)!;
    expect(s.decor.map((d) => d.kind)).toEqual(['flowerBed', 'pond', 'lamp']);
    expect(s.resources.stone).toBe(before.stone + DECOR.paving.cost.stone!);
    expect(s.resources.wood).toBe(before.wood + DECOR.bench.cost.wood! - camp.paidCost.wood!);

    expect(moveBuilding(w, camp.id, 8, 6)).toBe(true); // onto the flower bed
    expect(s.decor.map((d) => d.kind)).toEqual(['pond', 'lamp']);

    expect(placeRoad(w, at(w, 7, 16))).toBe(true); // a corner of the pond
    expect(s.decor.map((d) => d.kind)).toEqual(['lamp']);
    expect(placeRoad(w, at(w, 14, 6))).toBe(true);
    expect(moveRoad(w, at(w, 14, 6), at(w, 12, 6))).toBe(true);
    expect(s.decor).toEqual([]);
    expect(s.resources.stone).toBe(before.stone + DECOR.paving.cost.stone! + DECOR.pond.cost.stone! + DECOR.lamp.cost.stone!);
  });

  it('change nothing in the simulation', () => {
    const a = smallWorld(30, 4);
    const b = smallWorld(30, 4);
    const s = b.state;
    s.resources = { wood: 1e4, food: 1e4, stone: 1e4, cloth: 1e4, gold: 1e4 };
    // Across the ring of open ground around the Town Center, where every villager walks.
    for (let x = 12; x <= 17; x++) {
      expect(placeDecor(b, 'paving', x, 12)).toBe(true);
      expect(placeDecor(b, x % 2 ? 'fence' : 'hedge', x, 12)).toBe(true);
    }
    for (let y = 13; y <= 17; y++) expect(placeDecor(b, 'lamp', 12, y)).toBe(true);
    s.resources = { ...a.state.resources };
    simulate(a, 300, 1 / 30);
    simulate(b, 300, 1 / 30);
    expect({ ...b.state, decor: [] }).toEqual(a.state);
  });

  it('survive a save, and a v27 save gains none', () => {
    const w = yard();
    placeDecor(w, 'pond', 6, 6);
    placeDecor(w, 'hedge', 8, 6);
    const { state } = deserialize(serialize(w.state));
    expect(state.decor).toEqual(w.state.decor);

    const old = JSON.parse(serialize(w.state, 5));
    old.version = 27;
    delete old.state.decor;
    expect(deserialize(JSON.stringify(old)).state.decor).toEqual([]);
  });

  it('never share a name with a building, so a placement can aim either (ui/placement.ts)', () => {
    for (const kind of DECOR_KINDS) expect(kind in BUILDINGS).toBe(false);
  });
});

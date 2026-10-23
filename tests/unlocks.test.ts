import { describe, expect, it } from 'vitest';
import { BUILDINGS, isUnlocked, unlocks, type BuildingKind } from '../src/core/buildings';
import { moveBuilding, placeBuilding } from '../src/core/commands';
import { clearArea, smallWorld } from './helpers';

const KINDS = Object.keys(BUILDINGS) as BuildingKind[];

function ready() {
  const w = smallWorld(30);
  w.state.nextRelicAt = Infinity;
  clearArea(w, 3, 3, 26, 26);
  w.state.resources = { wood: 1e7, food: 1e7, stone: 1e7, cloth: 1e7, gold: 1e7 };
  return w;
}

describe('building unlocks', () => {
  it('only the House, Lumber Camp, Barn and Farm can be built at the start', () => {
    const s = smallWorld().state;
    expect(KINDS.filter((k) => BUILDINGS[k].buildable && isUnlocked(s, k))).toEqual(['house', 'lumberCamp', 'barn', 'farm']);
  });

  it('give every locked building its own skill', () => {
    const skills = KINDS.map((k) => BUILDINGS[k].unlock).filter((id) => id !== undefined);
    expect(new Set(skills).size).toBe(skills.length);
    for (const k of KINDS) {
      const skill = BUILDINGS[k].unlock;
      if (skill) expect(unlocks(skill)).toBe(k);
    }
  });

  it('place a Quarry only once Quarrying is learned', () => {
    const w = ready();
    expect(placeBuilding(w, 'quarry', 4, 4)).toBe(false);
    w.state.skills.quarrying = 1;
    expect(placeBuilding(w, 'quarry', 4, 4)).toBe(true);
  });

  it('still move a building whose kind is locked', () => {
    const w = ready();
    w.state.skills.wells = 1;
    expect(placeBuilding(w, 'well', 4, 4)).toBe(true);
    w.state.skills = {}; // a save from before unlocks
    const well = w.state.buildings[w.state.buildings.length - 1];
    expect(moveBuilding(w, well.id, 20, 20)).toBe(true);
    expect(placeBuilding(w, 'well', 4, 4)).toBe(false);
  });
});

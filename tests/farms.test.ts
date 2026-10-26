import { describe, expect, it } from 'vitest';
import { addBuilding } from '../src/core/buildings';
import { farmJoins } from '../src/render/farms';
import { smallWorld } from './helpers';

const NORTH = 0b111, EAST = 0b111 << 3, SOUTH = 0b111 << 6, WEST = 0b111 << 9;

describe('farmJoins', () => {
  it('joins farms side by side and stacked, along the whole edge', () => {
    const s = smallWorld(30).state;
    const a = addBuilding(s, 'farm', 2, 2);
    const b = addBuilding(s, 'farm', 5, 2);
    const c = addBuilding(s, 'farm', 2, 5);
    const j = farmJoins(s);
    expect(j.get(a.id)).toBe(EAST | SOUTH);
    expect(j.get(b.id)).toBe(WEST);
    expect(j.get(c.id)).toBe(NORTH);
  });

  it('joins only the tiles that touch when a farm is offset', () => {
    const s = smallWorld(30).state;
    const a = addBuilding(s, 'farm', 2, 2);
    const b = addBuilding(s, 'farm', 5, 3); // one tile lower
    const j = farmJoins(s);
    expect(j.get(a.id)).toBe(0b110 << 3); // east tiles 1 and 2
    expect(j.get(b.id)).toBe(0b011 << 9); // west tiles 0 and 1
  });

  it('does not join farms touching at a corner, or other buildings', () => {
    const s = smallWorld(30).state;
    const a = addBuilding(s, 'farm', 2, 2);
    const b = addBuilding(s, 'farm', 5, 5);
    addBuilding(s, 'house', 2, 5);
    const j = farmJoins(s);
    expect(j.get(a.id)).toBe(0);
    expect(j.get(b.id)).toBe(0);
  });
});

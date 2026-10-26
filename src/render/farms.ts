import { BUILDINGS } from '../core/buildings';
import type { Building, GameState } from '../core/types';

/**
 * Which edge tiles of each farm touch another farm, as `joinFarm`'s mask (farm id -> bits): north tiles 0–2 (bits 0–2,
 * west to east), east 3–5 and west 9–11 (north to south), south 6–8. Farms touching only at a corner don't join.
 */
export function farmJoins(s: GameState): Map<number, number> {
  const farms = s.buildings.filter((b) => b.kind === 'farm');
  const at = new Map<number, Building>();
  const { w: side } = BUILDINGS.farm;
  for (const b of farms) for (let dy = 0; dy < side; dy++) for (let dx = 0; dx < side; dx++) at.set((b.y + dy) * s.w + b.x + dx, b);
  const other = (b: Building, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= s.w || y >= s.h) return false;
    const o = at.get(y * s.w + x);
    return !!o && o !== b;
  };
  const out = new Map<number, number>();
  for (const b of farms) {
    let mask = 0;
    for (let i = 0; i < side; i++) {
      if (other(b, b.x + i, b.y - 1)) mask |= 1 << i;
      if (other(b, b.x + side, b.y + i)) mask |= 1 << (3 + i);
      if (other(b, b.x + i, b.y + side)) mask |= 1 << (6 + i);
      if (other(b, b.x - 1, b.y + i)) mask |= 1 << (9 + i);
    }
    out.set(b.id, mask);
  }
  return out;
}

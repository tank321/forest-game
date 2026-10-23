import { CONFIG } from '../../config';
import { BUILDINGS, distToBuilding, isActive } from '../buildings';
import { lvl } from '../skills';
import { getStats } from '../stats';
import { Tile, type Building, type GameState } from '../types';
import { clearTree, gainBonus, visionRadius, type World } from '../world';

/**
 * Grazing Flocks: each working Sheep Farm's flock eats into the nearest visible trees within reach, as fast
 * as a few lumberjacks. It damages trees rather than felling them outright, so the big outer trees still
 * take their full wood. dt-independent: a step's bite is spent across as many trees as it reaches.
 */
export function grazingSystem(w: World, dt: number): void {
  const s = w.state;
  if (!lvl(s, 'grazingFlocks')) return;
  const st = getStats(s);
  const { radius, crews } = CONFIG.skills.grazing;
  for (const b of s.buildings) {
    if (b.kind !== 'sheepFarm' || !isActive(s, b, st.linked)) continue;
    let bite = crews * st.chopRate * dt;
    for (let i = nearestTree(w, b, radius); bite > 0 && i >= 0; i = nearestTree(w, b, radius)) {
      const n = Math.min(bite, s.wood[i]);
      s.wood[i] -= n;
      bite -= n;
      gainBonus(w, 'wood', n);
      if (s.wood[i] > 0) break;
      w.fx.push({ kind: 'grazed', i, n: w.maxWood[i] });
      clearTree(w, i);
    }
  }
}

/** The visible tree within `r` of the building's footprint nearest to it (lowest index on ties), or -1. */
function nearestTree(w: World, b: Building, r: number): number {
  const s: GameState = w.state;
  const { w: bw, h: bh } = BUILDINGS[b.kind];
  const sight = visionRadius(s);
  let best = -1;
  let bd = Infinity;
  for (let y = Math.max(0, b.y - r); y <= Math.min(s.h - 1, b.y + bh - 1 + r); y++) {
    for (let x = Math.max(0, b.x - r); x <= Math.min(s.w - 1, b.x + bw - 1 + r); x++) {
      const i = y * s.w + x;
      if (s.tiles[i] !== Tile.Tree || w.fog[i] > sight) continue;
      const d = distToBuilding(b, x, y);
      if (d < bd) [bd, best] = [d, i];
    }
  }
  return best;
}

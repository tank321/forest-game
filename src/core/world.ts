import { CONFIG } from '../config';
import { isTerritory } from './grid';
import { buildField, type Field } from './pathing';
import { spawnRelic } from './relics';
import { maxWoodTable } from './trees';
import type { GameState } from './types';
import { Tile } from './types';

/** Runtime container: persistent state plus derived data that is never saved. */
export interface World {
  state: GameState;
  field: Field; // drop-off distance field
  fog: Uint8Array; // Chebyshev distance to territory, capped at fogRadius + 1
  maxWood: Float64Array; // full-grown wood per tile (static)
  dev: { manualMult: number }; // dev-only testing aids (never saved)
}

export function createWorld(state: GameState): World {
  const w: World = {
    state,
    field: buildField(state),
    fog: new Uint8Array(state.w * state.h).fill(CONFIG.fogRadius + 1),
    maxWood: maxWoodTable(state),
    dev: { manualMult: 1 },
  };
  for (let i = 0; i < state.tiles.length; i++) if (isTerritory(state, i)) stampFog(w, i);
  return w;
}

function stampFog(w: World, i: number): void {
  const { w: sw, h: sh } = w.state;
  const R = CONFIG.fogRadius;
  const cx = i % sw;
  const cy = (i / sw) | 0;
  for (let y = Math.max(0, cy - R); y <= Math.min(sh - 1, cy + R); y++) {
    for (let x = Math.max(0, cx - R); x <= Math.min(sw - 1, cx + R); x++) {
      const j = y * sw + x;
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      if (d < w.fog[j]) w.fog[j] = d;
    }
  }
}

/** Turns a tile into territory (open ground). */
export function claimTile(w: World, i: number): void {
  const s = w.state;
  s.tiles[i] = Tile.Grass;
  s.wood[i] = 0;
  s.marked = s.marked.filter((m) => m !== i);
  stampFog(w, i);
  w.field = buildField(s);
}

/** The single place a tree is felled. */
export function clearTree(w: World, i: number): void {
  const s = w.state;
  s.treesLeft--;
  s.treesChopped++;
  claimTile(w, i);
  if (s.treesChopped >= s.nextRelicAt) spawnRelic(s, w.fog);
}

/** Drop-off field must be rebuilt when drop-off buildings change. */
export function onBuildingsChanged(w: World): void {
  w.field = buildField(w.state);
}

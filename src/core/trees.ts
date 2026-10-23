import { CONFIG } from '../config';
import type { GameState } from './types';

/** Chebyshev distance from tile i to the initial clearing. */
export function ringOf(s: GameState, i: number): number {
  const { x, y, w, h } = s.origin;
  const tx = i % s.w;
  const ty = (i / s.w) | 0;
  const dx = Math.max(x - tx, tx - (x + w - 1), 0);
  const dy = Math.max(y - ty, ty - (y + h - 1), 0);
  return Math.max(dx, dy);
}

/** Wood in a full-grown tree at ring d: fixed for the first rings, then compounding growth. */
export function ringWood(d: number): number {
  const { ringWood: fixed, growthStart, growthDecay } = CONFIG.tree;
  if (d <= fixed.length) return fixed[Math.max(d, 1) - 1];
  let v = fixed[fixed.length - 1];
  for (let k = 1; k <= d - fixed.length; k++) v *= Math.max(1, growthStart - growthDecay * k);
  return Math.round(v);
}

/** Max wood per tile (0 outside trees' reach of the clearing). Static per map. */
export function maxWoodTable(s: GameState): Float64Array {
  const byRing = new Map<number, number>();
  const out = new Float64Array(s.w * s.h);
  for (let i = 0; i < out.length; i++) {
    const d = ringOf(s, i);
    if (d === 0) continue;
    let v = byRing.get(d);
    if (v === undefined) byRing.set(d, (v = ringWood(d)));
    out[i] = v;
  }
  return out;
}

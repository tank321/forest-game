import { CONFIG } from '../config';
import { perkMult } from './legacy';
import { rand } from './rng';
import { Tile } from './types';
import type { GameState } from './types';

/** Trees to fell between relic k (0-based) and the next: 18, 19 … 67, then +2 steps. */
export const relicGap = (k: number) => (k < 50 ? 18 + k : 69 + 2 * (k - 50));

/** The gap this run uses: Relic Hunters shortens it. */
export const relicSpacing = (s: Pick<GameState, 'legacy'>, k: number) =>
  Math.ceil(relicGap(k) * perkMult(s, 'relicHunters', CONFIG.legacy.perks.relicHunters.gap));

/**
 * Places a relic on a visible tree that is not yet touching territory (fog ≥ 2), so the player
 * has to chop toward it. Returns the tile or -1 if no candidate exists (retried on the next fell).
 */
export function spawnRelic(s: GameState, fog: Uint8Array): number {
  const cands: number[] = [];
  for (let i = 0; i < s.tiles.length; i++) {
    if (s.tiles[i] === Tile.Tree && fog[i] >= 2 && fog[i] <= CONFIG.fogRadius) cands.push(i);
  }
  if (!cands.length) return -1;
  const i = cands[Math.floor(rand(s) * cands.length)];
  s.tiles[i] = Tile.Relic;
  s.wood[i] = 0;
  s.marked = s.marked.filter((m) => m !== i);
  s.treesLeft--;
  s.relics.push(i);
  s.nextRelicAt = s.treesChopped + relicSpacing(s, ++s.relicsSpawned);
  return i;
}

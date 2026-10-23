import type { GameState } from './types';
import { Tile } from './types';

type Dims = Pick<GameState, 'w' | 'h'>;

export const tileAt = (s: Dims, x: number, y: number) => Math.floor(y) * s.w + Math.floor(x);
export const inBounds = (s: Dims, x: number, y: number) => x >= 0 && y >= 0 && x < s.w && y < s.h;

export function neighbors4(s: Dims, i: number): number[] {
  const out: number[] = [];
  const x = i % s.w;
  if (x > 0) out.push(i - 1);
  if (x < s.w - 1) out.push(i + 1);
  if (i >= s.w) out.push(i - s.w);
  if (i < s.w * (s.h - 1)) out.push(i + s.w);
  return out;
}

export function neighbors8(s: Dims, i: number): number[] {
  const out: number[] = [];
  const x = i % s.w;
  const y = (i / s.w) | 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && inBounds(s, x + dx, y + dy)) out.push(i + dy * s.w + dx);
    }
  }
  return out;
}

/** Owned land: open ground, roads or buildings. Also exactly what villagers can walk on. */
export const isTerritory = (s: GameState, i: number) => s.tiles[i] === Tile.Grass || s.tiles[i] === Tile.Building || s.tiles[i] === Tile.Road;
export const isWalkable = isTerritory;

const touchesTerritory = (s: GameState, i: number) => neighbors4(s, i).some((n) => isTerritory(s, n));

/** A tree the player or villagers can work. */
export const isChoppable = (s: GameState, i: number) => s.tiles[i] === Tile.Tree && touchesTerritory(s, i);

/** A relic the player can pick up. */
export const isCollectable = (s: GameState, i: number) => s.tiles[i] === Tile.Relic && touchesTerritory(s, i);

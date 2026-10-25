import type { AchievementId } from './achievements';
import { inBounds } from './grid';
import type { Cost, Decor, GameState } from './types';
import { Tile } from './types';

/**
 * Decorations are for looks only. Nothing in the simulation reads them: the tiles under them stay open ground,
 * villagers walk over them, and building or laying road over one hands it back (commands.ts). A ground decoration
 * lies flat on the grass; a prop stands up and is drawn in depth order like a building. A tile holds at most one of
 * each layer, so a bench can stand on paving.
 */
export type DecorLayer = 'ground' | 'prop';

export interface DecorDef {
  w: number;
  h: number;
  layer: DecorLayer;
  joins?: true; // joins the same kind of its layer beside it, like a road (fences, hedges, walls, paths; see render/sprites.ts)
  cost: Cost; // flat; removing it, or building over it, returns all of it
  trophy?: { achievement: AchievementId; tier: number }; // locked until that achievement tier is earned (kept across rebuilds)
}

const def = (d: Partial<DecorDef> & Pick<DecorDef, 'cost'>): DecorDef => ({ w: 1, h: 1, layer: 'prop', ...d });

export const DECOR = {
  flowerBed: def({ layer: 'ground', cost: { food: 10 } }),
  paving: def({ layer: 'ground', cost: { stone: 5 } }),
  fence: def({ joins: true, cost: { wood: 10 } }),
  hedge: def({ joins: true, cost: { wood: 5, food: 5 } }),
  lamp: def({ cost: { wood: 20, stone: 10 } }),
  bench: def({ cost: { wood: 30 } }),
  scarecrow: def({ cost: { wood: 20, cloth: 5 } }),
  cherry: def({ cost: { wood: 50, food: 25 } }),
  pond: def({ w: 2, h: 2, layer: 'ground', cost: { stone: 40 } }),
  path: def({ layer: 'ground', joins: true, cost: { stone: 2 } }),
  wall: def({ joins: true, cost: { stone: 10 } }),
  vegPatch: def({ layer: 'ground', cost: { food: 10 } }),
  woodpile: def({ cost: { wood: 25 } }),
  stall: def({ w: 2, cost: { wood: 30, cloth: 10 } }),
  haystack: def({ cost: { food: 15 } }),
  square: def({ w: 3, h: 3, layer: 'ground', cost: { stone: 40 } }),
  garden: def({ w: 3, h: 2, layer: 'ground', cost: { food: 40 } }),
  axeStatue: def({ cost: { gold: 50 }, trophy: { achievement: 'trees', tier: 5 } }),
  shrine: def({ cost: { stone: 50 }, trophy: { achievement: 'relics', tier: 3 } }),
  banner: def({ cost: { cloth: 20, gold: 20 }, trophy: { achievement: 'gold', tier: 4 } }),
  fountain: def({ w: 2, h: 2, cost: { stone: 100 }, trophy: { achievement: 'pop', tier: 4 } }),
  snowman: def({ cost: { food: 5 }, trophy: { achievement: 'winters', tier: 3 } }),
} satisfies Record<string, DecorDef>;
export type DecorKind = keyof typeof DECOR;
export const DECOR_KINDS = Object.keys(DECOR) as DecorKind[];

/** A kind's definition, with every optional field visible. */
export const decorDef = (kind: DecorKind): DecorDef => DECOR[kind];

/** Basic kinds always; a trophy once its achievement tier is earned. */
export function isDecorUnlocked(s: Pick<GameState, 'career'>, kind: DecorKind): boolean {
  const t = decorDef(kind).trophy;
  return !t || (s.career.earned[t.achievement] ?? 0) >= t.tier;
}

/** Tiles a decoration covers. */
export function decorTiles(s: Pick<GameState, 'w'>, d: Pick<Decor, 'kind' | 'x' | 'y'>): number[] {
  const { w, h } = DECOR[d.kind];
  const out: number[] = [];
  for (let y = d.y; y < d.y + h; y++) for (let x = d.x; x < d.x + w; x++) out.push(y * s.w + x);
  return out;
}

const covers = (d: Decor, x: number, y: number) => x >= d.x && x < d.x + DECOR[d.kind].w && y >= d.y && y < d.y + DECOR[d.kind].h;

/** The decoration of `layer` covering tile `i`, if any. */
export function decorAt(s: GameState, i: number, layer: DecorLayer): Decor | undefined {
  const x = i % s.w;
  const y = (i / s.w) | 0;
  return s.decor.find((d) => DECOR[d.kind].layer === layer && covers(d, x, y));
}

/** Every decoration covering tile `i`, of either layer. */
export function decorOn(s: GameState, i: number): Decor[] {
  const x = i % s.w;
  const y = (i / s.w) | 0;
  return s.decor.filter((d) => covers(d, x, y));
}

/** Whether `kind` fits at (x, y): open ground under every tile, and none of them holding another of its layer (`moving` aside). */
export function decorFits(s: GameState, kind: DecorKind, x: number, y: number, moving?: Decor): boolean {
  const { w, h, layer } = DECOR[kind];
  if (!Number.isInteger(x) || !Number.isInteger(y) || !inBounds(s, x, y) || !inBounds(s, x + w - 1, y + h - 1)) return false;
  return decorTiles(s, { kind, x, y }).every((i) => {
    const there = decorAt(s, i, layer);
    return s.tiles[i] === Tile.Grass && (!there || there === moving);
  });
}

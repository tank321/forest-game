import { CONFIG } from '../config';
import { addBuilding, BUILDINGS } from './buildings';
import { relicGap } from './relics';
import { maxWoodTable } from './trees';
import type { GameState, Villager } from './types';
import { Tile } from './types';

export function createInitialState(
  seed = (Math.random() * 2 ** 32) >>> 0,
  size: number = CONFIG.map.size,
  start: number = CONFIG.map.start,
): GameState {
  const n = size * size;
  const o = (size - start) >> 1;
  const s: GameState = {
    seed,
    rng: seed,
    w: size,
    h: size,
    origin: { x: o, y: o, w: start, h: start },
    tiles: new Uint8Array(n).fill(Tile.Tree),
    wood: new Float64Array(n),
    marked: [],
    buildings: [],
    villagers: [],
    resources: { wood: 0, food: 0, stone: 0, leather: 0, gold: 0 },
    upgrades: { axe: 0, farm: 0, pick: 0, coats: 0 },
    hires: { wood: 0, food: 0, leather: 0 },
    paused: [],
    skills: {},
    totals: { wood: 0, food: 0, stone: 0, leather: 0, gold: 0 },
    treesLeft: n - start * start,
    treesChopped: 0,
    relics: [],
    relicsSpawned: 0,
    nextRelicAt: relicGap(0),
    cards: [],
    picksPending: 0,
    nextId: 1,
    time: 0,
  };
  s.wood.set(maxWoodTable(s));
  for (let y = o; y < o + start; y++) s.tiles.fill(Tile.Grass, y * size + o, y * size + o + start);

  const tc = BUILDINGS.townCenter;
  addBuilding(s, 'townCenter', (size - tc.w) >> 1, (size - tc.h) >> 1);
  return s;
}

/** Spawns a villager at the center of the Town Center. */
export function spawnVillager(s: GameState): Villager {
  const b = s.buildings.find((b) => b.kind === 'townCenter')!;
  const def = BUILDINGS[b.kind];
  const v: Villager = {
    id: s.nextId++,
    x: b.x + def.w / 2,
    y: b.y + def.h / 2,
    state: 'idle',
    path: [],
    pathI: 0,
    target: -1,
    carry: 0,
    job: 'lumber',
    workplace: -1,
  };
  s.villagers.push(v);
  return v;
}

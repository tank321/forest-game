import { CONFIG } from '../config';
import { relicGap } from './relics';
import type { GameState } from './types';

const VERSION = 5;

type Serialized = Omit<GameState, 'tiles' | 'wood'> & { tiles: number[]; wood: number[] };
interface SaveFile {
  version: number;
  savedAt: number;
  state: Serialized;
}

/** migrations[v] upgrades a save from version v to v + 1. v1 (alpha 1 map) has none: new game. */
const migrations: Record<number, (f: SaveFile) => SaveFile> = {
  2: (f) => {
    const s = f.state;
    const chopped = s.w * s.h - s.treesLeft - s.origin.w * s.origin.h;
    return {
      ...f,
      version: 3,
      state: {
        ...s,
        skills: {},
        totals: { ...s.resources },
        treesChopped: chopped,
        relics: [],
        relicsSpawned: 0,
        nextRelicAt: chopped + relicGap(0),
        cards: [],
        picksPending: 0,
      },
    };
  },
  3: (f) => {
    const s = f.state;
    return {
      ...f,
      version: 4,
      state: {
        ...s,
        resources: { ...s.resources, food: 0 },
        totals: { ...s.totals, food: 0 },
        upgrades: { ...s.upgrades, farm: 0 },
        hires: { wood: s.villagers.length, food: 0 },
        paused: [],
        villagers: s.villagers.map((v) => ({ ...v, job: 'lumber', workplace: -1 })),
      },
    };
  },
  4: (f) => {
    const s = f.state;
    return {
      ...f,
      version: 5,
      state: {
        ...s,
        resources: { ...s.resources, stone: 0 },
        totals: { ...s.totals, stone: 0 },
        upgrades: { ...s.upgrades, pick: 0 },
      },
    };
  },
};

export function serialize(s: GameState, savedAt = Date.now()): string {
  const state: Serialized = { ...s, tiles: Array.from(s.tiles), wood: Array.from(s.wood) };
  return JSON.stringify({ version: VERSION, savedAt, state } satisfies SaveFile);
}

export function deserialize(json: string): { state: GameState; savedAt: number } {
  let f = JSON.parse(json) as SaveFile;
  while (f.version < VERSION) {
    const m = migrations[f.version];
    if (!m) throw new Error(`Save v${f.version} is incompatible with v${VERSION}`);
    f = m(f);
  }
  const { tiles, wood, ...rest } = f.state;
  return {
    state: { ...rest, tiles: Uint8Array.from(tiles), wood: Float64Array.from(wood) },
    savedAt: f.savedAt,
  };
}

export function saveGame(s: GameState): void {
  localStorage.setItem(CONFIG.save.key, serialize(s));
}

export function loadGame(): { state: GameState; savedAt: number } | null {
  const json = localStorage.getItem(CONFIG.save.key);
  if (!json) return null;
  try {
    return deserialize(json);
  } catch (e) {
    console.error('Corrupt save discarded', e);
    return null;
  }
}

export const clearSave = () => localStorage.removeItem(CONFIG.save.key);

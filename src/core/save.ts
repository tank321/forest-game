import { CONFIG } from '../config';
import { buildingCost } from './economy';
import type { BuildingKind } from './buildings';
import { newLegacy } from './legacy';
import { relicGap } from './relics';
import type { GameState, Resources } from './types';

const VERSION = 17;

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
        hires: { wood: s.villagers.length, food: 0 } as GameState['hires'], // leather joins in v7
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
  5: (f) => {
    const owned = new Map<BuildingKind, number>();
    return {
      ...f,
      version: 6,
      state: {
        ...f.state,
        // Old saves did not record payments. Estimate from build order and saved discounts.
        buildings: f.state.buildings.map((b) => {
          const count = owned.get(b.kind) ?? 0;
          owned.set(b.kind, count + 1);
          return { ...b, paidCost: b.paidCost ?? buildingCost({ ...f.state, legacy: newLegacy() }, b.kind, count) };
        }),
      },
    };
  },
  6: (f) => {
    const s = f.state;
    return {
      ...f,
      version: 7,
      state: {
        ...s,
        // leather was renamed to cloth in v10
        resources: { ...s.resources, leather: 0 } as Resources,
        totals: { ...s.totals, leather: 0 } as Resources,
        hires: { ...s.hires, leather: 0 } as GameState['hires'],
      },
    };
  },
  7: (f) => ({ ...f, version: 8, state: { ...f.state, upgrades: { ...f.state.upgrades, coats: 0 } } }),
  8: (f) => {
    const s = f.state;
    return {
      ...f,
      version: 9,
      state: { ...s, resources: { ...s.resources, gold: 0 }, totals: { ...s.totals, gold: 0 } },
    };
  },
  9: (f) => {
    const s = f.state;
    return {
      ...f,
      version: 10,
      state: {
        ...s,
        resources: leatherToCloth(s.resources),
        totals: leatherToCloth(s.totals),
        hires: leatherToCloth(s.hires),
        buildings: s.buildings.map((b) => ({ ...b, paidCost: leatherToCloth(b.paidCost) })),
      },
    };
  },
  10: (f) => ({ ...f, version: 11, state: { ...f.state, upgrades: { ...f.state.upgrades, barrow: 0 } as GameState['upgrades'] } }),
  11: (f) => ({ ...f, version: 12, state: { ...f.state, buildings: f.state.buildings.map((b) => ({ ...b, tally: {} })) } }),
  // v13 locks buildings behind skills: keep every kind the save already has buildable.
  12: (f) => {
    const skills: Record<string, number> = { ...f.state.skills };
    for (const b of f.state.buildings) if (V13_UNLOCKS[b.kind]) skills[V13_UNLOCKS[b.kind]!] = 1;
    return { ...f, version: 13, state: { ...f.state, skills } };
  },
  // v14 adds roads (a new tile kind). Old buildings have none, so they stand isolated until roads reach them.
  13: (f) => ({ ...f, version: 14 }),
  14: (f) => ({ ...f, version: 15, state: { ...f.state, legacy: newLegacy() } }),
  // v16 splits the Wheelbarrow into Shoes (walk speed) and Backpack (carry), both at its level.
  15: (f) => {
    const { barrow = 0, ...rest } = f.state.upgrades as GameState['upgrades'] & { barrow?: number };
    return { ...f, version: 16, state: { ...f.state, upgrades: { ...rest, shoes: barrow, backpack: barrow } } };
  },
  // v17 adds Guild Contracts and the Merchant Caravan: an empty board, no caravan in town.
  16: (f) => ({ ...f, version: 17, state: { ...f.state, contracts: [], caravan: null } }),
};

/** The skill that unlocked each building kind when v13 introduced unlocks. */
const V13_UNLOCKS: Partial<Record<string, string>> = {
  quarry: 'quarrying', well: 'wells', orchard: 'orchards', sheepFarm: 'sheepFarms', cottonPlantation: 'cottonFields',
  market: 'markets', taxOffice: 'taxOffices', tradingPost: 'tradingPosts',
};

/** v10 renamed leather to cloth. */
function leatherToCloth<T extends object>(r: T): T {
  if (!('leather' in r)) return r;
  const { leather, ...rest } = r;
  return { ...rest, cloth: leather } as T;
}

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

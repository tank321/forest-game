import { CONFIG } from '../config';
import { newCareer, newCounts } from './achievements';
import type { BoostKind, ChestReward, ChestState } from './chest';
import { buildingCost } from './economy';
import type { BuildingKind } from './buildings';
import { isChoppable } from './grid';
import { sameAsk } from './guild';
import { newLegacy } from './legacy';
import { relicGap } from './relics';
import { SKILLS, type SkillId } from './skills';
import { Tile, type GameState, type Resources } from './types';

const VERSION = 30;

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
  // v18 adds achievements: an empty career, and the run's relics collected so far.
  17: (f) => {
    const s = f.state;
    return { ...f, version: 18, state: { ...s, counts: { ...newCounts(), relics: s.relicsSpawned - s.relics.length }, career: newCareer() } };
  },
  // v19 sends tax collectors house to house: houses start owing nothing, and the Satchel upgrade starts at 0.
  18: (f) => ({ ...f, version: 19, state: { ...f.state, upgrades: { ...f.state.upgrades, satchel: 0 } } }),
  // v20 gives Trading Posts pack mules: traders go back to lumberjacking, and the gold they carried is banked.
  19: (f) => {
    const s = f.state;
    const traders = s.villagers.filter((v) => (v.job as string) === 'trade');
    const gold = traders.reduce((n, v) => n + v.carry, 0);
    return {
      ...f,
      version: 20,
      state: {
        ...s,
        resources: { ...s.resources, gold: s.resources.gold + gold },
        totals: { ...s.totals, gold: s.totals.gold + gold },
        villagers: s.villagers.map((v) =>
          traders.includes(v) ? { ...v, job: 'lumber', workplace: -1, state: 'idle', carry: 0, target: -1, path: [], pathI: 0 } : v),
        mules: [],
      },
    };
  },
  // v21 adds the Lucky Chest, ready to open.
  20: (f) => ({ ...f, version: 21, state: { ...f.state, chest: { readyAt: 0, boost: null, pending: null } satisfies V21Chest as unknown as ChestState } }),
  // v22 stores up to three chests and keeps a list of boosts: a ready chest is one stored, and one whose cooldown has
  // passed fills up from then. The running boost and an unclaimed reward carry over.
  21: (f) => {
    const old = f.state.chest as unknown as V21Chest;
    const chest: ChestState = {
      stored: old.readyAt ? 0 : 1,
      readyAt: old.readyAt,
      boosts: old.boost ? [{ ...old.boost, ms: CONFIG.chest.boosts[old.boost.kind].seconds * 1000 }] : [],
      pending: old.pending ? [old.pending] : [],
    };
    return { ...f, version: 22, state: { ...f.state, chest } };
  },
  // v23 lets Trading Posts keep more than one pack mule: every post has the one it had.
  22: (f) => ({
    ...f,
    version: 23,
    state: { ...f.state, buildings: f.state.buildings.map((b) => (b.kind === 'tradingPost' ? { ...b, mules: 1 } : b)) },
  }),
  // v24 keeps a relic on the map until its skill is picked: each pick still owed becomes a relic again, on a tree at the
  // edge of the land (so it can be opened at once), and counts as collected only when picked.
  23: (f) => {
    const { picksPending = 0, ...s } = f.state as Serialized & { picksPending?: number };
    const tiles = [...s.tiles];
    const wood = [...s.wood];
    const relics = [...s.relics];
    const edge = { ...s, tiles } as unknown as GameState;
    let owed = picksPending;
    for (let i = 0; i < tiles.length && owed > 0; i++) {
      if (!isChoppable(edge, i)) continue;
      tiles[i] = Tile.Relic;
      wood[i] = 0;
      relics.push(i);
      owed--;
    }
    const placed = picksPending - owed;
    return {
      ...f,
      version: 24,
      state: { ...s, tiles, wood, relics, treesLeft: s.treesLeft - placed, counts: { ...s.counts, relics: s.counts.relics - placed } },
    };
  },
  // v25 lets a relic's offer be reshuffled once: an offer already dealt hasn't been.
  24: (f) => ({ ...f, version: 25, state: { ...f.state, reshuffled: false } }),
  // v26 condenses the stat skills into fewer, bigger levels: each keeps about its share of the old maximum, rounded up.
  // Roomy Houses keeps +1 per level but stops at 2, so a third level is dropped.
  // Cards for a skill now maxed are dropped from an open offer (an empty offer is dealt again at the relic).
  25: (f) => {
    const skills = { ...f.state.skills };
    for (const [id, old] of Object.entries(V25_MAX) as [SkillId, number][]) {
      const level = skills[id];
      if (level) skills[id] = Math.min(SKILLS[id].max, Math.ceil((level * SKILLS[id].max) / old));
    }
    const cards = f.state.cards.filter((id) => (skills[id] ?? 0) < SKILLS[id].max);
    return { ...f, version: 26, state: { ...f.state, skills, cards, reshuffled: cards.length ? f.state.reshuffled : false } };
  },
  // v27 adds Growing Families' progress toward the next birth.
  26: (f) => ({ ...f, version: 27, state: { ...f.state, births: 0 } }),
  // v28 adds decorations.
  27: (f) => ({ ...f, version: 28, state: { ...f.state, decor: [] } }),
  // v29 keeps the contract board free of repeats: a contract asking for the same as an earlier one is dropped,
  // and the board fills up again at the next season.
  28: (f) => {
    const contracts = f.state.contracts.filter((c, k, all) => !all.slice(0, k).some((d) => sameAsk(c, d)));
    return { ...f, version: 29, state: { ...f.state, contracts } };
  },
  // v30 adds the Mason's Yard: no roads bought yet (and no stone houses, an optional field).
  29: (f) => ({ ...f, version: 30, state: { ...f.state, roadsBought: 0 } }),
};

/** Max levels of the skills v26 shortened. */
const V25_MAX: Partial<Record<SkillId, number>> = {
  sharpAxes: 5, bigBaskets: 5, swiftFeet: 5, greenThumbs: 5, stonecutters: 5, taxCollectors: 5,
  recruiters: 3, masons: 3, rootCellars: 3, roomyHouses: 3,
};

/** The Lucky Chest in v21: one chest, one boost and one unclaimed reward. */
interface V21Chest {
  readyAt: number;
  boost: { kind: BoostKind; until: number } | null;
  pending: ChestReward | null;
}

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

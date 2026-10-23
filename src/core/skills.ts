import { rand } from './rng';
import type { GameState } from './types';

/** Skills and their max levels. Effects are applied in stats.ts / economy.ts; text lives in ui/text.ts. */
export const SKILLS = {
  sharpAxes: { max: 5 }, // +20% villager chop speed / lvl
  bigBaskets: { max: 5 }, // +2 carry / lvl
  swiftFeet: { max: 5 }, // +10% walk speed / lvl
  powerSwing: { max: 2 }, // manual chop ×5 / lvl
  roomyHouses: { max: 3 }, // +1 pop per house / lvl
  recruiters: { max: 3 }, // villagers −15% / lvl
  masterBuilders: { max: 1 }, // buildings −20%
  campCrews: { max: 1 }, // ×1.5 chop within 3 tiles of a Lumber Camp
  teamwork: { max: 1 }, // 2 villagers per tree
  greenThumbs: { max: 5 }, // +20% farm harvest / lvl
  stonecutters: { max: 5 }, // +20% mining speed / lvl
  masons: { max: 3 }, // stone costs −15% / lvl
  quarryCrews: { max: 2 }, // +1 miner per quarry / lvl
  deepWells: { max: 1 }, // well radius +1
  fertileHerding: { max: 1 }, // herders also deliver food equal to their cloth
  taxCollectors: { max: 5 }, // +20% tax / lvl
  packMules: { max: 3 }, // +25% gold per trade trip / lvl
  shrewdTraders: { max: 2 }, // market commission −5 points / lvl
  // Building unlocks (see BuildingDef.unlock)
  quarrying: { max: 1 },
  wells: { max: 1 },
  orchards: { max: 1 },
  sheepFarms: { max: 1 },
  cottonFields: { max: 1 },
  markets: { max: 1 },
  taxOffices: { max: 1 },
  tradingPosts: { max: 1 },
} as const satisfies Record<string, { max: number }>;
export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

/**
 * Skill tracks, easier → better. A skill can be offered once the one before it has a level,
 * so each track unlocks in order. Every skill belongs to exactly one track.
 */
export const TRACKS = {
  forestry: ['sharpAxes', 'powerSwing', 'campCrews', 'teamwork'],
  villagers: ['swiftFeet', 'bigBaskets', 'roomyHouses', 'recruiters'],
  buildings: ['masterBuilders', 'masons'],
  farming: ['greenThumbs', 'wells', 'deepWells', 'orchards'],
  herding: ['sheepFarms', 'fertileHerding', 'cottonFields'],
  mining: ['quarrying', 'stonecutters', 'quarryCrews'],
  trade: ['markets', 'taxOffices', 'taxCollectors', 'tradingPosts', 'packMules', 'shrewdTraders'],
} as const satisfies Record<string, readonly SkillId[]>;
export type Track = keyof typeof TRACKS;
export const TRACK_IDS = Object.keys(TRACKS) as Track[];

const TRACK_OF = Object.fromEntries(
  TRACK_IDS.flatMap((t) => TRACKS[t].map((id) => [id, t])),
) as Record<SkillId, Track>;
export const trackOf = (id: SkillId): Track => TRACK_OF[id];

/** The skill before this one in its track, if any. */
export function prerequisite(id: SkillId): SkillId | undefined {
  const track: readonly SkillId[] = TRACKS[trackOf(id)];
  return track[track.indexOf(id) - 1];
}

export const lvl = (s: Pick<GameState, 'skills'>, id: SkillId) => s.skills[id] ?? 0;

export function availableSkills(s: GameState): SkillId[] {
  return SKILL_IDS.filter((id) => {
    const req = prerequisite(id);
    return lvl(s, id) < SKILLS[id].max && (!req || lvl(s, req) > 0);
  });
}

/**
 * Offer up to `n` distinct available skills (seeded, so reloads see the same cards).
 * Each comes from a different track while untouched tracks remain.
 */
export function dealCards(s: GameState, n = 3): void {
  const pool = availableSkills(s);
  s.cards = [];
  while (s.cards.length < n && pool.length) {
    const fresh = pool.filter((id) => !s.cards.some((c) => trackOf(c) === trackOf(id)));
    const from = fresh.length ? fresh : pool;
    const id = from[Math.floor(rand(s) * from.length)];
    s.cards.push(id);
    pool.splice(pool.indexOf(id), 1);
  }
}

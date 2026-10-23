import { rand } from './rng';
import type { GameState } from './types';

export interface SkillDef {
  max: number;
  requires?: string; // another SkillId that must have at least one level
}

/** Skill tree. Effects are applied in stats.ts / economy.ts; text lives in ui/text.ts. */
export const SKILLS = {
  sharpAxes: { max: 5 }, // +20% villager chop speed / lvl
  bigBaskets: { max: 5 }, // +2 carry / lvl
  swiftFeet: { max: 5 }, // +10% walk speed / lvl
  powerSwing: { max: 2 }, // manual chop ×5 / lvl
  roomyHouses: { max: 3 }, // +1 pop per house / lvl
  recruiters: { max: 3, requires: 'roomyHouses' }, // villagers −15% / lvl
  masterBuilders: { max: 1 }, // buildings −20%
  campCrews: { max: 1, requires: 'sharpAxes' }, // ×1.5 chop within 3 tiles of a Lumber Camp
  teamwork: { max: 1, requires: 'bigBaskets' }, // 2 villagers per tree
} as const satisfies Record<string, SkillDef>;
export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

export const lvl = (s: GameState, id: SkillId) => s.skills[id] ?? 0;

export function availableSkills(s: GameState): SkillId[] {
  return SKILL_IDS.filter((id) => {
    const d: SkillDef = SKILLS[id];
    return lvl(s, id) < d.max && (!d.requires || lvl(s, d.requires as SkillId) > 0);
  });
}

/** Offer up to `n` distinct available skills (seeded, so reloads see the same cards). */
export function dealCards(s: GameState, n = 3): void {
  const pool = availableSkills(s);
  s.cards = [];
  while (s.cards.length < n && pool.length) s.cards.push(...pool.splice(Math.floor(rand(s) * pool.length), 1));
}

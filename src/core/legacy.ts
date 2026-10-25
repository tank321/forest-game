import { CONFIG } from '../config';
import { lvl, SKILL_IDS, SKILLS } from './skills';
import type { GameState } from './types';

/** Legacy perks in tree order. Effects are applied in stats.ts / economy.ts / state.ts; text lives in ui/text.ts. */
export const PERK_IDS = [
  'masterHarvest', 'swiftAndStrong', 'urbanCore', 'tradeGuilds', 'prosperousCity', 'royalBank', 'relicHunters', 'legacyX2',
] as const;
export type PerkId = (typeof PERK_IDS)[number];

/**
 * A trunk (Master Harvest → Swift & Strong) forks into a city branch and a commerce branch,
 * which join at Relic Hunters. Every perk is one level except Legacy ×2, which can be taken every rebuild.
 */
export const LEGACY: Record<PerkId, { requires: readonly PerkId[]; repeat?: true }> = {
  masterHarvest: { requires: [] },
  swiftAndStrong: { requires: ['masterHarvest'] },
  urbanCore: { requires: ['swiftAndStrong'] },
  prosperousCity: { requires: ['urbanCore'] },
  tradeGuilds: { requires: ['swiftAndStrong'] },
  royalBank: { requires: ['tradeGuilds'] },
  relicHunters: { requires: ['prosperousCity', 'royalBank'] },
  legacyX2: { requires: ['relicHunters'], repeat: true },
};

export type Legacy = GameState['legacy'];
export const newLegacy = (): Legacy => ({ runs: 0, perks: {} });

export const perk = (s: Pick<GameState, 'legacy'>, id: PerkId) => s.legacy.perks[id] ?? 0;
/** The perk's multiplier when owned, otherwise 1. */
export const perkMult = (s: Pick<GameState, 'legacy'>, id: PerkId, mult: number) => (perk(s, id) ? mult : 1);

/** Perks that can be taken at the next rebuild. */
export const availablePerks = (s: GameState): PerkId[] =>
  PERK_IDS.filter((id) => (LEGACY[id].repeat || !perk(s, id)) && LEGACY[id].requires.every((r) => perk(s, r)));

/** Skill levels learned this run. */
/** Skills a relic offers to choose from: more every rebuild, up to a cap, and Relic Hunters adds more on top. */
export function cardsPerPick(s: Pick<GameState, 'legacy'>): number {
  const { base, perRun, max } = CONFIG.legacy.cards;
  return Math.min(max, base + perRun * s.legacy.runs) + perk(s, 'relicHunters') * CONFIG.legacy.perks.relicHunters.cards;
}

export const skillLevels = (s: GameState) => SKILL_IDS.reduce((n, id) => n + lvl(s, id), 0);

/** Skill levels needed to rebuild: rises every run, never past every skill maxed. */
export function legacyRequirement(s: GameState): number {
  const all = SKILL_IDS.reduce((n, id) => n + SKILLS[id].max, 0);
  return Math.min(CONFIG.legacy.base + CONFIG.legacy.step * s.legacy.runs, all);
}

export const canPrestige = (s: GameState) => skillLevels(s) >= legacyRequirement(s);

/** Villagers a run starts with (Prosperous City); they eat and burn nothing. */
export const startVillagers = (s: Pick<GameState, 'legacy'>) =>
  perk(s, 'prosperousCity') ? CONFIG.legacy.perks.prosperousCity.villagers : 0;

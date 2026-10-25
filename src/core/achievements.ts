import { CONFIG } from '../config';
import { BUILDINGS, countOf, isUnlocked, type BuildingKind } from './buildings';
import { skillLevels } from './legacy';
import { lvl, SKILL_IDS, SKILLS } from './skills';
import { getStats } from './stats';
import { EVENTS, Tile, type EventKey, type GameState } from './types';
import type { World } from './world';

/** Achievements give no rewards. Earned tiers are kept across rebuilds in `GameState.career`; text and icons live in ui/text.ts. */

type CounterDef = { run: (s: GameState) => number; best?: boolean };
const YEAR = CONFIG.seasons.length * 4;

/** Lifetime counters: this run's value plus past runs', summed or, for `best`, the best run. */
const COUNTERS = {
  trees: { run: (s) => s.treesChopped },
  wood: { run: (s) => s.totals.wood },
  food: { run: (s) => s.totals.food },
  stone: { run: (s) => s.totals.stone },
  cloth: { run: (s) => s.totals.cloth },
  gold: { run: (s) => s.totals.gold },
  taps: { run: (s) => s.counts.taps },
  relics: { run: (s) => s.counts.relics },
  fleece: { run: (s) => s.counts.fleece },
  geodes: { run: (s) => s.counts.geodes },
  blasts: { run: (s) => s.counts.blasts },
  contracts: { run: (s) => s.counts.contracts },
  deals: { run: (s) => s.counts.deals },
  winters: { run: (s) => Math.floor(s.time / YEAR) },
  pop: { run: (s) => s.villagers.length, best: true },
  land: { run: (s) => s.w * s.h - s.treesLeft - s.relics.length, best: true },
  buildings: { run: (s) => s.buildings.length, best: true },
  upgrades: { run: (s) => Object.values(s.upgrades).reduce((a, b) => a + b, 0), best: true },
  skills: { run: skillLevels, best: true },
  chain: { run: (s) => s.counts.chain, best: true },
  blastTrees: { run: (s) => s.counts.blastTrees, best: true },
} satisfies Record<string, CounterDef>;
export type Counter = keyof typeof COUNTERS;
const COUNTER_IDS = Object.keys(COUNTERS) as Counter[];

export type Career = GameState['career'];
export const newCareer = (): Career => ({ past: Object.fromEntries(COUNTER_IDS.map((c) => [c, 0])) as Career['past'], earned: {} });
export const newCounts = () => Object.fromEntries(EVENTS.map((e) => [e, 0])) as Record<EventKey, number>;

export function lifetime(s: GameState, c: Counter): number {
  const d: CounterDef = COUNTERS[c];
  const run = d.run(s);
  return d.best ? Math.max(s.career.past[c], run) : s.career.past[c] + run;
}

/** The career a rebuild carries into the next run: this run folded into the past counters. */
export const nextCareer = (s: GameState): Career => ({
  past: Object.fromEntries(COUNTER_IDS.map((c) => [c, lifetime(s, c)])) as Career['past'],
  earned: { ...s.career.earned },
});

/** Adds to a run counter. */
export const count = (s: GameState, e: EventKey, n = 1) => void (s.counts[e] += n);
/** Raises a best-of run counter (`chain`, `blastTrees`). */
export const record = (s: GameState, e: EventKey, n: number) => void (s.counts[e] = Math.max(s.counts[e], n));

export type AchievementGroup = 'gathering' | 'town' | 'firsts' | 'feats';
export interface AchievementDef {
  group: AchievementGroup;
  metric: (s: GameState) => number;
  tiers: readonly number[]; // metric needed for each tier; one-offs have the single tier 1
  secret?: true; // hidden until earned
  building?: BuildingKind; // a first-building achievement, shown with that building's picture
}

const ladder = (c: Counter, tiers: number[], group: AchievementGroup = 'gathering'): AchievementDef => ({ group, metric: (s) => lifetime(s, c), tiers });
const first = (kind: BuildingKind): AchievementDef => ({ group: 'firsts', metric: (s) => Number(countOf(s, kind) > 0), tiers: [1], building: kind });
const feat = (done: (s: GameState) => boolean, secret?: true): AchievementDef => ({ group: 'feats', metric: (s) => Number(done(s)), tiers: [1], secret });

const KINDS = Object.keys(BUILDINGS) as BuildingKind[];

export const ACHIEVEMENTS = {
  trees: ladder('trees', [10, 100, 1e3, 1e4, 1e5]),
  wood: ladder('wood', [100, 1e3, 1e4, 1e5, 1e6, 1e7]),
  food: ladder('food', [50, 500, 5e3, 5e4, 5e5]),
  stone: ladder('stone', [25, 250, 2500, 25e3, 25e4]),
  cloth: ladder('cloth', [20, 200, 2e3, 2e4, 2e5]),
  gold: ladder('gold', [100, 1e3, 1e4, 1e5, 1e6]),
  taps: ladder('taps', [10, 100, 1e3, 1e4, 1e5]),
  pop: ladder('pop', [5, 10, 25, 50, 100], 'town'),
  land: ladder('land', [100, 500, 2000, 5000], 'town'),
  buildings: ladder('buildings', [5, 10, 25, 50, 100], 'town'),
  upgrades: ladder('upgrades', [1, 5, 15, 30, 60, 100], 'town'),
  relics: ladder('relics', [1, 5, 25, 100], 'town'),
  skills: ladder('skills', [3, 10, 25, 50], 'town'),
  winters: ladder('winters', [1, 5, 25, 100], 'town'),
  contracts: ladder('contracts', [1, 10, 50, 250], 'town'),
  rebuilds: { group: 'town', metric: (s) => s.legacy.runs, tiers: [1, 3, 10, 25] },
  firstRoad: { group: 'firsts', metric: (s) => Number(s.tiles.includes(Tile.Road)), tiers: [1] },
  firstHouse: first('house'),
  firstLumberCamp: first('lumberCamp'),
  firstBarn: first('barn'),
  firstFarm: first('farm'),
  firstQuarry: first('quarry'),
  firstWell: first('well'),
  firstOrchard: first('orchard'),
  firstSheepFarm: first('sheepFarm'),
  firstTailor: first('tailor'),
  firstCotton: first('cottonPlantation'),
  firstMarket: first('market'),
  firstTaxOffice: first('taxOffice'),
  firstTradingPost: first('tradingPost'),
  firstOutpost: first('outpost'),
  clearCut: feat((s) => s.treesLeft === 0),
  allBuildings: feat((s) => KINDS.every((k) => isUnlocked(s, k))),
  maxSkill: feat((s) => SKILL_IDS.some((id) => SKILLS[id].max > 1 && lvl(s, id) >= SKILLS[id].max)),
  caravan: feat((s) => lifetime(s, 'deals') > 0),
  dynamite: feat((s) => lifetime(s, 'blasts') > 0),
  domino: feat((s) => lifetime(s, 'chain') >= 5, true),
  goldenTouch: feat((s) => lifetime(s, 'fleece') > 0, true),
  hiddenGem: feat((s) => lifetime(s, 'geodes') > 0, true),
  bigBang: feat((s) => lifetime(s, 'blastTrees') >= 10, true),
  eagerBeaver: feat((s) => s.time <= 60 && s.treesChopped >= 20, true),
  hardTimes: feat((s) => {
    const st = getStats(s);
    return st.hungry && st.cold;
  }, true),
} satisfies Record<string, AchievementDef>;
export type AchievementId = keyof typeof ACHIEVEMENTS;
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];

export const tiersOf = (id: AchievementId): readonly number[] => ACHIEVEMENTS[id].tiers;
export const earned = (s: GameState, id: AchievementId) => s.career.earned[id] ?? 0;
export const earnedTiers = (s: GameState) => ACHIEVEMENT_IDS.reduce((n, id) => n + earned(s, id), 0);
export const TOTAL_TIERS = ACHIEVEMENT_IDS.reduce((n, id) => n + tiersOf(id).length, 0);

/** Records every tier now reached and returns the newly earned ones (a jump past several tiers is one entry, at the highest). */
export function checkAchievements(s: GameState): { id: AchievementId; tier: number }[] {
  const out: { id: AchievementId; tier: number }[] = [];
  for (const id of ACHIEVEMENT_IDS) {
    const tiers = tiersOf(id);
    const have = earned(s, id);
    if (have === tiers.length) continue;
    const v = ACHIEVEMENTS[id].metric(s);
    let tier = have;
    while (tier < tiers.length && v >= tiers[tier]) tier++;
    if (tier === have) continue;
    s.career.earned[id] = tier;
    out.push({ id, tier });
  }
  return out;
}

export function achievementSystem(w: World): void {
  for (const { id, tier } of checkAchievements(w.state)) w.fx.push({ kind: 'achievement', i: -1, n: tier, id });
}

/** Progress toward the next tier: the metric, the goal, and the share of the way from the previous tier (null when every tier is earned). */
export function progress(s: GameState, id: AchievementId): { value: number; goal: number; frac: number } | null {
  const tiers = tiersOf(id);
  const have = earned(s, id);
  if (have === tiers.length) return null;
  const value = ACHIEVEMENTS[id].metric(s);
  const prev = have ? tiers[have - 1] : 0;
  const goal = tiers[have];
  return { value, goal, frac: Math.min(1, Math.max(0, (value - prev) / (goal - prev))) };
}

/** The visible achievement closest to its next tier. */
export function nextUp(s: GameState): AchievementId | undefined {
  let best: AchievementId | undefined;
  let frac = -1;
  for (const id of ACHIEVEMENT_IDS) {
    if ((ACHIEVEMENTS[id] as AchievementDef).secret) continue;
    const p = progress(s, id);
    if (p && p.frac > frac) [best, frac] = [id, p.frac];
  }
  return best;
}

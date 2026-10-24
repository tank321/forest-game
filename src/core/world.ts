import { CONFIG } from '../config';
import { record, type AchievementId } from './achievements';
import { gain } from './economy';
import { rushReached } from './flags';
import { isTerritory, neighbors8 } from './grid';
import { buildField, type Field } from './pathing';
import { spawnRelic } from './relics';
import { linkedBuildings } from './roads';
import { rand } from './rng';
import { lvl, SKILLS } from './skills';
import { maxWoodTable } from './trees';
import type { GameState, Job, ResourceKey, Resources } from './types';
import { RESOURCES, Tile } from './types';

/** Where gathered goods come from: a job's deliveries, pack mules' trade, chopping by hand, tax, or skill bonuses (Heartwood, Timber!, festivals, jackpots, grazing). */
export type Source = Job | 'trade' | 'hand' | 'tax' | 'bonus';
const SOURCE_KEYS: Record<Source, true> = { lumber: true, farm: true, orchard: true, mine: true, herd: true, cotton: true, trade: true, hand: true, tax: true, bonus: true };

/** A moment for the UI to show: floating text over tile `i` (a combo multiplier or an amount `n`), or the festival's food `n`. */
export interface Fx {
  kind: 'combo' | 'heartwood' | 'timber' | 'festival' | 'shearing' | 'fleece' | 'geode' | 'grazed' | 'blast' | 'fair' | 'caravan' | 'achievement';
  i: number; // -1 for the festival
  n: number; // an achievement's tier
  id?: AchievementId; // the achievement earned
}

/** Fog is measured this far, so Keen Eyes can widen the view without restamping. */
export const MAX_FOG = CONFIG.fogRadius + CONFIG.skills.keenEyes.vision * SKILLS.keenEyes.max;
/** Trees further than this from territory are hidden. */
export const visionRadius = (s: Pick<GameState, 'skills'>) => CONFIG.fogRadius + CONFIG.skills.keenEyes.vision * lvl(s, 'keenEyes');
export const SOURCES = Object.keys(SOURCE_KEYS) as Source[];

/** Runtime container: persistent state plus derived data that is never saved. */
export interface World {
  state: GameState;
  fields: Record<ResourceKey, Field>; // drop-off distance field per resource
  fog: Uint8Array; // Chebyshev distance to territory, capped at MAX_FOG + 1
  maxWood: Float64Array; // full-grown wood per tile (static)
  dev: { manualMult: number; speed: number }; // dev-only testing aids (never saved); speed scales the live loop
  gathered: Record<Source, Resources>; // gathered per source since this World was made; for the HUD only, never saved or read by the simulation
  fx: Fx[]; // effects for the UI to show and clear; never saved or read by the simulation
  combo: { n: number; at: number }; // Momentum: taps chained so far and the sim time of the last; never saved
  blastReady: Map<number, number>; // Dynamite: Quarry id -> sim time it can blast again; never saved
}

export function createWorld(state: GameState): World {
  const w: World = {
    state,
    fields: buildFields(state),
    fog: new Uint8Array(state.w * state.h).fill(MAX_FOG + 1),
    maxWood: maxWoodTable(state),
    dev: { manualMult: 1, speed: 1 },
    gathered: Object.fromEntries(SOURCES.map((src) => [src, Object.fromEntries(RESOURCES.map((r) => [r, 0]))])) as World['gathered'],
    fx: [],
    combo: { n: 0, at: -Infinity },
    blastReady: new Map(),
  };
  for (let i = 0; i < state.tiles.length; i++) if (isTerritory(state, i)) stampFog(w, i);
  return w;
}

function stampFog(w: World, i: number): void {
  const { w: sw, h: sh } = w.state;
  const R = MAX_FOG;
  const cx = i % sw;
  const cy = (i / sw) | 0;
  for (let y = Math.max(0, cy - R); y <= Math.min(sh - 1, cy + R); y++) {
    for (let x = Math.max(0, cx - R); x <= Math.min(sw - 1, cx + R); x++) {
      const j = y * sw + x;
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      if (d < w.fog[j]) w.fog[j] = d;
    }
  }
}

/** Turns a tile into territory (open ground). */
export function claimTile(w: World, i: number): void {
  const s = w.state;
  s.tiles[i] = Tile.Grass;
  s.wood[i] = 0;
  s.marked = s.marked.filter((m) => m !== i);
  stampFog(w, i);
  w.fields = buildFields(s);
  rushReached(w, i);
}

/**
 * The single place a tree is felled. Heartwood may pay bonus wood, and Timber! topples it onto a
 * random neighbouring tree, which can fell that one too (a chain).
 */
export function clearTree(w: World, i: number, chain = 0): void {
  const s = w.state;
  const k = CONFIG.skills;
  s.treesLeft--;
  s.treesChopped++;
  claimTile(w, i);
  if (s.treesChopped >= s.nextRelicAt) spawnRelic(s, w.fog);
  const heart = lvl(s, 'heartwood');
  if (heart && rand(s) < k.heartwood.chance * heart) {
    const n = k.heartwood.bonus * w.maxWood[i];
    gainBonus(w, 'wood', n);
    w.fx.push({ kind: 'heartwood', i, n });
  }
  if (!lvl(s, 'timber')) return;
  const trees = neighbors8(s, i).filter((n) => s.tiles[n] === Tile.Tree);
  if (!trees.length) return;
  const hit = trees[Math.floor(rand(s) * trees.length)];
  const n = Math.min(k.timber * w.maxWood[i], s.wood[hit]);
  s.wood[hit] -= n;
  gainBonus(w, 'wood', n);
  w.fx.push({ kind: 'timber', i: hit, n });
  if (s.wood[hit] > 0) return;
  record(s, 'chain', chain + 1);
  clearTree(w, hit, chain + 1);
}

/** Goods from a skill bonus, counted under the 'bonus' source. */
export function gainBonus(w: World, res: ResourceKey, n: number): void {
  gain(w.state, res, n);
  w.gathered.bonus[res] += n;
}

/** Drop-off fields must be rebuilt when drop-off buildings or roads change. */
export function onBuildingsChanged(w: World): void {
  w.fields = buildFields(w.state);
}

function buildFields(s: GameState): Record<ResourceKey, Field> {
  const linked = linkedBuildings(s);
  return Object.fromEntries(RESOURCES.map((r) => [r, buildField(s, r, linked)])) as Record<ResourceKey, Field>;
}

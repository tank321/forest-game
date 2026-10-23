import { CONFIG } from '../config';
import { addBuilding, BUILDINGS, buildingAt, buildingById, CITY_KINDS, footprint, type BuildingKind } from './buildings';
import { axeCost, buildingCost, farmUpgradeCost, gain, pay, popCap, villagerCost } from './economy';
import { inBounds, isChoppable, isCollectable, neighbors4 } from './grid';
import { dealCards, lvl, SKILLS, type SkillId } from './skills';
import { spawnVillager } from './state';
import { getStats } from './stats';
import { Tile } from './types';
import { claimTile, clearTree, onBuildingsChanged, type World } from './world';

/** Player actions. The UI mutates game state only through these; each validates itself. */

export function chopTree(w: World, i: number): boolean {
  const s = w.state;
  if (!isChoppable(s, i)) return false;
  const amt = Math.min(getStats(s).manualChop * w.dev.manualMult, s.wood[i]);
  s.wood[i] -= amt;
  gain(s, 'wood', amt);
  if (s.wood[i] === 0) clearTree(w, i);
  return true;
}

export function toggleMark(w: World, i: number): boolean {
  const s = w.state;
  if (s.tiles[i] !== Tile.Tree || w.fog[i] > CONFIG.fogRadius) return false;
  const m = s.marked.indexOf(i);
  if (m === -1) s.marked.push(i);
  else s.marked.splice(m, 1);
  return true;
}

/** Hire a villager paid in wood or food (separate price tracks, shared population cap). */
export function hireVillager(w: World, res: 'wood' | 'food' = 'wood'): boolean {
  const s = w.state;
  if (s.villagers.length >= popCap(s) || !pay(s, villagerCost(s, res))) return false;
  s.hires[res]++;
  spawnVillager(s);
  return true;
}

const UPGRADE_COST = { axe: axeCost, farm: farmUpgradeCost };

export function upgrade(w: World, kind: keyof typeof UPGRADE_COST): boolean {
  const s = w.state;
  const cost = UPGRADE_COST[kind](s.upgrades[kind]);
  if (!cost || !pay(s, cost)) return false;
  s.upgrades[kind]++;
  return true;
}

export const upgradeAxe = (w: World) => upgrade(w, 'axe');

/** Pause/resume a workplace; its workers return to lumberjacking while paused. */
export function togglePause(w: World, id: number): boolean {
  const s = w.state;
  const b = buildingById(s, id);
  if (!b || !BUILDINGS[b.kind].workers) return false;
  s.paused = s.paused.includes(id) ? s.paused.filter((p) => p !== id) : [...s.paused, id];
  return true;
}

export function canPlace(w: World, kind: BuildingKind, x: number, y: number): boolean {
  const s = w.state;
  const def = BUILDINGS[kind];
  if (!def.buildable || !inBounds(s, x, y) || !inBounds(s, x + def.w - 1, y + def.h - 1)) return false;
  const tiles = footprint(s, { kind, x, y });
  if (tiles.some((i) => s.tiles[i] !== Tile.Grass)) return false;
  if (!def.cityNeighbor) return true;
  return tiles.some((i) =>
    neighbors4(s, i).some((n) => {
      const b = s.tiles[n] === Tile.Building ? buildingAt(s, n) : undefined;
      return b !== undefined && CITY_KINDS.includes(b.kind);
    }),
  );
}

export function placeBuilding(w: World, kind: BuildingKind, x: number, y: number): boolean {
  const s = w.state;
  if (!canPlace(w, kind, x, y) || !pay(s, buildingCost(s, kind))) return false;
  addBuilding(s, kind, x, y);
  if (BUILDINGS[kind].dropoff.length) onBuildingsChanged(w);
  return true;
}

/** Picks up a relic touching territory; its tile becomes territory and a skill pick is owed. */
export function collectRelic(w: World, i: number): boolean {
  const s = w.state;
  if (!isCollectable(s, i)) return false;
  s.relics = s.relics.filter((r) => r !== i);
  claimTile(w, i);
  s.picksPending++;
  if (!s.cards.length) dealCards(s);
  if (!s.cards.length) s.picksPending = 0; // every skill maxed
  return true;
}

export function pickSkill(w: World, id: SkillId): boolean {
  const s = w.state;
  if (!s.cards.includes(id) || lvl(s, id) >= SKILLS[id].max) return false;
  s.skills[id] = lvl(s, id) + 1;
  s.picksPending--;
  if (s.picksPending > 0) dealCards(s);
  else s.cards = [];
  if (!s.cards.length) s.picksPending = 0;
  return true;
}

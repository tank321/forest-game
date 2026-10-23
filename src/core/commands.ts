import { CONFIG } from '../config';
import { addBuilding, BUILDINGS, buildingAt, buildingById, CITY_KINDS, footprint, type BuildingKind } from './buildings';
import { buildingCost, buildingRefund, gain, pay, popCap, upgradeCost, villagerCost, type UpgradeKind } from './economy';
import { inBounds, isChoppable, isCollectable, neighbors4 } from './grid';
import { dealCards, lvl, SKILLS, type SkillId } from './skills';
import { spawnVillager } from './state';
import { getStats } from './stats';
import { Tile, type Building, type ResourceKey } from './types';
import { goHome } from './systems/movement';
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

export function upgrade(w: World, kind: UpgradeKind): boolean {
  const s = w.state;
  const cost = upgradeCost(s, kind);
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
  return canPlaceAt(w, kind, x, y);
}

function canPlaceAt(w: World, kind: BuildingKind, x: number, y: number, moving?: Building): boolean {
  const s = w.state;
  const def = BUILDINGS[kind];
  if (!def.buildable || !Number.isInteger(x) || !Number.isInteger(y) ||
    !inBounds(s, x, y) || !inBounds(s, x + def.w - 1, y + def.h - 1)) return false;
  const tiles = footprint(s, { kind, x, y });
  const own = new Set(moving ? footprint(s, moving) : []);
  if (tiles.some((i) => s.tiles[i] !== Tile.Grass && !own.has(i))) return false;
  if (!def.cityNeighbor) return true;
  return tiles.some((i) =>
    neighbors4(s, i).some((n) => {
      const b = s.tiles[n] === Tile.Building ? buildingAt(s, n) : undefined;
      return b !== undefined && b.id !== moving?.id && CITY_KINDS.includes(b.kind);
    }),
  );
}

export function placeBuilding(w: World, kind: BuildingKind, x: number, y: number): boolean {
  const s = w.state;
  if (!canPlace(w, kind, x, y)) return false;
  const cost = buildingCost(s, kind);
  if (!pay(s, cost)) return false;
  addBuilding(s, kind, x, y, cost);
  if (BUILDINGS[kind].dropoff.length) onBuildingsChanged(w);
  return true;
}

export function canMoveBuilding(w: World, id: number, x: number, y: number): boolean {
  const b = buildingById(w.state, id);
  return b !== undefined && b.kind !== 'townCenter' && canPlaceAt(w, b.kind, x, y, b);
}

/** Move atomically: the original stays in place until a valid destination is chosen. */
export function moveBuilding(w: World, id: number, x: number, y: number): boolean {
  if (!canMoveBuilding(w, id, x, y)) return false;
  const b = buildingById(w.state, id)!;
  if (b.x === x && b.y === y) return true;
  for (const i of footprint(w.state, b)) w.state.tiles[i] = Tile.Grass;
  b.x = x;
  b.y = y;
  for (const i of footprint(w.state, b)) w.state.tiles[i] = Tile.Building;
  refreshBuildingRoutes(w, b, false);
  return true;
}

/** Permanently removes a building, leaving cleared land. Refunds are not gathered production. */
export function removeBuilding(w: World, id: number): boolean {
  const s = w.state;
  const b = buildingById(s, id);
  if (!b || b.kind === 'townCenter') return false;
  const refund = buildingRefund(b);
  for (const i of footprint(s, b)) s.tiles[i] = Tile.Grass;
  s.buildings = s.buildings.filter((other) => other.id !== id);
  s.paused = s.paused.filter((pausedId) => pausedId !== id);
  for (const [r, n] of Object.entries(refund)) s.resources[r as ResourceKey] += n;
  refreshBuildingRoutes(w, b, true);
  return true;
}

function refreshBuildingRoutes(w: World, b: Building, removed: boolean): void {
  const dropoff = BUILDINGS[b.kind].dropoff.length > 0;
  if (dropoff) onBuildingsChanged(w);
  for (const v of w.state.villagers) {
    const assigned = v.workplace === b.id;
    if (assigned && (v.carry > 0 || v.state === 'toHome')) {
      goHome(w, v, v.job === 'farm' ? 'food' : 'stone');
    } else if (assigned) {
      v.path = [];
      v.pathI = 0;
      v.state = 'idle';
      if (removed) { v.job = 'lumber'; v.workplace = -1; v.target = -1; }
    } else if (dropoff && v.state === 'toHome') {
      goHome(w, v, v.job === 'lumber' ? 'wood' : v.job === 'farm' ? 'food' : 'stone');
    }
  }
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

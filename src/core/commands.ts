import { CONFIG } from '../config';
import { count, nextCareer, record } from './achievements';
import { chestMult, isBoost, rollChest, windfall, type ChestReward } from './chest';
import { addBuilding, atLimit, BUILDINGS, buildingAt, buildingById, CITY_KINDS, footprint, HUB_KINDS, isUnlocked, type BuildingKind } from './buildings';
import {
  buildingCost, buildingRefund, gain, marketQuote, pay, popCap, upgradeCost, villagerCost, type TradeResource, type UpgradeKind,
} from './economy';
import { inBounds, isChoppable, isCollectable, neighbors4, neighbors8 } from './grid';
import { rushToMark } from './flags';
import { contractDone, newContract } from './guild';
import { availablePerks, canPrestige, perk, type PerkId } from './legacy';
import { rand } from './rng';
import { linkedBuildings, roadsBuilt, roadStock } from './roads';
import { dealCards, lvl, SKILLS, type SkillId } from './skills';
import { createInitialState, spawnVillager } from './state';
import { getStats } from './stats';
import { RESOURCES, Tile, type Building, type Cost, type GameState, type HireResource, type ResourceKey, type Resources, type Villager } from './types';
import { collectorHome } from './systems/collector';
import { goHome } from './systems/movement';
import { rerouteMules } from './systems/mules';
import { burst, jobResource } from './systems/workplace';
import { claimTile, clearTree, gainBonus, onBuildingsChanged, visionRadius, type World } from './world';

/** Player actions. The UI mutates game state only through these; each validates itself. */

/** A tap: Momentum chains quick taps into a combo, and Sweeping Strike also hits the choppable trees around it. */
export function chopTree(w: World, i: number): boolean {
  const s = w.state;
  if (!isChoppable(s, i)) return false;
  const k = CONFIG.skills;
  let mult = 1;
  const momentum = lvl(s, 'momentum');
  if (momentum) {
    const c = w.combo;
    c.n = s.time - c.at <= k.combo.window ? c.n + 1 : 0;
    c.at = s.time;
    mult = 1 + Math.min(k.combo.step * c.n, k.combo.capPerLevel * momentum);
    if (c.n) w.fx.push({ kind: 'combo', i, n: mult });
  }
  count(s, 'taps');
  const hit = getStats(s).manualChop * w.dev.manualMult * chestMult(s, 'taps') * mult;
  const around = lvl(s, 'sweepingStrike') ? neighbors8(s, i) : [];
  hitTree(w, i, hit);
  for (const n of around) if (isChoppable(s, n)) hitTree(w, n, hit * k.sweep);
  return true;
}

function hitTree(w: World, i: number, hit: number, source: 'hand' | 'bonus' = 'hand'): void {
  const s = w.state;
  const amt = Math.min(hit, s.wood[i]);
  s.wood[i] -= amt;
  gain(s, 'wood', amt);
  w.gathered[source].wood += amt;
  if (s.wood[i] === 0) clearTree(w, i);
}

/** Seconds until this Quarry can blast again (0 = ready). */
export const blastWait = (w: World, id: number) => Math.max(0, (w.blastReady.get(id) ?? 0) - w.state.time);

/**
 * Dynamite: a connected Quarry pays a burst of its miners' stone and hits every tree within reach as
 * hard as many taps. Damage, not felling, so the big outer trees still take their full wood.
 */
export function blast(w: World, id: number): boolean {
  const s = w.state;
  const b = buildingById(s, id);
  const st = getStats(s);
  if (!lvl(s, 'dynamite') || b?.kind !== 'quarry' || !st.linked.has(b.id) || blastWait(w, id) > 0) return false;
  const k = CONFIG.skills.dynamite;
  w.blastReady.set(id, s.time + k.cooldown);
  const stone = burst(w, st, ['mine'], k.stoneSeconds).get(id) ?? 0;
  if (stone) gainBonus(w, 'stone', stone);
  const { w: bw, h: bh } = BUILDINGS[b.kind];
  w.fx.push({ kind: 'blast', i: (b.y + (bh >> 1)) * s.w + b.x + (bw >> 1), n: stone });
  count(s, 'blasts');
  const hit = st.manualChop * k.taps;
  let trees = 0;
  for (let y = Math.max(0, b.y - k.radius); y <= Math.min(s.h - 1, b.y + bh - 1 + k.radius); y++) {
    for (let x = Math.max(0, b.x - k.radius); x <= Math.min(s.w - 1, b.x + bw - 1 + k.radius); x++) {
      const i = y * s.w + x;
      if (s.tiles[i] !== Tile.Tree) continue;
      trees++;
      hitTree(w, i, hit, 'bonus');
    }
  }
  record(s, 'blastTrees', trees);
  return true;
}

export function toggleMark(w: World, i: number): boolean {
  const s = w.state;
  if (s.tiles[i] !== Tile.Tree || w.fog[i] > visionRadius(s)) return false;
  const m = s.marked.indexOf(i);
  if (m === -1) {
    s.marked.push(i);
    rushToMark(w, i);
  } else s.marked.splice(m, 1);
  return true;
}

/** Hire a villager paid in wood, food or cloth (separate price tracks, shared population cap), at a hub (default: the Town Center). */
export function hireVillager(w: World, res: HireResource = 'wood', at?: number): boolean {
  const s = w.state;
  const hub = at === undefined ? undefined : buildingById(s, at);
  if (at !== undefined && !(hub && HUB_KINDS.includes(hub.kind))) return false;
  if (s.villagers.length >= popCap(s) || !pay(s, villagerCost(s, res))) return false;
  s.hires[res]++;
  spawnVillager(s, hub);
  return true;
}

/** Guild Contracts: claim a finished contract's gold at a connected Market; a new contract takes its place. */
export function claimContract(w: World, k: number): boolean {
  const s = w.state;
  const c = s.contracts[k];
  if (!c || !lvl(s, 'guildContracts') || !hasMarket(s) || !contractDone(s, c)) return false;
  gainBonus(w, 'gold', c.reward);
  s.contracts[k] = newContract(s);
  count(s, 'contracts');
  return true;
}

/** Merchant Caravans: take one of the caravan's deals at a connected Market; the caravan then moves on. */
export function takeDeal(w: World, k: number): boolean {
  const s = w.state;
  const d = s.caravan?.[k];
  if (!d || !hasMarket(s) || !pay(s, d.give)) return false;
  for (const [r, n] of Object.entries(d.get) as [ResourceKey, number][]) s.resources[r] += n; // an exchange, like Market trades
  s.caravan = null;
  count(s, 'deals');
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

/** Sells `n` of a resource at a Market. Trades are exchanges, so lifetime totals are untouched. */
export function sellResource(w: World, res: TradeResource, n: number): boolean {
  const s = w.state;
  if (!canTrade(s, n) || s.resources[res] < n) return false;
  s.resources[res] -= n;
  s.resources.gold += marketQuote(s, res, n, 'sell');
  return true;
}

/** Buys `n` of a resource at a Market with gold. */
export function buyResource(w: World, res: TradeResource, n: number): boolean {
  const s = w.state;
  if (!canTrade(s, n) || !pay(s, { gold: marketQuote(s, res, n, 'buy') })) return false;
  s.resources[res] += n;
  return true;
}

/** Trading needs a Market connected by road. */
export function hasMarket(s: GameState): boolean {
  const linked = linkedBuildings(s);
  return s.buildings.some((b) => b.kind === 'market' && linked.has(b.id));
}

const canTrade = (s: GameState, n: number) => Number.isInteger(n) && n > 0 && hasMarket(s);

/** Pause/resume a workplace; its workers return to lumberjacking while paused. */
export function togglePause(w: World, id: number): boolean {
  const s = w.state;
  const b = buildingById(s, id);
  if (!b || !BUILDINGS[b.kind].workers) return false;
  s.paused = s.paused.includes(id) ? s.paused.filter((p) => p !== id) : [...s.paused, id];
  return true;
}

/** New buildings need their kind unlocked; moving one that already stands does not. */
export function canPlace(w: World, kind: BuildingKind, x: number, y: number): boolean {
  return isUnlocked(w.state, kind) && !atLimit(w.state, kind) && canPlaceAt(w, kind, x, y);
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
  refreshRoadRoutes(w); // villagers walk around buildings, so any building can change the way home
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

/** Villagers walk around buildings, so any building change can change the way home: deliveries under way re-route. */
function refreshBuildingRoutes(w: World, b: Building, removed: boolean): void {
  onBuildingsChanged(w);
  rerouteMules(w.state);
  for (const v of w.state.villagers) {
    const assigned = v.workplace === b.id;
    if (assigned && (v.carry > 0 || v.state === 'toHome')) {
      homeward(w, v);
    } else if (assigned) {
      v.path = [];
      v.pathI = 0;
      v.state = 'idle';
      if (removed) { v.job = 'lumber'; v.workplace = -1; v.target = -1; }
    } else if (v.state === 'toHome') {
      homeward(w, v);
    }
  }
}

/** Re-routes a delivery: to the nearest drop-off, or a tax collector to its office. */
const homeward = (w: World, v: Villager) => (v.job === 'tax' ? collectorHome(w, v) : goHome(w, v, jobResource(v.job)));

/** A road can be laid on open ground while the road stock lasts. */
export function canPlaceRoad(w: World, i: number): boolean {
  const s = w.state;
  return Number.isInteger(i) && i >= 0 && i < s.tiles.length && s.tiles[i] === Tile.Grass && roadsBuilt(s) < roadStock(s);
}

/** Lays one road tile. Buildings work once a road joins them to the Town Center. */
export function placeRoad(w: World, i: number): boolean {
  if (!canPlaceRoad(w, i)) return false;
  w.state.tiles[i] = Tile.Road;
  refreshRoadRoutes(w);
  return true;
}

/** Lifts one road tile back into the stock, leaving open ground. */
export function removeRoad(w: World, i: number): boolean {
  const s = w.state;
  if (!Number.isInteger(i) || s.tiles[i] !== Tile.Road) return false;
  s.tiles[i] = Tile.Grass;
  refreshRoadRoutes(w);
  return true;
}

/** Moves one road tile onto open ground; the stock is unchanged. */
export function moveRoad(w: World, from: number, to: number): boolean {
  const s = w.state;
  if (!Number.isInteger(from) || !Number.isInteger(to) || s.tiles[from] !== Tile.Road || s.tiles[to] !== Tile.Grass) return false;
  s.tiles[from] = Tile.Grass;
  s.tiles[to] = Tile.Road;
  refreshRoadRoutes(w);
  return true;
}

/** Roads change which drop-offs work and the best way to each, so deliveries under way re-route. */
function refreshRoadRoutes(w: World): void {
  onBuildingsChanged(w);
  rerouteMules(w.state);
  for (const v of w.state.villagers) if (v.state === 'toHome') homeward(w, v);
}

/** Picks up a relic touching territory; its tile becomes territory and a skill pick is owed. */
export function collectRelic(w: World, i: number): boolean {
  const s = w.state;
  if (!isCollectable(s, i)) return false;
  s.relics = s.relics.filter((r) => r !== i);
  claimTile(w, i);
  count(s, 'relics');
  s.picksPending++;
  if (!s.cards.length) dealCards(s, cardsPerPick(s));
  if (!s.cards.length) s.picksPending = 0; // every skill maxed
  return true;
}

export function pickSkill(w: World, id: SkillId): boolean {
  const s = w.state;
  if (!s.cards.includes(id) || lvl(s, id) >= SKILLS[id].max) return false;
  s.skills[id] = lvl(s, id) + 1;
  s.picksPending--;
  if (s.picksPending > 0) dealCards(s, cardsPerPick(s));
  else s.cards = [];
  if (!s.cards.length) s.picksPending = 0;
  return true;
}

const cardsPerPick = (s: GameState) => (perk(s, 'relicHunters') ? CONFIG.legacy.perks.relicHunters.cards : 3);

/**
 * Rebuild (prestige): a fresh run on a new map, keeping the Legacy plus one more level of `id`, and the career (achievements).
 * Returns the new state for the caller to load, or null if the rebuild isn't allowed.
 */
export function prestige(w: World, id: PerkId): GameState | null {
  const s = w.state;
  if (!canPrestige(s) || !availablePerks(s).includes(id)) return null;
  const seed = (rand(s) * 2 ** 32) >>> 0;
  const next = createInitialState(seed, s.w, CONFIG.map.start, {
    runs: s.legacy.runs + 1,
    perks: { ...s.legacy.perks, [id]: perk(s, id) + 1 },
  }, nextCareer(s));
  next.chest = { ...s.chest }; // a rebuild doesn't recharge the Lucky Chest or end its boost
  return next;
}

/**
 * Opens the Lucky Chest if it is ready at `now` (wall-clock ms): rolls a reward and starts the next cooldown.
 * The reward waits in `pending` until `claimChest`. A chest opened but never claimed (the game closed
 * during the show) opens again to the same reward. Returns the reward, or null if the chest isn't ready.
 */
export function openChest(w: World, now: number): ChestReward | null {
  const c = w.state.chest;
  if (c.pending) return c.pending;
  if (now < c.readyAt) return null;
  c.pending = rollChest(w.state);
  c.readyAt = now + CONFIG.chest.cooldownMs;
  return c.pending;
}

/**
 * Applies the opened chest's reward at `now` (wall-clock ms): starts its boost, or pays the Windfall
 * (`income` is the current rate per minute of each resource). Returns the reward and anything paid, or null if none is pending.
 */
export function claimChest(w: World, now: number, income: Partial<Resources>): { reward: ChestReward; paid: Cost } | null {
  const s = w.state;
  const reward = s.chest.pending;
  if (!reward) return null;
  s.chest.pending = null;
  let paid: Cost = {};
  if (isBoost(reward)) s.chest.boost = { kind: reward, until: now + CONFIG.chest.boosts[reward].seconds * 1000 };
  else {
    paid = windfall(s, income);
    for (const r of RESOURCES) if (paid[r]) gain(s, r, paid[r]);
  }
  return { reward, paid };
}

/** Ends the Lucky Chest boost once its time is up at `now` (wall-clock ms). Returns whether one ended. */
export function expireChest(s: GameState, now: number): boolean {
  if (!s.chest.boost || now < s.chest.boost.until) return false;
  s.chest.boost = null;
  return true;
}

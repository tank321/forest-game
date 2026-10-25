import { CONFIG } from '../../config';
import { BUILDINGS, buildingAt, buildingById, footprint, isActive, mulesOf, tallyTo } from '../buildings';
import { gain } from '../economy';
import { tileAt } from '../grid';
import { pathToAny, roadRoutes } from '../pathing';
import { getStats, type Stats } from '../stats';
import type { Building, GameState, Mule } from '../types';
import type { World } from '../world';
import { arrived, walk } from './movement';

function spawn(s: GameState, post: Building): Mule {
  const { w, h } = BUILDINGS[post.kind];
  return { id: s.nextId++, x: post.x + w / 2, y: post.y + h / 2, path: [], pathI: 0, carry: 0, state: 'idle', post: post.id };
}

/** Walk to the nearest of `goals` along the roads (any way there if the roads don't reach them), or null. */
function routeTo(s: GameState, m: Mule, goals: readonly Building[], post: Building | undefined): number[] | null {
  const here = tileAt(s, m.x, m.y);
  const tiles = new Set(goals.flatMap((b) => footprint(s, b)));
  if (!tiles.size) return null;
  let best = null;
  for (const r of roadRoutes(s, here, tiles, post ? [post, ...goals] : goals, true).values()) if (!best || r.d < best.d) best = r;
  return best?.path() ?? pathToAny(s, here, tiles);
}

function go(m: Mule, path: number[] | null, state: Mule['state']): boolean {
  if (!path) return false;
  m.path = path;
  m.pathI = 0;
  m.state = state;
  return true;
}

/** Unloads the gold where the mule stands: into the stockpile, and onto the tally of the Market it reached and of its post. */
function deposit(w: World, m: Mule, post: Building | undefined): void {
  const s = w.state;
  const at = buildingAt(s, tileAt(s, m.x, m.y));
  gain(s, 'gold', m.carry);
  w.gathered.trade.gold += m.carry;
  if (at && BUILDINGS[at.kind].dropoff.includes('gold')) tallyTo(at, 'gold', m.carry);
  if (post) tallyTo(post, 'gold', m.carry);
  m.carry = 0;
}

/**
 * A pack mule: loads gold at its Trading Post for `loadTime` seconds, carries it to the nearest Market and
 * comes back, keeping to the roads. Loading takes the same time on every route, so a longer one pays more
 * per second. A paused or cut-off post keeps its mule home; one carrying gold delivers it first. dt-independent.
 */
function updateMule(w: World, m: Mule, dt: number, st: Stats): void {
  const s = w.state;
  const post = buildingById(s, m.post);
  const active = isActive(s, post, st.linked);
  const load = post ? (st.tradeLoads.get(post.id) ?? 0) : 0;
  const markets = () => {
    const all = s.buildings.filter((b) => b.kind === 'market');
    const linked = all.filter((b) => st.linked.has(b.id));
    return linked.length ? linked : all;
  };
  let t = dt;
  while (t > 0) {
    switch (m.state) {
      case 'idle':
        if (m.carry > 0 && (!active || m.carry >= load)) {
          if (!go(m, routeTo(s, m, markets(), post), 'toMarket')) deposit(w, m, post);
          break;
        }
        if (!post) return;
        if (buildingAt(s, tileAt(s, m.x, m.y)) !== post) {
          if (!go(m, routeTo(s, m, [post], post), 'toPost')) return;
          break;
        }
        if (!active || load <= 0) return; // waits at its post
        m.state = 'load';
        break;
      case 'load': {
        if (!active || buildingAt(s, tileAt(s, m.x, m.y)) !== post) {
          m.state = 'idle';
          break;
        }
        // A moved Market can shorten the route below an already loaded amount.
        const need = ((load - m.carry) * CONFIG.trade.loadTime) / load;
        if (need > t) {
          m.carry += (load / CONFIG.trade.loadTime) * t;
          return;
        }
        t -= Math.max(0, need);
        m.carry = Math.max(m.carry, load);
        m.state = 'idle';
        break;
      }
      case 'toMarket':
      case 'toPost':
        t = walk(w, m, t, st.speed, st);
        if (!arrived(m)) return;
        if (m.state === 'toMarket') deposit(w, m, post);
        m.state = 'idle';
        break;
    }
  }
}

/** Gives every Trading Post its mules, walks them, and retires a removed post's mules once they have delivered. */
export function muleSystem(w: World, dt: number): void {
  const s = w.state;
  for (const b of s.buildings) {
    if (b.kind !== 'tradingPost') continue;
    for (let n = s.mules.filter((m) => m.post === b.id).length; n < mulesOf(b); n++) s.mules.push(spawn(s, b));
  }
  const st = getStats(s);
  for (const m of s.mules) updateMule(w, m, dt, st);
  s.mules = s.mules.filter((m) => m.carry > 0 || buildingById(s, m.post));
}

/** Buildings or roads changed: walking mules re-route from where they stand. */
export function rerouteMules(s: GameState): void {
  for (const m of s.mules) {
    if (m.state !== 'toMarket' && m.state !== 'toPost') continue;
    m.path = [];
    m.pathI = 0;
    m.state = 'idle';
  }
}

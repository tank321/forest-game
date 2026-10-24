import { buildingAt, buildingById, footprint, isActive } from '../buildings';
import { tileAt } from '../grid';
import { pathToAny, roadRoutes, type Route } from '../pathing';
import type { Stats } from '../stats';
import type { Building, Villager } from '../types';
import type { World } from '../world';
import { arrived, deliver, goHome, walk } from './movement';

const doorOf = (s: { w: number }, h: Building) => h.y * s.w + h.x; // houses are one tile

/**
 * Next house for a tax collector's round, walking the roads from where it stands: the house owing
 * the most to start a round (ties to the nearest), then the nearest it has not visited. Houses
 * another collector is heading to are skipped.
 */
function nextHouse(w: World, v: Villager, st: Stats, office: Building, first: boolean): { house: number; route: Route } | null {
  const s = w.state;
  const claimed = new Set(s.villagers.filter((u) => u !== v && u.job === 'tax').map((u) => u.target));
  const due = new Map<number, number>();
  for (const h of s.buildings) {
    const door = doorOf(s, h);
    if (st.taxedHouses.has(h.id) && (h.due ?? 0) > 0 && !claimed.has(door) && !v.round?.includes(door)) due.set(door, h.due!);
  }
  const routes = roadRoutes(s, tileAt(s, v.x, v.y), new Set(due.keys()), [office], !first);
  let best: { house: number; route: Route } | null = null;
  for (const [house, route] of routes) {
    if (!best) { best = { house, route }; continue; }
    const more = first ? due.get(house)! - due.get(best.house)! : 0;
    if (more > 0 || (more === 0 && (route.d < best.route.d || (route.d === best.route.d && house < best.house)))) best = { house, route };
  }
  return best;
}

/** Heads back to the office along the roads (any way there if the roads don't reach); false if there is none. */
function toOffice(w: World, v: Villager, office: Building | undefined): boolean {
  const s = w.state;
  v.target = -1;
  if (!office) return false;
  const here = tileAt(s, v.x, v.y);
  const goals = new Set(footprint(s, office));
  const path = [...roadRoutes(s, here, goals, [office], true).values()][0]?.path() ?? pathToAny(s, here, goals);
  if (!path) return false;
  v.path = path;
  v.pathI = 0;
  v.state = 'toHome';
  return true;
}

/** Sends a collector back to its office, or banks its gold at the nearest gold drop-off if it can't get there. */
export function collectorHome(w: World, v: Villager): void {
  if (!toOffice(w, v, buildingById(w.state, v.workplace))) goHome(w, v, 'gold');
}

/**
 * Tax collector: idle (at its office) -> toWork (a house) -> toWork (the next house) ... -> toHome (the office) -> (deposit) -> idle.
 * A round visits up to `taxStops` houses, walking only along the roads, and empties each house's dues into its
 * purse. The gold counts once it reaches the office. A collector that is elsewhere, or whose office is paused or
 * cut off, first goes back; once empty-handed there, the job system hands it back to lumberjacking. dt-independent.
 */
export function updateCollector(w: World, v: Villager, dt: number, st: Stats): void {
  const s = w.state;
  const office = buildingById(s, v.workplace);
  const active = isActive(s, office, st.linked);
  let t = dt;
  while (t > 0) {
    switch (v.state) {
      case 'idle': {
        v.target = -1;
        const atOffice = office !== undefined && buildingAt(s, tileAt(s, v.x, v.y)) === office;
        if (v.carry > 0 || (active && !atOffice)) {
          if (toOffice(w, v, office)) break;
          if (v.carry === 0) return;
          goHome(w, v, 'gold');
          break;
        }
        if (!active) return;
        const next = nextHouse(w, v, st, office, true);
        if (!next) return; // nothing owed yet: wait at the office
        v.round = [];
        v.target = next.house;
        v.path = next.route.path();
        v.pathI = 0;
        v.state = 'toWork';
        break;
      }
      case 'toWork': {
        if (!active) {
          v.state = 'idle';
          break;
        }
        t = walk(w, v, t, st.speed, st);
        if (!arrived(v)) return;
        const house = buildingAt(s, v.target);
        if (house?.kind === 'house') {
          v.carry += house.due ?? 0;
          house.due = 0;
        }
        (v.round ??= []).push(v.target);
        const next = v.round.length < st.taxStops ? nextHouse(w, v, st, office, false) : null;
        if (!next) {
          if (!toOffice(w, v, office)) v.state = 'idle';
          break;
        }
        v.target = next.house;
        v.path = next.route.path();
        v.pathI = 0;
        break;
      }
      case 'toHome':
        t = walk(w, v, t, st.speed, st);
        if (!arrived(v)) return;
        // Off the office (moved, removed or out of reach), the gold still counts where the collector stands.
        if (v.carry > 0) deliver(w, v, 'gold', v.carry, buildingAt(s, tileAt(s, v.x, v.y)) === office ? office : undefined);
        v.carry = 0;
        v.round = [];
        v.state = 'idle';
        if (!active) return;
        break;
      default: // a state from another job (just reassigned)
        v.state = 'idle';
    }
  }
}

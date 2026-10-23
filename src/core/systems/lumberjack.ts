import { distToBuilding } from '../buildings';
import { tileAt } from '../grid';
import { nearestTree } from '../pathing';
import type { Stats } from '../stats';
import type { Villager } from '../types';
import { Tile } from '../types';
import { clearTree, type World } from '../world';
import { arrived, deliver, goHome, walk } from './movement';

const EPS = 1e-9; // wood amounts closer than this are equal (float drift across step sizes)

/**
 * Lumberjack: idle -> toTree -> chop -> toHome -> (deposit) -> idle ...
 * Picks its tree afresh when idle (spawned, reassigned, or after every delivery), so a half-chopped
 * tree is released at the drop-off. Consumes its whole time budget across transitions (dt-independent).
 */
export function updateLumberjack(w: World, v: Villager, dt: number, st: Stats): void {
  const s = w.state;
  let t = dt;
  while (t > 0) {
    switch (v.state) {
      case 'idle':
        if (assignTree(w, v, st)) break;
        if (v.carry > 0) goHome(w, v, 'wood');
        else return;
        break;
      case 'toTree':
        if (s.tiles[v.target] !== Tile.Tree) {
          lostTarget(w, v, st);
          break;
        }
        t = walk(w, v, t, st.speed, st);
        if (!arrived(v)) return;
        v.state = 'chop';
        break;
      case 'chop': {
        const tree = v.target;
        if (s.tiles[tree] !== Tile.Tree) {
          lostTarget(w, v, st);
          break;
        }
        const rate = st.chopRate * (st.campBonus > 1 && nearCamp(w, tree, st) ? st.campBonus : 1);
        const have = s.wood[tree];
        const room = st.carry - v.carry;
        const amt = have - room < EPS ? have : room; // don't leave a rounding error standing
        const need = amt / rate;
        if (need > t) {
          const a = rate * t;
          v.carry += a;
          s.wood[tree] = have - a;
          return;
        }
        t -= need;
        v.carry += amt;
        s.wood[tree] = have - amt;
        if (amt === have) {
          clearTree(w, tree);
          v.target = -1;
          if (isFull(v, st)) goHome(w, v, 'wood');
          else v.state = 'idle'; // chain to the next tree with the remaining capacity
        } else goHome(w, v, 'wood');
        break;
      }
      case 'toHome':
        t = walk(w, v, t, st.speed, st);
        if (!arrived(v)) return;
        deliver(w, v, 'wood', v.carry);
        v.carry = 0;
        v.target = -1; // choose again from here
        v.state = 'idle';
        break;
      default: // a state from another job (just reassigned)
        v.state = 'idle';
    }
  }
}

/** Load can't take more (within rounding), so the next stop is a drop-off. */
const isFull = (v: Villager, st: Stats) => st.carry - v.carry < EPS;

/** Predicate: tree already has as many villagers as allowed. */
function fullTrees(w: World, st: Stats): (tree: number) => boolean {
  const n = new Map<number, number>();
  for (const o of w.state.villagers) if (o.target !== -1) n.set(o.target, (n.get(o.target) ?? 0) + 1);
  return (t) => (n.get(t) ?? 0) >= st.perTree;
}

function assignTree(w: World, v: Villager, st: Stats): boolean {
  const s = w.state;
  const found = nearestTree(s, w.fields.wood, tileAt(s, v.x, v.y), fullTrees(w, st));
  if (!found) return false;
  v.target = found.tree;
  v.path = found.path;
  v.pathI = 0;
  v.state = 'toTree';
  return true;
}

/** Target felled by someone else (the player or a teammate). */
function lostTarget(w: World, v: Villager, st: Stats): void {
  v.target = -1;
  v.state = 'idle';
  if (v.carry > 0 && (isFull(v, st) || !assignTree(w, v, st))) goHome(w, v, 'wood');
}

/** Tree within campRadius tiles (Chebyshev) of a connected Lumber Camp. */
function nearCamp(w: World, tree: number, st: Stats): boolean {
  const s = w.state;
  const x = tree % s.w;
  const y = (tree / s.w) | 0;
  return s.buildings.some((b) => b.kind === 'lumberCamp' && st.linked.has(b.id) && distToBuilding(b, x, y) <= st.campRadius);
}

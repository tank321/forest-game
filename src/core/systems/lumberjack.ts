import { distToBuilding } from '../buildings';
import { gain } from '../economy';
import { isChoppable, tileAt } from '../grid';
import { nearestTree } from '../pathing';
import type { Stats } from '../stats';
import type { Villager } from '../types';
import { Tile } from '../types';
import { clearTree, type World } from '../world';
import { arrived, goHome, returnToWork, walk } from './movement';

/**
 * Lumberjack: idle -> toTree -> chop -> toHome -> (deposit) -> toTree ...
 * Keeps its claimed tree across trips until it falls, so the tree search only runs when a tree
 * falls or a mark appears. Consumes its whole time budget across transitions (dt-independent).
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
        t = walk(w, v, t, st.speed);
        if (!arrived(v)) return;
        v.state = 'chop';
        break;
      case 'chop': {
        const tree = v.target;
        if (s.tiles[tree] !== Tile.Tree) {
          lostTarget(w, v, st);
          break;
        }
        const rate = st.chopRate * (st.campBonus > 1 && nearCamp(w, tree, st.campRadius) ? st.campBonus : 1);
        const have = s.wood[tree];
        const amt = Math.min(have, st.carry - v.carry);
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
          v.state = 'idle'; // chain to the next tree with the remaining capacity
        } else goHome(w, v, 'wood');
        break;
      }
      case 'toHome':
        t = walk(w, v, t, st.speed);
        if (!arrived(v)) return;
        gain(s, 'wood', v.carry);
        v.carry = 0;
        if (v.target === -1 || s.tiles[v.target] !== Tile.Tree || markWaiting(w, v, st)) {
          v.target = -1;
          v.state = 'idle';
        } else returnToWork(w, v, 'toTree');
        break;
      default: // a state from another job (just reassigned)
        v.state = 'idle';
    }
  }
}

/** Predicate: tree already has as many villagers as allowed. */
function fullTrees(w: World, st: Stats): (tree: number) => boolean {
  const n = new Map<number, number>();
  for (const o of w.state.villagers) if (o.target !== -1) n.set(o.target, (n.get(o.target) ?? 0) + 1);
  return (t) => (n.get(t) ?? 0) >= st.perTree;
}

function assignTree(w: World, v: Villager, st: Stats): boolean {
  const s = w.state;
  const found = nearestTree(s, tileAt(s, v.x, v.y), fullTrees(w, st));
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
  if (v.carry > 0 && !assignTree(w, v, st)) goHome(w, v, 'wood');
}

/** A choppable marked tree with room for a villager: worth abandoning an unmarked tree for. */
function markWaiting(w: World, v: Villager, st: Stats): boolean {
  const s = w.state;
  if (s.marked.length === 0 || s.marked.includes(v.target)) return false;
  const full = fullTrees(w, st);
  return s.marked.some((m) => !full(m) && isChoppable(s, m));
}

/** Tree within `r` tiles (Chebyshev) of any Lumber Camp. */
function nearCamp(w: World, tree: number, r: number): boolean {
  const s = w.state;
  const x = tree % s.w;
  const y = (tree / s.w) | 0;
  return s.buildings.some((b) => b.kind === 'lumberCamp' && distToBuilding(b, x, y) <= r);
}

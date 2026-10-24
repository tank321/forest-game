import { isWalkable, neighbors4, tileAt } from './grid';
import { walkToTree } from './pathing';
import { getStats, type Stats } from './stats';
import { Tile, type Villager } from './types';
import type { World } from './world';

/** Load can't take more (within rounding), so a lumberjack's next stop is a drop-off. */
export const loadFull = (v: Villager, st: Stats) => st.carry - v.carry < 1e-9;

/**
 * A flagged tree the land reaches (just flagged, or just reached): the nearest lumberjacks by walk, as many as may
 * still work it, drop their current tree and head there at once. Lumberjacks on their way home, with a full load,
 * or on another flagged tree carry on.
 */
export function rushToMark(w: World, tree: number): void {
  const s = w.state;
  const st = getStats(s);
  const marked = new Set(s.marked);
  const room = st.perMarkedTree - s.villagers.filter((v) => v.target === tree).length;
  if (room <= 0) return;
  const free = s.villagers.filter(
    (v) => v.job === 'lumber' && (v.state === 'idle' || v.state === 'toTree' || v.state === 'chop') && !marked.has(v.target) && !loadFull(v, st),
  );
  const walks = free
    .map((v) => ({ v, walk: walkToTree(s, w.fields.wood, tileAt(s, v.x, v.y), tree) }))
    .filter((e): e is { v: Villager; walk: NonNullable<typeof e.walk> } => e.walk !== null)
    .sort((a, b) => a.walk.d - b.walk.d); // stable: ties keep villager order
  for (const { v, walk } of walks.slice(0, room)) {
    v.target = tree;
    v.path = walk.path;
    v.pathI = 0;
    v.state = 'toTree';
  }
}

/** Tile `i` just became land: flagged trees beside it that it is the first land to touch get their lumberjacks. */
export function rushReached(w: World, i: number): void {
  const s = w.state;
  for (const t of neighbors4(s, i)) {
    if (s.tiles[t] !== Tile.Tree || !s.marked.includes(t)) continue;
    if (neighbors4(s, t).some((n) => n !== i && isWalkable(s, n))) continue; // reached already
    rushToMark(w, t);
  }
}

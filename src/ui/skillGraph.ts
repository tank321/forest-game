import { isMastery, MASTERY, prerequisite, TRACK_IDS, TRACKS, unlockedBy, type SkillId, type Track } from '../core/skills';

/** Layout grid, in unzoomed CSS px. A node is `NODE.w` wide and `NODE.h` tall; its top is at its y. */
export const NODE = { w: 104, h: 100 };
const COL = 112; // one leaf per column
const ROW = 132;
const HEAD = 56; // track header above its roots
const GAP = 48; // between tracks in a band
const BAND_GAP = 56;
const PAD = 32;
const PER_BAND = 3;

export interface SkillLayout {
  w: number;
  h: number;
  /** x is the node's center, y its top. */
  nodes: Record<SkillId, { x: number; y: number }>;
  /** Each track's header box. */
  tracks: Record<Track, { x: number; y: number; w: number }>;
}

/**
 * Tidy tree layout: tracks side by side in bands of `PER_BAND`, roots at the top, each leaf in its own
 * column and each parent centered over its children.
 */
export function skillLayout(): SkillLayout {
  const nodes = {} as SkillLayout['nodes'];
  const tracks = {} as SkillLayout['tracks'];
  let y = PAD;
  let w = 0;
  for (let band = 0; band < TRACK_IDS.length; band += PER_BAND) {
    let x = PAD;
    let depth = 0;
    for (const t of TRACK_IDS.slice(band, band + PER_BAND)) {
      let leaves = 0;
      const place = (id: SkillId, d: number): number => {
        depth = Math.max(depth, d + 1);
        const xs = unlockedBy(id).map((child) => place(child, d + 1));
        const cx = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : x + (leaves++ + 0.5) * COL;
        nodes[id] = { x: cx, y: y + HEAD + d * ROW };
        return cx;
      };
      const bandDepth = depth;
      depth = 0; // this track's rows
      for (const root of TRACKS[t].filter((id) => !prerequisite(id) && !isMastery(id))) place(root, 0);
      // A Mastery sits centered under its whole track, one row below the deepest skill.
      const mastery = MASTERY[t];
      if (mastery) nodes[mastery] = { x: x + (leaves * COL) / 2, y: y + HEAD + depth++ * ROW };
      depth = Math.max(depth, bandDepth);
      tracks[t] = { x, y, w: leaves * COL };
      x += leaves * COL + GAP;
    }
    w = Math.max(w, x - GAP + PAD);
    y += HEAD + (depth - 1) * ROW + NODE.h + BAND_GAP;
  }
  return { w, h: y - BAND_GAP + PAD, nodes, tracks };
}

/** Elbow path from a parent's bottom to a child's top; siblings share the stem down to the elbow. */
export function edgePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const elbow = to.y - (ROW - NODE.h) / 2;
  return `M${from.x} ${from.y + NODE.h}V${elbow}H${to.x}V${to.y}`;
}

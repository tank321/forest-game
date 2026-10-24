import { neighbors4 } from '../core/grid';
import { seasonOf, WINTER } from '../core/seasons';
import { Tile, type GameState } from '../core/types';
import { visionRadius, type World } from '../core/world';
import type { CritterSprite } from './sprites';

/**
 * Forest creatures: ambience only. They live here and in the renderer, move on wall-clock time, and never
 * touch the game state or its seeded randomness, so they change nothing in the simulation or the save.
 * They come in from a side of the view at the first tile in sight (walking through the forest, under the trees, or flying)
 * and leave the same way, fading in and out there, so none is ever drawn over the black beyond sight.
 */

/** What spawns together: one creature, or a group (a flock, a duck family, a skein of geese, a swarm of fireflies). */
export type CritterKind = 'rabbit' | 'squirrel' | 'bird' | 'butterfly' | 'frog' | 'duck' | 'hedgehog' | 'fox' | 'deer' | 'geese' | 'fireflies';

/** Where a kind heads when it comes in: open ground, a Well, across the sky, or (fireflies, glowing in place) the treeline. */
type Site = 'ground' | 'well' | 'sky' | 'treeline';

interface KindDef {
  seasons: readonly number[]; // season indices it appears in (0 = spring)
  weight: number; // spawn odds
  site: Site;
  speed: number; // tiles/s
  group: readonly [number, number]; // how many come together
  life: readonly [number, number]; // s before it heads off
  idle: readonly [number, number]; // s it rests between moves
  roam: number; // tiles it wanders per move
  shy: 'run' | 'bolt' | 'fly' | null; // when a villager comes close: run a few tiles, bolt off the side, or take flight
}

export const KINDS: Record<CritterKind, KindDef> = {
  rabbit: { seasons: [0, 1, 2, 3], weight: 5, site: 'ground', speed: 2.2, group: [1, 1], life: [20, 40], idle: [1, 4], roam: 3, shy: 'run' },
  squirrel: { seasons: [0, 1, 2], weight: 4, site: 'ground', speed: 2.6, group: [1, 1], life: [15, 30], idle: [1, 3], roam: 2, shy: 'bolt' },
  bird: { seasons: [0, 1, 2, 3], weight: 4, site: 'ground', speed: 0.9, group: [2, 4], life: [12, 25], idle: [0.4, 1.6], roam: 0.8, shy: 'fly' },
  butterfly: { seasons: [0, 1], weight: 4, site: 'ground', speed: 0.9, group: [1, 2], life: [15, 30], idle: [0, 0.4], roam: 2.5, shy: null },
  frog: { seasons: [0, 1], weight: 3, site: 'well', speed: 1.6, group: [1, 1], life: [20, 40], idle: [2, 5], roam: 1.5, shy: 'run' },
  duck: { seasons: [0], weight: 3, site: 'well', speed: 0.8, group: [3, 4], life: [25, 45], idle: [1.5, 4], roam: 1.5, shy: 'run' },
  hedgehog: { seasons: [2], weight: 3, site: 'ground', speed: 0.6, group: [1, 1], life: [25, 45], idle: [1.5, 4], roam: 1.5, shy: 'run' },
  fox: { seasons: [2, 3], weight: 2, site: 'ground', speed: 1.3, group: [1, 1], life: [20, 35], idle: [1, 3], roam: 4, shy: 'run' },
  deer: { seasons: [0, 1, 2], weight: 0.6, site: 'ground', speed: 0.9, group: [1, 1], life: [25, 45], idle: [3, 7], roam: 2, shy: 'bolt' },
  geese: { seasons: [2], weight: 1.5, site: 'sky', speed: 1.8, group: [5, 7], life: [60, 60], idle: [0, 0], roam: 0, shy: null },
  fireflies: { seasons: [1], weight: 3, site: 'treeline', speed: 0.3, group: [3, 6], life: [20, 35], idle: [0.5, 2], roam: 1, shy: null },
};
const KIND_LIST = Object.keys(KINDS) as CritterKind[];

export interface Critter {
  kind: CritterKind;
  sprite: CritterSprite | 'firefly';
  variant: number; // palette variant (winter hare, cardinal, butterfly colors); for squirrels, 1 = carrying an acorn
  x: number; // ground position, tiles (feet)
  y: number;
  z: number; // height above the ground, tiles
  tx: number; // where it is headed
  ty: number;
  tz: number;
  mode: 'idle' | 'move' | 'flee' | 'leave' | 'gone';
  wait: number; // s of resting left
  age: number;
  life: number;
  left: boolean; // facing
  alpha: number; // fades in when it comes, out when it goes
  shown: number; // 0 while over the dark beyond sight, 1 over ground in sight, fading between
  phase: number; // animation offset, s
  lead: Critter | null; // a duckling follows the one ahead of it
  home: { x: number; y: number } | null; // a Well (frogs, ducks) or the spot fireflies hover around
  stride: number; // tiles walked since its last footprint
}

/** A footprint in the snow. */
export interface Track {
  x: number;
  y: number;
  left: boolean;
  age: number;
}

/** Visible tiles, inclusive. */
export interface View {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const CRITTER_MIN_ZOOM = 20; // px per tile below which creatures are too small to show
export const TRACK_LIFE = 6; // s a footprint takes to fade
const TRACK_STEP = 0.3; // tiles between footprints
const SHY_RADIUS = 1.2; // tiles from a villager that startle a creature
const FLEE = 2.4; // speed × when startled
const FLY_SPEED = 3; // tiles/s of a bird in flight
const CLIMB = 2; // tiles/s a flyer rises
const MARGIN = 3; // tiles off the side of the view where creatures are dropped
const FADE = 3; // alpha per s
const SPAWN_GAP = [1.2, 3] as const; // s between spawn attempts
const TILES_EACH = 35; // visible tiles per creature
const POPULATION = [4, 8] as const;
const WINTER_POPULATION = 0.6; // fewer creatures about in winter
const GROUP_SHARE = 0.3; // a duckling, goose or firefly counts as this much of a creature
const FOLLOW_GAP = 0.45; // tiles between ducklings in the line

/** Open ground: where creatures rest and wander to. */
const open = (s: GameState, i: number) => s.tiles[i] === Tile.Grass || s.tiles[i] === Tile.Road;
const tileOf = (s: GameState, x: number, y: number) =>
  x < 0 || y < 0 || x >= s.w || y >= s.h ? -1 : Math.floor(y) * s.w + Math.floor(x);
/** Whether the point is over ground the player can see (not the black beyond sight, nor off the map). */
function inSight(world: World, x: number, y: number): boolean {
  const i = tileOf(world.state, x, y);
  return i >= 0 && world.fog[i] <= visionRadius(world.state);
}

/** The creatures about, and their footprints in the snow. `random` is UI-only randomness, swappable in tests. */
export class Critters {
  list: Critter[] = [];
  tracks: Track[] = [];
  private spawnIn = 0.5;
  private winter = false;
  private view: View = { x0: 0, y0: 0, x1: 0, y1: 0 };

  constructor(private random: () => number = Math.random) {}

  /** Advances every creature by `dt` s of wall-clock time and spawns new ones into `view`. */
  step(world: World, view: View, dt: number): void {
    const season = seasonOf(world.state.time);
    this.winter = season === WINTER;
    this.view = view;
    for (const t of this.tracks) t.age += dt;
    this.tracks = this.tracks.filter((t) => t.age < TRACK_LIFE);
    for (const c of this.list) this.update(world, c, season, dt);
    this.list = this.list.filter((c) => {
      const keep = (c.mode !== 'gone' || c.alpha > 0) && c.x >= view.x0 - MARGIN && c.x <= view.x1 + 1 + MARGIN
        && c.y >= view.y0 - MARGIN && c.y <= view.y1 + 1 + MARGIN + c.z;
      if (!keep) [c.mode, c.alpha] = ['gone', 0]; // so ducklings following it go too
      return keep;
    });
    this.spawnIn -= dt;
    if (this.spawnIn > 0) return;
    this.spawnIn = this.between(SPAWN_GAP);
    const area = (view.x1 - view.x0 + 1) * (view.y1 - view.y0 + 1);
    const target = Math.min(POPULATION[1], Math.max(POPULATION[0], area / TILES_EACH)) * (this.winter ? WINTER_POPULATION : 1);
    const about = this.list.reduce((n, c) => n + (c.mode === 'gone' ? 0 : c.lead || c.kind === 'geese' || c.kind === 'fireflies' ? GROUP_SHARE : 1), 0);
    if (about < target) this.spawn(world, season);
  }

  /** Removes every creature and footprint (zoomed too far out to show them). */
  clear(): void {
    this.list.length = 0;
    this.tracks.length = 0;
  }

  private update(world: World, c: Critter, season: number, dt: number): void {
    this.act(world, c, season, dt);
    // Hidden over the dark beyond sight (judged where it is drawn, so a flyer's height counts), fading in and out of it.
    c.shown = Math.max(0, Math.min(1, c.shown + (inSight(world, c.x, c.y - c.z) ? dt : -dt) * FADE));
  }

  private act(world: World, c: Critter, season: number, dt: number): void {
    const def = KINDS[c.kind];
    c.age += dt;
    if (c.mode === 'gone') {
      c.alpha -= dt * FADE;
      return;
    }
    c.alpha = Math.min(1, c.alpha + dt * FADE);
    if (c.lead) return this.follow(world, c, dt);
    const leaving = c.mode === 'leave' || c.mode === 'flee';
    if (!leaving && (c.age > c.life || !def.seasons.includes(season))) this.leave(world, c);
    else if (!leaving && def.shy && c.z === 0) {
      const v = nearestWalker(world.state, c);
      if (v) this.startle(world, c, v);
    }
    const mode = c.mode as Critter['mode']; // leave() may have just sent it away
    if (mode === 'idle') {
      c.wait -= dt;
      if (c.wait <= 0) this.wander(world, c);
    } else if (mode !== 'gone') this.walk(world, c, dt);
  }

  /** A duckling keeps a step behind the one ahead, and goes when its mother does. */
  private follow(world: World, c: Critter, dt: number): void {
    const l = c.lead!;
    if (l.mode === 'gone') {
      c.mode = 'gone';
      return;
    }
    const dx = l.x - c.x;
    const dy = l.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d <= FOLLOW_GAP) {
      c.mode = 'idle';
      return;
    }
    const step = Math.min(d - FOLLOW_GAP, KINDS.duck.speed * FLEE * dt);
    const [nx, ny] = [c.x + (dx / d) * step, c.y + (dy / d) * step];
    if (!inSight(world, nx, ny)) {
      c.mode = 'idle'; // waits rather than cut a corner through the dark
      return;
    }
    [c.x, c.y] = [nx, ny];
    if (Math.abs(dx) > 0.02) c.left = dx < 0;
    c.mode = 'move';
  }

  private walk(world: World, c: Critter, dt: number): void {
    const flying = c.kind === 'bird' && (c.z > 0 || c.tz > 0);
    const speed = (flying ? FLY_SPEED : KINDS[c.kind].speed) * (c.mode === 'flee' ? FLEE : 1);
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, speed * dt);
    if (Math.abs(dx) > 0.02) c.left = dx < 0;
    // Gliding down to land: the height runs out just as it gets there. Taking off: a steady climb.
    if (c.tz < c.z && d > 0) c.z = c.tz + ((c.z - c.tz) * (d - step)) / d;
    else c.z += Math.max(-CLIMB * dt, Math.min(CLIMB * dt, c.tz - c.z));
    if (d > 0) {
      const [nx, ny] = [c.x + (dx / d) * step, c.y + (dy / d) * step];
      // On foot it never steps into the dark beyond sight: a wanderer stops and picks again; one on its way out fades here.
      if (c.z === 0 && c.tz === 0 && !inSight(world, nx, ny)) {
        if (c.mode === 'leave' || (c.mode === 'flee' && KINDS[c.kind].shy !== 'run')) c.mode = 'gone';
        else [c.mode, c.wait] = ['idle', 0.5];
        return;
      }
      [c.x, c.y] = [nx, ny];
    }
    if (this.winter && (c.kind === 'rabbit' || c.kind === 'fox') && c.z === 0 && open(world.state, tileOf(world.state, c.x, c.y))) {
      c.stride += step;
      if (c.stride >= TRACK_STEP) {
        c.stride = 0;
        this.tracks.push({ x: c.x, y: c.y, left: c.left, age: 0 });
      }
    }
    if (step === d && Math.abs(c.z - c.tz) < 0.01) this.arrive(c);
  }

  private arrive(c: Critter): void {
    if (c.mode === 'leave' || (c.mode === 'flee' && KINDS[c.kind].shy !== 'run')) c.mode = 'gone';
    else {
      c.mode = 'idle';
      c.wait = this.between(KINDS[c.kind].idle);
    }
  }

  /** Picks the next spot to go to on open ground within the kind's reach (near home for frogs, ducks and fireflies). */
  private wander(world: World, c: Critter): void {
    const s = world.state;
    const def = KINDS[c.kind];
    const vision = visionRadius(s);
    for (let tries = 0; tries < 8; tries++) {
      const a = this.random() * Math.PI * 2;
      const r = (0.3 + 0.7 * this.random()) * def.roam;
      const base = c.home && c.kind === 'fireflies' ? c.home : c;
      const x = base.x + Math.cos(a) * r;
      const y = base.y + Math.sin(a) * r;
      const i = tileOf(s, x, y);
      if (i < 0) continue;
      if (c.kind === 'butterfly' || c.kind === 'fireflies') {
        if (world.fog[i] > vision) continue;
        this.go(c, x, y, c.kind === 'butterfly' ? 0.5 + 0.4 * this.random() : 0.2 + 0.7 * this.random(), 'move');
        return;
      }
      if (!open(s, i) || !clearPath(world, c.x, c.y, x, y)) continue;
      if (c.home && Math.hypot(x - c.home.x, y - c.home.y) > 2.5) continue;
      // Squirrels keep to the treeline.
      if (c.kind === 'squirrel' && tries < 6 && !neighbors4(s, i).some((n) => s.tiles[n] === Tile.Tree)) continue;
      this.go(c, x, y, 0, 'move');
      return;
    }
    c.wait = 1;
  }

  /** Time to go: to the last tile in sight on the nearest side, walking (through the forest if need be) or flying, then fade out. Fireflies just fade. */
  private leave(world: World, c: Critter, mode: 'leave' | 'flee' = 'leave'): void {
    if (c.kind === 'fireflies') {
      c.mode = 'gone';
      return;
    }
    const v = this.view;
    const nearLeft = c.x - v.x0 < v.x1 + 1 - c.x;
    const z = c.kind === 'bird' ? 3 : c.kind === 'butterfly' ? c.z : 0;
    for (const left of [nearLeft, !nearLeft]) {
      for (const dy of [0, 1, -1, 2, -2]) {
        const y = c.y + dy - (c.kind === 'bird' ? 1.5 : 0);
        const x = this.edgeX(world, y - z, left, c.x);
        if (x !== null && (z > 0 || clearPath(world, c.x, c.y, x, y))) return this.go(c, x, y, z, mode);
      }
    }
    c.mode = 'gone'; // hemmed in by buildings: it slips away where it stands
  }

  /**
   * Where a creature comes in or goes out on row `y` on one side of the view: the first tile in sight from that
   * side (just off screen if the ground in sight runs past it), scanning toward `toward`. Null if none is in sight.
   */
  private edgeX(world: World, y: number, fromLeft: boolean, toward: number): number | null {
    const v = this.view;
    const step = fromLeft ? 1 : -1;
    for (let x = fromLeft ? v.x0 - 1 : v.x1 + 1; fromLeft ? x <= toward : x >= toward; x += step) {
      if (inSight(world, x + 0.5, y)) return x + (fromLeft ? 0.2 : 0.8);
    }
    return null;
  }

  /** A villager came close: run a few tiles from it, or bolt (or fly) off the side of the view. */
  private startle(world: World, c: Critter, from: { x: number; y: number }): void {
    if (KINDS[c.kind].shy !== 'run') return this.leave(world, c, 'flee');
    const s = world.state;
    const d = Math.hypot(c.x - from.x, c.y - from.y) || 1;
    for (const r of [2.5, 2, 1.5, 1]) {
      const x = c.x + ((c.x - from.x) / d) * r;
      const y = c.y + ((c.y - from.y) / d) * r;
      const i = tileOf(s, x, y);
      if (i >= 0 && open(s, i) && clearPath(world, c.x, c.y, x, y)) return this.go(c, x, y, 0, 'flee');
    }
    this.leave(world, c, 'flee');
  }

  private go(c: Critter, x: number, y: number, z: number, mode: Critter['mode']): void {
    [c.tx, c.ty, c.tz, c.mode] = [x, y, z, mode];
  }

  /** Brings a new creature (or group) in from a side of the view, headed for open ground, a Well, or across the sky. */
  private spawn(world: World, season: number): void {
    const kinds = KIND_LIST.filter((k) => KINDS[k].seasons.includes(season));
    let pick = this.random() * kinds.reduce((n, k) => n + KINDS[k].weight, 0);
    const kind = kinds.find((k) => (pick -= KINDS[k].weight) < 0) ?? kinds[0];
    const def = KINDS[kind];
    const n = def.group[0] + Math.floor(this.random() * (def.group[1] - def.group[0] + 1));
    const s = world.state;
    const v = this.view;
    const winter = season === WINTER;
    const fromLeft = this.random() < 0.5;

    if (def.site === 'sky') {
      // A V of geese crossing from one side to the other, led in from the first tile in sight (the rest fade in behind).
      const dir = fromLeft ? 1 : -1;
      const y = v.y0 + (v.y1 - v.y0) * (0.2 + 0.5 * this.random()) + 3.5;
      const x0 = this.edgeX(world, y - 3.5, fromLeft, fromLeft ? v.x1 + 1 : v.x0);
      if (x0 === null) return;
      const across = v.x1 - v.x0 + 1 + 2 * MARGIN + 6;
      for (let k = 0; k < n; k++) {
        const c = this.add(kind, 'goose', x0 - dir * Math.ceil(k / 2) * 0.7, y + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45, 3.5);
        c.left = !fromLeft;
        this.go(c, c.x + dir * across, c.y - 1, 3.5, 'leave');
      }
      return;
    }
    if (def.site === 'treeline') {
      // Fireflies glow into being at the edge of the trees.
      const tree = this.pickTile(s, (i) => isEdgeTree(world, i));
      if (tree < 0) return;
      const out = neighbors4(s, tree).find((i) => open(s, i))!;
      const home = { x: ((tree % s.w) + (out % s.w)) / 2 + 0.5, y: (Math.floor(tree / s.w) + Math.floor(out / s.w)) / 2 + 0.5 };
      for (let k = 0; k < n; k++) {
        const c = this.add(kind, 'firefly', home.x + (this.random() - 0.5) * 1.5, home.y + (this.random() - 0.5) * 1.5, 0.2 + 0.7 * this.random());
        c.home = home;
        c.wait = this.between(def.idle);
      }
      return;
    }

    // Where it is headed: open ground in view, or open ground by a Well in view.
    let dest = -1;
    let home: { x: number; y: number } | null = null;
    if (def.site === 'well') {
      const wells = s.buildings.filter((b) => b.kind === 'well' && b.x >= v.x0 && b.x <= v.x1 && b.y >= v.y0 && b.y <= v.y1);
      if (!wells.length) return;
      const well = wells[Math.floor(this.random() * wells.length)];
      home = { x: well.x + 0.5, y: well.y + 0.5 };
      const h = home;
      dest = this.pickTile(s, (i) => open(s, i) && Math.hypot((i % s.w) + 0.5 - h.x, Math.floor(i / s.w) + 0.5 - h.y) <= 2);
    } else dest = this.pickTile(s, (i) => open(s, i) && world.fog[i] <= visionRadius(s));
    if (dest < 0) return;
    const dx = (dest % s.w) + 0.2 + 0.6 * this.random();
    const dy = Math.floor(dest / s.w) + 0.2 + 0.6 * this.random();

    if (kind === 'bird' || kind === 'butterfly') {
      // Songbirds fly in from the side and glide down to land; butterflies flutter in.
      for (let k = 0; k < n; k++) {
        const [x, y] = [dx + (this.random() - 0.5) * 0.8, dy + (this.random() - 0.5) * 0.8];
        if (kind === 'butterfly') {
          const sx = this.edgeX(world, y - 0.6, fromLeft, x);
          if (sx === null) continue;
          const c = this.add(kind, 'butterfly', sx, y, 0.6);
          c.variant = Math.floor(this.random() * 4);
          this.go(c, x, y, 0.6, 'move');
        } else {
          const gy = y - 1.5 - this.random(); // where it flies in over, 2.5 tiles below it in the air
          const sx = this.edgeX(world, gy - 2.5, fromLeft, x);
          if (sx === null) continue;
          const c = this.add(kind, 'bird', sx, gy, 2.5);
          if (winter) c.variant = 1;
          const [lx, ly] = open(s, tileOf(s, x, y)) ? [x, y] : [dx, dy]; // each lands on open ground
          this.go(c, lx, ly, 0, 'move');
        }
      }
      return;
    }

    // Walkers come in from the side at the first tile in sight, on a row whose way in isn't blocked by a building.
    for (let tries = 0; tries < 6; tries++) {
      const sy = Math.max(0, Math.min(s.h - 1, Math.floor(dy) + Math.round((this.random() - 0.5) * 4))) + 0.5;
      const sx = this.edgeX(world, sy, fromLeft, dx);
      if (sx === null || !clearPath(world, sx, sy, dx, dy)) continue;
      let lead: Critter | null = null;
      for (let k = 0; k < (kind === 'duck' ? n : 1); k++) {
        const c = this.add(kind, kind === 'duck' && k > 0 ? 'duckling' : (kind as CritterSprite), sx, sy);
        if (kind === 'rabbit' && winter) c.variant = 1;
        if (kind === 'squirrel' && season === 2) c.variant = 1;
        c.home = home;
        c.lead = lead;
        if (!lead) this.go(c, dx, dy, 0, 'move');
        lead = c;
      }
      return;
    }
  }

  private add(kind: CritterKind, sprite: Critter['sprite'], x: number, y: number, z = 0): Critter {
    const c: Critter = {
      kind, sprite, variant: 0, x, y, z, tx: x, ty: y, tz: z, mode: 'idle', wait: 0, age: 0,
      life: this.between(KINDS[kind].life), left: x > this.view.x1, alpha: 0, shown: 0, phase: this.random() * 10,
      lead: null, home: null, stride: 0,
    };
    this.list.push(c);
    return c;
  }

  /** A random tile in view that passes `ok`, or -1. */
  private pickTile(s: GameState, ok: (i: number) => boolean): number {
    const v = this.view;
    for (let tries = 0; tries < 40; tries++) {
      const x = v.x0 + Math.floor(this.random() * (v.x1 - v.x0 + 1));
      const y = v.y0 + Math.floor(this.random() * (v.y1 - v.y0 + 1));
      if (ok(y * s.w + x)) return y * s.w + x;
    }
    return -1;
  }

  private between([lo, hi]: readonly [number, number]): number {
    return lo + (hi - lo) * this.random();
  }
}

/** A tree in sight with open ground beside it: where fireflies glow. */
function isEdgeTree(world: World, i: number): boolean {
  const s = world.state;
  return s.tiles[i] === Tile.Tree && world.fog[i] <= visionRadius(s) && neighbors4(s, i).some((n) => open(s, n));
}

/** The closest villager or mule within SHY_RADIUS, if any. */
function nearestWalker(s: GameState, c: Critter): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = SHY_RADIUS;
  for (const v of [...s.villagers, ...s.mules]) {
    const d = Math.hypot(v.x - c.x, v.y - c.y);
    if (d < bestD) [best, bestD] = [v, d];
  }
  return best;
}

/**
 * Whether a straight walk from (x0, y0) to (x1, y1) stays in sight and crosses no building. Through the forest,
 * under the trees, is fine; into the dark beyond sight is not (creatures come and go at its edge).
 */
function clearPath(world: World, x0: number, y0: number, x1: number, y1: number): boolean {
  const s = world.state;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.2);
  for (let k = 1; k <= n; k++) {
    const [x, y] = [x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n];
    if (!inSight(world, x, y) || s.tiles[tileOf(s, x, y)] === Tile.Building) return false;
  }
  return true;
}

/** The animation frame to draw, from what the creature is doing and wall-clock `now` (ms). */
export function critterFrame(c: Critter, now: number): string {
  const t = now / 1000 + c.phase;
  const moving = c.mode !== 'idle' && c.mode !== 'gone';
  const alt = (period: number, a: string, b: string) => (Math.floor(t / period) % 2 ? b : a);
  switch (c.sprite) {
    case 'rabbit': return moving ? 'hop' : t % 3 < 0.25 ? 'twitch' : 'sit';
    case 'squirrel': return moving ? alt(0.09, 'run1', 'run2') : c.variant === 1 ? 'eat' : 'sit';
    case 'bird': return c.z > 0.05 ? 'fly' : !moving && t % 1.2 < 0.4 ? 'peck' : 'stand';
    case 'butterfly': return alt(0.12, 'open', 'closed');
    case 'frog': return moving ? 'hop' : 'sit';
    case 'duck':
    case 'duckling': return moving ? alt(0.2, 'walk1', 'walk2') : 'walk1';
    case 'hedgehog': return moving ? alt(0.18, 'walk1', 'walk2') : 'walk1';
    case 'fox': return moving ? alt(0.15, 'trot1', 'trot2') : 'stand';
    case 'deer': return moving ? alt(0.25, 'walk', 'stand') : t % 5 < 1.5 ? 'stand' : 'graze';
    case 'goose': return alt(0.25, 'up', 'down');
    default: return '';
  }
}

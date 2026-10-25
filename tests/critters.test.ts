import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { addBuilding } from '../src/core/buildings';
import { rand } from '../src/core/rng';
import { serialize } from '../src/core/save';
import { Tile } from '../src/core/types';
import { onBuildingsChanged, visionRadius, type World } from '../src/core/world';
import { critterFrame, critterTarget, Critters, hopLift, KINDS, type Critter, type CritterKind, type View } from '../src/render/critters';
import { clearArea, smallWorld } from './helpers';

const SEASON = CONFIG.seasons.length;
const DT = 0.1;

/** A 30×30 map with a wide clearing, a Well and one villager (standing still: the simulation never runs here). */
function forest(): { w: World; view: View } {
  const w = smallWorld(30, 1);
  clearArea(w, 8, 8, 21, 21);
  addBuilding(w.state, 'well', 10, 10);
  onBuildingsChanged(w);
  return { w, view: { x0: 0, y0: 0, x1: 29, y1: 29 } };
}

const seeded = (seed: number) => {
  const o = { rng: seed };
  return () => rand(o);
};

const inSeason = (season: number) => (Object.keys(KINDS) as CritterKind[]).filter((k) => KINDS[k].seasons.includes(season));
const walking = (c: Critter) => c.z === 0 && c.sprite !== 'butterfly' && c.sprite !== 'firefly' && c.mode !== 'gone';

/** Runs `seconds` and hands every creature alive at each step to `each`. */
function run(c: Critters, w: World, view: View, seconds: number, each: (c: Critter) => void = () => {}): void {
  for (let t = 0; t < seconds; t += DT) {
    c.step(w, view, DT);
    c.list.forEach(each);
  }
}

describe('forest creatures', () => {
  it('only shows kinds in season, and walkers go through the forest but never over a building', () => {
    const { w, view } = forest();
    const s = w.state;
    const critters = new Critters(seeded(1));
    const seen = new Set<CritterKind>();
    let underTrees = 0;
    run(critters, w, view, 400, (c) => {
      seen.add(c.kind);
      const i = Math.floor(c.y) * s.w + Math.floor(c.x);
      if (!walking(c) || c.x < 0 || c.x >= s.w) return;
      expect(s.tiles[i]).not.toBe(Tile.Building);
      if (s.tiles[i] === Tile.Tree) underTrees++;
    });
    for (const k of seen) expect(inSeason(0)).toContain(k);
    for (const k of ['rabbit', 'bird', 'butterfly', 'squirrel'] as const) expect(seen).toContain(k);
    expect(underTrees).toBeGreaterThan(0);
  });

  it('rests under the trees as well as on open ground, showing below the canopy', () => {
    const { w, view } = forest();
    const s = w.state;
    const critters = new Critters(seeded(11));
    const shaded = new Set<CritterKind>();
    let inOpen = 0;
    for (const season of [0, 2]) {
      s.time = season * SEASON + 1;
      run(critters, w, view, 400, (c) => {
        if (c.mode !== 'idle' || c.lead || !walking(c) || c.x !== c.tx || c.y !== c.ty) return; // resting where it chose to
        const i = Math.floor(c.y) * s.w + Math.floor(c.x);
        if (s.tiles[i] !== Tile.Tree) return void inOpen++;
        shaded.add(c.kind);
        expect(KINDS[c.kind].cover).toBeGreaterThan(0);
        expect(c.y % 1).toBeGreaterThanOrEqual(0.75);
      });
    }
    expect(shaded.size).toBeGreaterThan(1);
    expect(inOpen).toBeGreaterThan(0);
  });

  it('comes in from any side of the view, each about as often, and leaves off a side', () => {
    const { w } = forest();
    const view = { x0: 10, y0: 10, x1: 19, y1: 19 }; // open ground runs past every side
    const critters = new Critters(seeded(7));
    const offSide = (x: number) => x < view.x0 || x > view.x1 + 1;
    /** The side of the view a point (drawn where it is, height included) is off, if any. */
    const sideOf = (c: Critter) =>
      c.x < view.x0 ? 'left' : c.x > view.x1 + 1 ? 'right' : c.y - c.z < view.y0 ? 'top' : c.y - c.z > view.y1 + 1 ? 'bottom' : null;
    const met = new Set<Critter>();
    const sides = { left: 0, right: 0, top: 0, bottom: 0 };
    let left = 0;
    for (const season of [0, 2]) {
      w.state.time = season * SEASON + 1;
      run(critters, w, view, 300, (c) => {
        if (!met.has(c)) {
          met.add(c);
          if (c.kind === 'fireflies') return;
          const side = sideOf(c);
          expect(side).not.toBeNull();
          if (c.kind !== 'geese' && !c.lead) sides[side!]++;
        }
        if (c.mode === 'leave') {
          expect(offSide(c.tx)).toBe(true);
          left++;
        }
      });
    }
    expect(met.size).toBeGreaterThan(10);
    const total = sides.left + sides.right + sides.top + sides.bottom;
    for (const n of Object.values(sides)) expect(n).toBeGreaterThan(total / 8);
    expect(left).toBeGreaterThan(0);
  });

  it('never shows a creature over the dark beyond sight, nor walks into it: it comes and goes at the first tile in sight', () => {
    const { w, view } = forest(); // sight ends 3 tiles past the clearing, with black beyond
    const s = w.state;
    const inSight = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < s.w && y < s.h && w.fog[Math.floor(y) * s.w + Math.floor(x)] <= visionRadius(s);
    expect(inSight(2.5, 15.5)).toBe(false);
    const critters = new Critters(seeded(8));
    const met = new Set<Critter>();
    for (const season of [0, 1, 2]) {
      s.time = season * SEASON + 1;
      run(critters, w, view, 300, (c) => {
        if (c.shown === 1) expect(inSight(c.x, c.y - c.z)).toBe(true);
        if (c.z === 0 && c.tz === 0) expect(inSight(c.x, c.y)).toBe(true); // on foot, never in the dark, even on its way out
        if (c.kind === 'geese') return; // the V is led in from sight; the rest fade in behind
        if (!met.has(c)) {
          met.add(c);
          expect(inSight(c.x, c.y - c.z)).toBe(true);
        }
        if (c.mode === 'leave') expect(inSight(c.tx, c.ty - c.tz)).toBe(true);
      });
    }
    expect(met.size).toBeGreaterThan(10);
  });

  it('never walks into a dark pocket inside the land in sight, even taking the short way across', () => {
    // A ring of cleared land around a stand of forest whose middle is out of sight, joined to the Town Center's clearing.
    const w = smallWorld(50, 1);
    clearArea(w, 17, 17, 22, 19);
    for (const [x0, y0, x1, y1] of [[1, 17, 19, 19], [17, 1, 19, 19], [1, 1, 19, 3], [1, 1, 3, 19]]) clearArea(w, x0, y0, x1, y1);
    const s = w.state;
    const inSight = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < s.w && y < s.h && w.fog[Math.floor(y) * s.w + Math.floor(x)] <= visionRadius(s);
    expect(inSight(10.5, 10.5)).toBe(false);
    const critters = new Critters(seeded(9));
    let onFoot = 0;
    for (const season of [0, 1, 2, 3]) {
      s.time = season * SEASON + 1;
      run(critters, w, { x0: 0, y0: 0, x1: 22, y1: 22 }, 300, (c) => {
        if (c.z !== 0 || c.tz !== 0) return;
        onFoot++;
        expect(inSight(c.x, c.y)).toBe(true);
      });
    }
    expect(onFoot).toBeGreaterThan(1000);
  });

  it('brings frogs and a duck family to a Well in spring', () => {
    const { w, view } = forest();
    const critters = new Critters(seeded(3));
    let ducklings = 0;
    run(critters, w, view, 600, (c) => {
      if (c.sprite === 'duckling') ducklings++;
      if (c.kind === 'frog' || c.kind === 'duck') expect(c.home).toEqual({ x: 10.5, y: 10.5 });
    });
    expect(ducklings).toBeGreaterThan(0);
  });

  it('winter has hares, cardinals and foxes, and leaves tracks in the snow', () => {
    const { w, view } = forest();
    w.state.time = 3 * SEASON + 1;
    const critters = new Critters(seeded(2));
    const seen = new Set<CritterKind>();
    let tracks = 0;
    run(critters, w, view, 400, (c) => {
      seen.add(c.kind);
      if (c.kind === 'rabbit' || c.kind === 'bird') expect(c.variant).toBe(1);
      tracks = Math.max(tracks, critters.tracks.length);
    });
    for (const k of seen) expect(['rabbit', 'bird', 'fox']).toContain(k);
    expect(tracks).toBeGreaterThan(0);
  });

  it('sends creatures home when their season ends', () => {
    const { w, view } = forest();
    w.state.time = SEASON + 1; // summer
    const critters = new Critters(seeded(4));
    run(critters, w, view, 120);
    expect(critters.list.some((c) => c.kind === 'butterfly' || c.kind === 'fireflies')).toBe(true);
    w.state.time = 3 * SEASON + 1; // winter
    run(critters, w, view, 60);
    for (const c of critters.list) expect(inSeason(3)).toContain(c.kind);
  });

  it('startles when a villager comes close', () => {
    const { w, view } = forest();
    const critters = new Critters(seeded(5));
    let rabbit: Critter | undefined;
    for (let t = 0; t < 300 && !rabbit; t += DT) {
      critters.step(w, view, DT);
      rabbit = critters.list.find((c) => c.kind === 'rabbit' && c.mode === 'idle');
    }
    expect(rabbit).toBeDefined();
    const v = w.state.villagers[0];
    [v.x, v.y] = [rabbit!.x + 0.5, rabbit!.y];
    critters.step(w, view, DT);
    expect(['flee', 'leave', 'gone']).toContain(rabbit!.mode);
  });

  it('rabbits hop off the ground only while on the move', () => {
    const { w, view } = forest();
    const critters = new Critters(seeded(5));
    let rabbit: Critter | undefined;
    for (let t = 0; t < 300 && !rabbit; t += DT) {
      critters.step(w, view, DT);
      rabbit = critters.list.find((c) => c.kind === 'rabbit');
    }
    const r = rabbit!;
    const sample = () => Array.from({ length: 100 }, (_, k) => ({ lift: hopLift(r, k * 10), frame: critterFrame(r, k * 10) }));
    r.mode = 'move';
    const hops = sample();
    expect(Math.max(...hops.map((h) => h.lift))).toBeGreaterThan(0.1);
    for (const h of hops) expect(h.frame).toBe(h.lift > 0 ? 'leap' : 'crouch');
    r.mode = 'idle';
    for (const h of sample()) {
      expect(h.lift).toBe(0);
      expect(['sit', 'twitch']).toContain(h.frame);
    }
  });

  it('keeps more creatures about as more of the view comes into sight, up to a cap', () => {
    const w = smallWorld(60, 0, 3); // the starting 6×6 clearing: 12×12 tiles in sight
    const view = { x0: 0, y0: 0, x1: 59, y1: 59 };
    const start = critterTarget(w, view, false);
    expect(start).toBeCloseTo(3);
    clearArea(w, 24, 24, 35, 35); // land 12×12 around the start: 18×18 in sight
    expect(critterTarget(w, view, false)).toBeCloseTo((18 * 18) / 48);
    w.fog.fill(0); // everything in sight
    expect(critterTarget(w, view, false)).toBe(12);
    expect(critterTarget(w, view, true)).toBeCloseTo(12 * 0.6);
    expect(critterTarget(w, { x0: 30, y0: 30, x1: 35, y1: 35 }, false)).toBe(1); // zoomed in close: a few tiles, still one
  });

  it('brings only a few creatures to the starting clearing, and many more once much more is in sight', () => {
    const view = { x0: 0, y0: 0, x1: 39, y1: 39 };
    /** Creatures about on average over two minutes, counted as the spawner counts them (a duckling, goose or firefly is a share). */
    const average = (w: World) => {
      const c = new Critters(seeded(4));
      run(c, w, view, 30); // settle in
      let sum = 0;
      let n = 0;
      for (let t = 0; t < 120; t += DT, n++) {
        c.step(w, view, DT);
        sum += c.list.reduce((m, k) => m + (k.mode === 'gone' ? 0 : k.lead || k.kind === 'geese' || k.kind === 'fireflies' ? 0.3 : 1), 0);
      }
      return sum / n;
    };
    const start = average(smallWorld(40, 0, 3));
    const wide = smallWorld(40, 0, 3);
    clearArea(wide, 4, 4, 35, 35);
    const full = average(wide);
    expect(start).toBeGreaterThan(1);
    expect(start).toBeLessThan(4);
    expect(full).toBeGreaterThan(3 * start);
  });

  it('never touches the game state', () => {
    const { w, view } = forest();
    const before = serialize(w.state, 0);
    run(new Critters(seeded(6)), w, view, 200);
    expect(serialize(w.state, 0)).toBe(before);
  });
});

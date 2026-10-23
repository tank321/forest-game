import { describe, expect, it } from 'vitest';
import { workersOf } from '../src/core/buildings';
import { chopTree, placeBuilding } from '../src/core/commands';
import { isChoppable, neighbors8 } from '../src/core/grid';
import { relicSpacing } from '../src/core/relics';
import { simulate } from '../src/core/sim';
import { availableSkills } from '../src/core/skills';
import { getStats } from '../src/core/stats';
import { Tile } from '../src/core/types';
import { visionRadius, type World } from '../src/core/world';
import { clearArea, pave, smallWorld, totalWood } from './helpers';

const AUTUMN_END = 3 * 180;

/** A choppable tree with a choppable tree beside it. */
function pairedTree(w: World): [number, number] {
  const s = w.state;
  for (let i = 0; i < s.tiles.length; i++) {
    if (!isChoppable(s, i)) continue;
    const j = neighbors8(s, i).find((n) => isChoppable(s, n));
    if (j !== undefined) return [i, j];
  }
  throw new Error('no paired tree');
}

/** Farms side by side west of the clearing, connected by road. */
function withFarms(n: number, villagers = 0): World {
  const w = smallWorld(30, villagers, 4);
  const s = w.state;
  s.nextRelicAt = Infinity;
  const { x, y } = s.origin;
  clearArea(w, x - 3 * n, y, x - 1, y + 3); // the last row stays open for the road
  s.resources.wood = 1e6;
  for (let k = 1; k <= n; k++) expect(placeBuilding(w, 'farm', x - 3 * k, y)).toBe(true);
  s.resources.wood = 0;
  return pave(w);
}

describe('forestry and farming skills', () => {
  it('offer a Mastery once its track has 8 levels', () => {
    const s = smallWorld().state;
    s.skills = { sharpAxes: 5, powerSwing: 2 };
    expect(availableSkills(s)).not.toContain('timber');
    s.skills.campCrews = 1;
    expect(availableSkills(s)).toContain('timber');
    expect(availableSkills(s)).not.toContain('harvestFestival');
  });

  it('Sweeping Strike hits neighbours for half; Momentum builds a capped combo that resets', () => {
    const w = smallWorld();
    const s = w.state;
    s.nextRelicAt = Infinity;
    const [i, j] = pairedTree(w);
    s.skills = { sweepingStrike: 1 };
    const [wi, wj] = [s.wood[i], s.wood[j]];
    chopTree(w, i);
    expect([wi - s.wood[i], wj - s.wood[j]]).toEqual([1, 0.5]);

    s.skills = { momentum: 1 };
    const hits = Array.from({ length: 8 }, () => {
      const before = s.wood[i];
      chopTree(w, i);
      return Number((before - s.wood[i]).toFixed(6));
    });
    expect(hits).toEqual([1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.5, 1.5]);
    s.time += 2;
    const before = s.wood[i];
    chopTree(w, i);
    expect(before - s.wood[i]).toBe(1);
  });

  it('Timber! topples a felled tree onto a neighbour, and Heartwood pays bonus wood', () => {
    const w = smallWorld();
    const s = w.state;
    s.nextRelicAt = Infinity;
    s.skills = { timber: 1 };
    const [i] = pairedTree(w);
    const near = neighbors8(s, i).filter((n) => s.tiles[n] === Tile.Tree);
    const woodNear = () => near.reduce((sum, n) => sum + s.wood[n], 0);
    const [total, around] = [totalWood(w), woodNear()];
    w.dev.manualMult = 1e9;
    chopTree(w, i);
    expect(around - woodNear()).toBeCloseTo(Math.min(0.5 * w.maxWood[i], around));
    expect(totalWood(w)).toBeCloseTo(total); // the toppled wood is gathered, not lost

    const h = smallWorld(30);
    h.state.nextRelicAt = Infinity;
    h.state.skills = { heartwood: 3 };
    const { x, y } = h.state.origin;
    clearArea(h, x - 4, y - 4, x + 9, y + 9);
    expect(h.gathered.bonus.wood).toBeGreaterThan(0);
  });

  it('apply Crop Rotation, Farmhands, Greenhouses, Root Cellars and Keen Eyes', () => {
    const w = withFarms(2, 8);
    const s = w.state;
    const [a, b] = s.buildings.filter((f) => f.kind === 'farm');
    s.skills = { cropRotation: 1, farmhands: 1 };
    expect(getStats(s).cropBonus.get(a.id)).toBe(1.25);
    expect(getStats(s).cropBonus.get(b.id)).toBe(1.25);
    expect(workersOf(s, a)).toBe(2);

    s.time = AUTUMN_END + 1;
    expect(getStats(s).farmRate).toBe(0);
    s.skills = { greenhouses: 1 };
    expect(getStats(s).farmRate).toBeGreaterThan(0);

    const eat = getStats(s).eat;
    s.skills = { rootCellars: 2 };
    expect(getStats(s).eat).toBeCloseTo(eat * 0.85 ** 2);

    s.skills = { keenEyes: 1 };
    expect(visionRadius(s)).toBe(4);
    expect(relicSpacing(s, 0)).toBe(Math.ceil(18 * 0.9));
  });

  it('Harvest Festival pays a minute of autumn harvest as winter begins, at any step size', () => {
    const festival = (step: number) => {
      const w = withFarms(1, 2);
      w.state.skills = { harvestFestival: 1 };
      w.state.time = AUTUMN_END - 30;
      simulate(w, 20, step); // farmers staffed, still autumn
      const expected = 60 * getStats(w.state).farmRate;
      expect(w.gathered.bonus.food).toBe(0);
      simulate(w, 20, step);
      expect(w.fx.find((f) => f.kind === 'festival')?.n).toBeCloseTo(expected);
      return w.gathered.bonus.food;
    };
    const fine = festival(1 / 30);
    expect(fine).toBeGreaterThan(0);
    expect(festival(1)).toBeCloseTo(fine);
  });
});

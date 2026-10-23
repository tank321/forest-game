import { describe, expect, it } from 'vitest';
import { chopTree, collectRelic, hireVillager, pickSkill, placeBuilding } from '../src/core/commands';
import { buildingCost, popCap, villagerCost } from '../src/core/economy';
import { isCollectable, neighbors4 } from '../src/core/grid';
import { relicGap, spawnRelic } from '../src/core/relics';
import { simulate } from '../src/core/sim';
import { availableSkills, dealCards, SKILLS } from '../src/core/skills';
import { getStats } from '../src/core/stats';
import { Tile } from '../src/core/types';
import type { World } from '../src/core/world';
import { smallWorld } from './helpers';

const fell = (w: World, i: number) => {
  while (w.state.tiles[i] === Tile.Tree) chopTree(w, i);
};

/** Chop toward tile `to` until it touches territory. */
function clearPathTo(w: World, to: number) {
  const s = w.state;
  const tx = to % s.w;
  const ty = (to / s.w) | 0;
  while (!isCollectable(s, to)) {
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < s.tiles.length; i++) {
      if (s.tiles[i] !== Tile.Tree || !neighbors4(s, i).some((n) => s.tiles[n] === Tile.Grass)) continue;
      const d = Math.max(Math.abs((i % s.w) - tx), Math.abs(((i / s.w) | 0) - ty));
      if (d < bd) [bd, best] = [d, i];
    }
    fell(w, best);
  }
}

describe('relics', () => {
  it('gaps follow the reference milestones', () => {
    expect([0, 1, 49, 50, 51].map(relicGap)).toEqual([18, 19, 67, 69, 71]);
  });

  it('spawn after 18 felled trees on a visible tile not yet touching territory', () => {
    const w = smallWorld(30);
    w.dev.manualMult = 1e6;
    const s = w.state;
    for (let k = 0; k < 18; k++) {
      expect(s.relics).toHaveLength(0);
      fell(w, [...s.tiles.keys()].find((i) => s.tiles[i] === Tile.Tree && neighbors4(s, i).some((n) => s.tiles[n] === Tile.Grass))!);
    }
    expect(s.relics).toHaveLength(1);
    const r = s.relics[0];
    expect(s.tiles[r]).toBe(Tile.Relic);
    expect(w.fog[r]).toBeGreaterThanOrEqual(2);
    expect(s.nextRelicAt).toBe(18 + 19);
  });

  it('must be reached before collecting; collecting offers 3 cards and claims the tile', () => {
    const w = smallWorld(30);
    w.dev.manualMult = 1e6;
    const s = w.state;
    const r = spawnRelic(s, w.fog.map((f) => (f === 0 ? 0 : 2)));
    expect(collectRelic(w, r)).toBe(false);
    clearPathTo(w, r);
    expect(collectRelic(w, r)).toBe(true);
    expect(s.tiles[r]).toBe(Tile.Grass);
    expect(s.cards).toHaveLength(3);
    expect(new Set(s.cards).size).toBe(3);
    expect(pickSkill(w, 'teamwork')).toBe(false); // locked behind Big Baskets, never offered
    const id = s.cards[0];
    expect(pickSkill(w, id)).toBe(true);
    expect(s.skills[id]).toBe(1);
    expect(s.cards).toEqual([]);
  });

  it('respects prerequisites and max levels', () => {
    const s = smallWorld().state;
    expect(availableSkills(s)).not.toContain('teamwork');
    s.skills.bigBaskets = 1;
    s.skills.powerSwing = SKILLS.powerSwing.max;
    expect(availableSkills(s)).toContain('teamwork');
    expect(availableSkills(s)).not.toContain('powerSwing');
    for (let k = 0; k < 50; k++) {
      dealCards(s);
      expect(s.cards).not.toContain('powerSwing');
    }
  });
});

describe('skill effects', () => {
  it('modify stats and costs', () => {
    const w = smallWorld();
    const s = w.state;
    const base = getStats(s);
    s.skills = { sharpAxes: 2, bigBaskets: 1, swiftFeet: 1, powerSwing: 1, roomyHouses: 1, recruiters: 1, masterBuilders: 1 };
    const st = getStats(s);
    expect(st.chopRate).toBeCloseTo(base.chopRate * 1.4);
    expect(st.carry).toBe(base.carry + 2);
    expect(st.speed).toBeCloseTo(base.speed * 1.1);
    expect(st.manualChop).toBe(5);
    expect(villagerCost(s).wood).toBe(9); // round(10 × 0.85)
    expect(buildingCost(s, 'house').wood).toBe(80);
    s.resources.wood = 1e6;
    placeBuilding(w, 'house', s.origin.x, s.origin.y + 1);
    expect(popCap(s)).toBe(5 + 4);
  });

  it('teamwork lets two villagers share a tree', () => {
    const w = smallWorld(30, 2);
    const s = w.state;
    s.skills.teamwork = 1;
    s.nextRelicAt = Infinity;
    const first = s.origin.y * s.w - s.w + s.origin.x;
    s.marked.push(first);
    simulate(w, 1, 1 / 30);
    expect(s.villagers.map((v) => v.target)).toEqual([first, first]);
  });

  it('counts lifetime wood from taps and deliveries', () => {
    const w = smallWorld(30, 1);
    const s = w.state;
    chopTree(w, s.origin.y * s.w - s.w + s.origin.x);
    simulate(w, 60, 1);
    expect(s.totals.wood).toBeGreaterThan(1);
    expect(s.totals.wood).toBe(s.resources.wood);
    hireVillager(w);
    expect(s.totals.wood).toBeGreaterThan(s.resources.wood);
  });
});

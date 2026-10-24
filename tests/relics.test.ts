import { describe, expect, it } from 'vitest';
import { chopTree, collectRelic, hireVillager, pickSkill, placeBuilding } from '../src/core/commands';
import { buildingCost, popCap, villagerCost } from '../src/core/economy';
import { isCollectable, neighbors4 } from '../src/core/grid';
import { relicGap, spawnRelic } from '../src/core/relics';
import { simulate } from '../src/core/sim';
import { availableSkills, dealCards, isMastery, levelsNeeded, prerequisite, SKILL_IDS, SKILLS, TRACK_IDS, trackOf, TRACKS, unlockedBy, type SkillId } from '../src/core/skills';
import { NODE, skillLayout } from '../src/ui/skillGraph';
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
    expect(pickSkill(w, 'teamwork')).toBe(false); // last in Forestry, never offered first
    const id = s.cards[0];
    expect(pickSkill(w, id)).toBe(true);
    expect(s.skills[id]).toBe(1);
    expect(s.cards).toEqual([]);
  });

  it('respects prerequisites and max levels', () => {
    const s = smallWorld().state;
    expect(availableSkills(s)).not.toContain('campCrews');
    s.skills.sharpAxes = 1;
    s.skills.powerSwing = SKILLS.powerSwing.max;
    expect(availableSkills(s)).toContain('campCrews');
    expect(availableSkills(s)).not.toContain('powerSwing');
    expect(availableSkills(s)).not.toContain('teamwork');
    for (let k = 0; k < 50; k++) {
      dealCards(s);
      expect(s.cards).not.toContain('powerSwing');
    }
  });
});

describe('skill tracks', () => {
  it('put every skill in exactly one track', () => {
    const all = TRACK_IDS.flatMap((t) => [...TRACKS[t]]);
    expect(all.sort()).toEqual([...SKILL_IDS].sort());
    for (const t of TRACK_IDS) for (const id of TRACKS[t]) expect(trackOf(id)).toBe(t);
  });

  it('offer only the first skill of each track at the start', () => {
    const s = smallWorld().state;
    expect(availableSkills(s).sort()).toEqual(TRACK_IDS.map((t) => TRACKS[t][0]).sort());
  });

  it('form one tree per track: a parent comes earlier in the same track and can unlock several skills', () => {
    for (const t of TRACK_IDS) {
      const ids: readonly SkillId[] = TRACKS[t];
      expect(ids.filter((id) => !prerequisite(id) && !isMastery(id))).toEqual([ids[0]]);
      for (const id of ids.slice(1)) expect(ids.indexOf(prerequisite(id)!)).toBeLessThan(ids.indexOf(id));
    }
    expect(unlockedBy('markets')).toEqual(['tradingPosts', 'taxOffices', 'shrewdTraders']);
  });

  it('unlock each skill once its parent has a level', () => {
    const s = smallWorld().state;
    for (const id of SKILL_IDS) {
      const req = prerequisite(id);
      if (!req || levelsNeeded(id)) continue;
      s.skills = {};
      expect(availableSkills(s)).not.toContain(id);
      s.skills = { [req]: 1 };
      expect(availableSkills(s)).toContain(id);
    }
  });

  it('hold gated skills back until their track has enough levels', () => {
    const s = smallWorld().state;
    s.skills = { sheepFarms: 1, tailoring: 1 };
    expect(levelsNeeded('cottonFields')).toBe(5);
    expect(availableSkills(s)).not.toContain('cottonFields');
    s.skills.openPastures = 3;
    expect(availableSkills(s)).toContain('cottonFields');
    s.skills = { greenThumbs: 3 };
    expect(availableSkills(s)).not.toContain('orchards'); // 3 levels, but Farmhands is missing
  });

  it('lay the tree out with children below their parent and no overlapping nodes', () => {
    const { w, h, nodes } = skillLayout();
    for (const id of SKILL_IDS) {
      const { x, y } = nodes[id];
      const req = prerequisite(id);
      if (req) expect(y).toBeGreaterThan(nodes[req].y + NODE.h);
      expect(x - NODE.w / 2).toBeGreaterThanOrEqual(0);
      expect(x + NODE.w / 2).toBeLessThanOrEqual(w);
      expect(y + NODE.h).toBeLessThanOrEqual(h);
      for (const other of SKILL_IDS) {
        if (other === id) continue;
        const o = nodes[other];
        expect(Math.abs(o.x - x) >= NODE.w || Math.abs(o.y - y) >= NODE.h).toBe(true);
      }
    }
  });

  it('deal relic choices from different tracks while they last', () => {
    const s = smallWorld().state;
    s.skills = { sharpAxes: 1, powerSwing: 1, swiftFeet: 1, bigBaskets: 1 };
    for (let k = 0; k < 50; k++) {
      dealCards(s);
      expect(new Set(s.cards.map(trackOf)).size).toBe(3);
    }
    // Only Forestry is left: all three choices come from it.
    s.skills = { sharpAxes: 1, powerSwing: 1 };
    for (const t of TRACK_IDS) if (t !== 'forestry') for (const id of TRACKS[t]) s.skills[id] = SKILLS[id].max;
    dealCards(s);
    expect(s.cards.map(trackOf)).toEqual(['forestry', 'forestry', 'forestry']);
    expect(new Set(s.cards).size).toBe(3);
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

  it('felling crews put three villagers on a flagged tree and two on others', () => {
    const w = smallWorld(30, 5);
    const s = w.state;
    s.skills = { teamwork: 1, fellingCrews: 1 };
    s.nextRelicAt = Infinity;
    const first = s.origin.y * s.w - s.w + s.origin.x;
    s.marked.push(first);
    simulate(w, 1, 1 / 30);
    const count = new Map<number, number>();
    for (const v of s.villagers) count.set(v.target, (count.get(v.target) ?? 0) + 1);
    expect(count.get(first)).toBe(3);
    expect(Math.max(...[...count].filter(([t]) => t !== first).map(([, n]) => n))).toBe(2);
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

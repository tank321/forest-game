import { describe, expect, it } from 'vitest';
import { chopTree, hireVillager, openRelic, pickSkill, placeBuilding, reshuffleCards } from '../src/core/commands';
import { deserialize, serialize } from '../src/core/save';
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

  it('a relic in a later run offers more cards', () => {
    const w = smallWorld(30);
    w.dev.manualMult = 1e6;
    const s = w.state;
    s.legacy.runs = 2;
    const r = spawnRelic(s, w.fog.map((f) => (f === 0 ? 0 : 2)));
    clearPathTo(w, r);
    expect(openRelic(w, r)).toBe(true);
    expect(s.cards).toHaveLength(5);
    expect(new Set(s.cards).size).toBe(5);
  });

  it('must be reached before opening; it offers 3 cards and stays on the map until one is picked', () => {
    const w = smallWorld(30);
    w.dev.manualMult = 1e6;
    const s = w.state;
    const r = spawnRelic(s, w.fog.map((f) => (f === 0 ? 0 : 2)));
    expect(openRelic(w, r)).toBe(false);
    clearPathTo(w, r);
    expect(openRelic(w, r)).toBe(true);
    expect(s.tiles[r]).toBe(Tile.Relic);
    expect(s.cards).toHaveLength(3);
    expect(new Set(s.cards).size).toBe(3);
    const offer = [...s.cards];
    expect(openRelic(w, r)).toBe(true); // opened again (closed without picking): the same offer
    expect(s.cards).toEqual(offer);
    expect(s.counts.relics).toBe(0);
    expect(pickSkill(w, 'teamwork', r)).toBe(false); // last in Forestry, never offered first
    const id = s.cards[0];
    expect(pickSkill(w, id, r)).toBe(true);
    expect(s.skills[id]).toBe(1);
    expect(s.cards).toEqual([]);
    expect(s.tiles[r]).toBe(Tile.Grass);
    expect(s.relics).toEqual([]);
    expect(s.counts.relics).toBe(1);
    expect(pickSkill(w, offer[1])).toBe(false); // no offer left
  });

  it('a pick takes the relic opened, or any reachable one; none reachable, no pick', () => {
    const w = smallWorld(30);
    w.dev.manualMult = 1e6;
    const s = w.state;
    const a = spawnRelic(s, w.fog.map((f) => (f === 0 ? 0 : 2)));
    clearPathTo(w, a);
    const far = 0; // the map's corner, deep in the forest
    s.tiles[far] = Tile.Relic;
    s.relics.push(far);
    s.cards = ['sharpAxes'];
    expect(pickSkill(w, 'sharpAxes', far)).toBe(true); // out of reach: the reachable one is taken instead
    expect(s.relics).toEqual([far]);
    s.cards = ['greenThumbs'];
    expect(pickSkill(w, 'greenThumbs')).toBe(false); // nothing in reach
  });

  it('reshuffles a relic offer once, dealing other skills where there are any', () => {
    const w = smallWorld(30);
    w.dev.manualMult = 1e6;
    const s = w.state;
    s.skills = { sharpAxes: 1, greenThumbs: 1, quarrying: 1, markets: 1, swiftFeet: 1, sheepFarms: 1 }; // plenty on offer
    const r = spawnRelic(s, w.fog.map((f) => (f === 0 ? 0 : 2)));
    clearPathTo(w, r);
    expect(reshuffleCards(w)).toBe(false); // nothing on offer yet
    openRelic(w, r);
    const first = [...s.cards];
    expect(reshuffleCards(w)).toBe(true);
    expect(s.cards).toHaveLength(first.length);
    expect(s.cards.some((id) => first.includes(id))).toBe(false);
    expect(reshuffleCards(w)).toBe(false); // once
    const second = [...s.cards];
    openRelic(w, r); // closed and opened again: still the reshuffled offer, still used up
    expect(s.cards).toEqual(second);
    expect(reshuffleCards(w)).toBe(false);
    expect(pickSkill(w, second[0], r)).toBe(true);
    expect(s.reshuffled).toBe(false); // the next relic may reshuffle again
  });

  it('a reshuffle tops up with the skills it was dealing away when too few others are left', () => {
    const s = smallWorld().state;
    const all = availableSkills(s);
    dealCards(s, all.length - 1, all.slice(0, 3));
    expect(s.cards).toHaveLength(all.length - 1);
    expect(new Set(s.cards).size).toBe(s.cards.length);
  });

  it('a v24 save migrates with its offer not yet reshuffled', () => {
    const w = smallWorld(30);
    const old = JSON.parse(serialize(w.state, 1));
    old.version = 24;
    delete old.state.reshuffled;
    expect(deserialize(JSON.stringify(old)).state.reshuffled).toBe(false);
  });

  it('with every skill maxed, a relic is taken at once', () => {
    const w = smallWorld(30);
    w.dev.manualMult = 1e6;
    const s = w.state;
    for (const id of SKILL_IDS) s.skills[id] = SKILLS[id].max;
    const r = spawnRelic(s, w.fog.map((f) => (f === 0 ? 0 : 2)));
    clearPathTo(w, r);
    expect(openRelic(w, r)).toBe(true);
    expect(s.cards).toEqual([]);
    expect(s.tiles[r]).toBe(Tile.Grass);
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
    s.skills = { greenThumbs: 2, rootCellars: 2 };
    expect(availableSkills(s)).not.toContain('orchards'); // 4 levels, but Farmhands is missing
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

  it('deal an untouched track as often as a crowded one: half the deals with six tracks on offer', () => {
    const s = smallWorld().state;
    // Forestry and Settlement have many skills on offer; Mining still only Quarrying.
    s.skills = { sharpAxes: 1, powerSwing: 1, campCrews: 1, keenEyes: 1, swiftFeet: 1, bigBaskets: 1, roomyHouses: 1 };
    let quarrying = 0;
    for (let k = 0; k < 2000; k++) {
      dealCards(s);
      if (s.cards.includes('quarrying')) quarrying++;
    }
    expect(quarrying / 2000).toBeCloseTo(0.5, 1);
  });
});

describe('skill effects', () => {
  it('modify stats and costs', () => {
    const w = smallWorld();
    const s = w.state;
    const base = getStats(s);
    s.skills = { sharpAxes: 2, bigBaskets: 1, swiftFeet: 1, powerSwing: 1, roomyHouses: 1, recruiters: 1, masterBuilders: 1 };
    const st = getStats(s);
    expect(st.chopRate).toBeCloseTo(base.chopRate * 2);
    expect(st.carry).toBe(base.carry + 5);
    expect(st.speed).toBeCloseTo(base.speed * 1.25);
    expect(st.manualChop).toBe(5);
    expect(villagerCost(s).wood).toBe(8); // round(10 × 0.75)
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

import { describe, expect, it } from 'vitest';
import { addBuilding, atLimit } from '../src/core/buildings';
import { claimContract, hireVillager, placeBuilding, takeDeal } from '../src/core/commands';
import { commission, gain } from '../src/core/economy';
import { fillContracts, sameAsk } from '../src/core/guild';
import { linkedBuildings, roadStock } from '../src/core/roads';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import { walk } from '../src/core/systems/movement';
import type { Building } from '../src/core/types';
import { onBuildingsChanged, type World } from '../src/core/world';
import { clearArea, freeRoads, smallWorld } from './helpers';

const SEASON = 180;

/** A Market and a Trading Post just east of the Town Center, both touching it. */
function withMarket(w: World): { market: Building; post: Building } {
  const { x, y } = w.state.origin;
  clearArea(w, x + 6, y, x + 8, y + 5);
  const market = addBuilding(w.state, 'market', x + 5, y + 1);
  const post = addBuilding(w.state, 'tradingPost', x + 5, y + 4);
  onBuildingsChanged(w);
  return { market, post };
}

/** A straight road of `n` tiles east from the clearing's corner, with a villager on its first tile heading along it. */
function onRoad(n: number) {
  const w = smallWorld(20, 1);
  const s = w.state;
  const a = s.origin.y * s.w + s.origin.x;
  const path = Array.from({ length: n }, (_, k) => a + k);
  freeRoads(w, path);
  const v = s.villagers[0];
  Object.assign(v, { x: s.origin.x + 0.5, y: s.origin.y + 0.5, path, pathI: 0 });
  return { w, v };
}

describe('settlement and trade skills', () => {
  it('apply Errand Runners, Well Fed and Surveyors', () => {
    const { w, v } = onRoad(3);
    walk(w, v, 0.5, 1, { roadWalk: 1, emptyWalk: 1.5, toll: 0 });
    expect(v.x - (w.state.origin.x + 0.5)).toBeCloseTo(0.75);
    v.carry = 1; // loaded: normal speed
    const x = v.x;
    walk(w, v, 0.5, 1, { roadWalk: 1, emptyWalk: 1.5, toll: 0 });
    expect(v.x - x).toBeCloseTo(0.5);

    const s = smallWorld(20, 3).state;
    s.skills = { errandRunners: 2 };
    expect(getStats(s).emptyWalk).toBe(1.5);
    const base = getStats(s);
    s.skills = { wellFed: 1 };
    s.resources.food = 10 * s.villagers.length - 1;
    expect(getStats(s).wellFed).toBe(false);
    s.resources.food += 1;
    expect(getStats(s).wellFed).toBe(true);
    expect(getStats(s).chopRate).toBeCloseTo(base.chopRate * 1.2);
    expect(getStats(s).farmRate).toBeCloseTo(base.farmRate * 1.2);

    const { x: ox, y: oy } = s.origin;
    addBuilding(s, 'house', ox, oy);
    addBuilding(s, 'house', ox + 5, oy);
    const roads = roadStock(s);
    s.skills = { surveyors: 2 };
    expect(roadStock(s)).toBe(roads + 2 * 2 * 1);
  });

  it('the Outpost takes deliveries, roots its own roads, hires villagers, and only one may stand', () => {
    const w = smallWorld(30, 2, 4);
    const s = w.state;
    s.nextRelicAt = Infinity;
    const { x, y } = s.origin;
    clearArea(w, x - 8, y, x - 1, y + 5);
    Object.assign(s.resources, { wood: 1e6, stone: 1e6, gold: 1e6 });
    s.skills = { frontierOutpost: 1, quarrying: 1 };
    expect(placeBuilding(w, 'outpost', x - 8, y)).toBe(true);
    expect(placeBuilding(w, 'quarry', x - 4, y + 4)).toBe(true);
    const outpost = s.buildings.find((b) => b.kind === 'outpost')!;
    const quarry = s.buildings.find((b) => b.kind === 'quarry')!;
    expect(linkedBuildings(s).has(quarry.id)).toBe(false);
    freeRoads(w, [x - 7, x - 6, x - 5, x - 4].map((rx) => (y + 3) * s.w + rx)); // from the Outpost's edge to the Quarry's
    expect(linkedBuildings(s).has(quarry.id)).toBe(true);

    simulate(w, 120, 1 / 30);
    expect(outpost.tally.stone).toBeGreaterThan(0); // miners drop off at the nearer hub

    expect(hireVillager(w, 'wood', quarry.id)).toBe(false); // only hubs hire
    expect(hireVillager(w, 'wood', outpost.id)).toBe(true);
    const v = s.villagers.at(-1)!;
    expect([v.x, v.y]).toEqual([outpost.x + 1.5, outpost.y + 1.5]);

    expect(atLimit(s, 'outpost')).toBe(true);
    clearArea(w, x - 8, y + 6, x - 6, y + 8);
    expect(placeBuilding(w, 'outpost', x - 8, y + 6)).toBe(false);
  });

  it('Toll Roads pay per road tile walked; the Midsummer Fair waives commission and raises trade pay in summer', () => {
    const { w, v } = onRoad(3);
    walk(w, v, 10, 1, { roadWalk: 1, emptyWalk: 1, toll: 0.2 });
    expect(w.gathered.bonus.gold).toBeCloseTo(0.4); // two tiles of road

    const t = smallWorld(30);
    const s = t.state;
    const { post } = withMarket(t);
    s.skills = { midsummerFair: 1 };
    const spring = { fee: commission(s), load: getStats(s).tradeLoads.get(post.id)! };
    expect(spring.fee).toBeGreaterThan(0);
    s.time = SEASON + 1;
    expect(commission(s)).toBe(0);
    expect(getStats(s).tradeLoads.get(post.id)).toBeCloseTo(spring.load * 1.5);
    s.time = 2 * SEASON + 1;
    expect(commission(s)).toBe(spring.fee);
  });

  it('Guild Contracts fill the board, pay at a connected Market and replace a claimed contract; v16 saves migrate', () => {
    const w = smallWorld(30, 2);
    const s = w.state;
    s.nextRelicAt = Infinity;
    s.skills = { guildContracts: 1 };
    simulate(w, 1, 1 / 30);
    expect(s.contracts).toHaveLength(3);
    for (const c of s.contracts) if (c.kind === 'gather') expect(c.res === 'wood' || s.totals[c.res] > 0).toBe(true);

    s.contracts[0] = { kind: 'gather', res: 'wood', need: 10, base: s.totals.wood, reward: 50 };
    gain(s, 'wood', 10);
    expect(claimContract(w, 0)).toBe(false); // no Market
    withMarket(w);
    const gold = s.resources.gold;
    expect(claimContract(w, 0)).toBe(true);
    expect(s.resources.gold).toBe(gold + 50);
    expect(s.contracts).toHaveLength(3);
    expect(s.contracts[0]).not.toEqual({ kind: 'gather', res: 'wood', need: 10, base: s.totals.wood - 10, reward: 50 });

    const old = JSON.parse(serialize(s, 1));
    old.version = 16;
    delete old.state.contracts;
    delete old.state.caravan;
    const { state } = deserialize(JSON.stringify(old));
    expect([state.contracts, state.caravan]).toEqual([[], null]);
  });

  it('the contract board never asks for the same thing twice, so one milestone pays once; v28 saves drop repeats', () => {
    const w = smallWorld(30, 2);
    const s = w.state;
    s.nextRelicAt = Infinity;
    s.skills = { guildContracts: 1 };
    withMarket(w);
    const repeats = () => s.contracts.some((c, k) => s.contracts.slice(0, k).some((d) => sameAsk(c, d)));
    for (let round = 0; round < 200; round++) {
      fillContracts(s);
      expect(repeats()).toBe(false);
      const k = round % 3;
      s.contracts[k] = { ...s.contracts[k], need: 0 }; // finished, so it can be claimed and replaced
      expect(claimContract(w, k)).toBe(true);
      expect(repeats()).toBe(false);
      expect(s.contracts.filter((d) => d.kind === 'grow').length).toBeLessThanOrEqual(1);
    }

    const grow = { kind: 'grow', need: 71, reward: 585 } as const;
    const wood = { kind: 'gather', res: 'wood', need: 50, base: 0, reward: 40 } as const;
    s.contracts = [grow, { ...grow }, wood, { ...wood, need: 60 }, { ...wood, res: 'food' }];
    const old = JSON.parse(serialize(s, 1));
    old.version = 28;
    expect(deserialize(JSON.stringify(old)).state.contracts).toEqual([grow, wood, { ...wood, res: 'food' }]);
  });

  it('the Merchant Caravan comes as winter begins, trades one deal, and leaves at spring, at any step size', () => {
    const visit = (step: number) => {
      const w = smallWorld(30, 2, 4);
      const s = w.state;
      s.nextRelicAt = Infinity;
      s.skills = { merchantCaravans: 1 };
      s.time = 3 * SEASON - 10;
      simulate(w, 20, step);
      expect(s.caravan).toHaveLength(3);
      expect(w.fx.some((f) => f.kind === 'caravan')).toBe(true);
      const deals = JSON.stringify(s.caravan);
      simulate(w, SEASON, step);
      expect(s.caravan).toBeNull();
      return deals;
    };
    expect(visit(1)).toBe(visit(1 / 30));

    const w = smallWorld(30, 2, 4);
    const s = w.state;
    s.skills = { merchantCaravans: 1 };
    s.time = 3 * SEASON - 1;
    simulate(w, 2, 1);
    withMarket(w);
    Object.assign(s.resources, { wood: 1e9, food: 1e9, stone: 1e9, cloth: 1e9, gold: 1e9 });
    const [deal] = s.caravan!;
    const before = { ...s.resources };
    expect(takeDeal(w, 0)).toBe(true);
    for (const [r, n] of Object.entries(deal.give)) expect(before[r as keyof typeof before] - s.resources[r as keyof typeof before]).toBe(n);
    expect(s.caravan).toBeNull();
    expect(takeDeal(w, 0)).toBe(false);
  });
});

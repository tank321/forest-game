import { describe, expect, it } from 'vitest';
import { addBuilding, footprint } from '../src/core/buildings';
import { buyResource, removeBuilding, sellResource } from '../src/core/commands';
import { buildingCost, marketQuote } from '../src/core/economy';
import { tileAt } from '../src/core/grid';
import { deserialize, serialize } from '../src/core/save';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import { Tile } from '../src/core/types';
import type { World } from '../src/core/world';
import { clearArea, freeRoads, pave, smallWorld } from './helpers';

/**
 * 30×30 world: the Town Center is at (13, 13), so a Market at (13, 11) touches its north side.
 * With `post`, a Trading Post at (2, 13) sits a gap of 10 tiles west of the Market.
 */
function withMarket(villagers = 0, post = false, seed = 1): { w: World; marketId: number; postId: number } {
  const w = smallWorld(30, villagers, seed);
  const s = w.state;
  s.nextRelicAt = Infinity;
  clearArea(w, 13, 11, 14, 11);
  const marketId = addBuilding(s, 'market', 13, 11).id;
  let postId = -1;
  if (post) {
    clearArea(w, 2, 13, 11, 14);
    postId = addBuilding(s, 'tradingPost', 2, 13).id;
  }
  pave(w);
  return { w, marketId, postId };
}

describe('market', () => {
  it('quotes value minus commission for sales and plus commission for purchases, rounded in its favor', () => {
    const s = smallWorld().state;
    expect(marketQuote(s, 'wood', 100, 'sell')).toBe(80);
    expect(marketQuote(s, 'wood', 100, 'buy')).toBe(120);
    expect(marketQuote(s, 'food', 20, 'sell')).toBe(80);
    expect(marketQuote(s, 'wood', 3, 'sell')).toBe(2);
    expect(marketQuote(s, 'wood', 3, 'buy')).toBe(4);
    s.skills = { shrewdTraders: 2 };
    expect(marketQuote(s, 'wood', 100, 'sell')).toBe(90);
    expect(marketQuote(s, 'wood', 100, 'buy')).toBe(110);
  });

  it('needs a Market', () => {
    const w = smallWorld();
    w.state.resources.wood = 100;
    expect(sellResource(w, 'wood', 100)).toBe(false);
    expect(w.state.resources.wood).toBe(100);
  });

  it('exchanges goods and gold without counting as production', () => {
    const { w } = withMarket();
    const s = w.state;
    s.resources.wood = 100;
    expect(sellResource(w, 'wood', 100)).toBe(true);
    expect(s.resources.wood).toBe(0);
    expect(s.resources.gold).toBe(80);
    expect(buyResource(w, 'stone', 1)).toBe(true);
    expect(s.resources.stone).toBe(1);
    expect(s.resources.gold).toBe(56);
    expect(s.totals.gold).toBe(0);
    expect(s.totals.stone).toBe(0);
  });

  it('refuses short stock, short gold and bad amounts', () => {
    const { w } = withMarket();
    const s = w.state;
    s.resources.wood = 50;
    s.resources.gold = 10;
    expect(sellResource(w, 'wood', 51)).toBe(false);
    expect(buyResource(w, 'stone', 1)).toBe(false);
    expect(sellResource(w, 'wood', 0)).toBe(false);
    expect(sellResource(w, 'wood', -5)).toBe(false);
    expect(sellResource(w, 'wood', 1.5)).toBe(false);
    expect(s.resources).toMatchObject({ wood: 50, gold: 10, stone: 0 });
  });
});

describe('tax collectors', () => {
  /** A Tax Office east of the Town Center over a road along its south side, with three houses below the road. */
  function town(villagers = 1) {
    const w = smallWorld(30, villagers);
    const s = w.state;
    s.nextRelicAt = Infinity;
    clearArea(w, 12, 11, 24, 19);
    const office = addBuilding(s, 'taxOffice', 17, 15);
    const houses = [14, 19, 22].map((x) => addBuilding(s, 'house', x, 18));
    freeRoads(w, Array.from({ length: 10 }, (_, k) => 17 * s.w + 13 + k));
    return { w, s, office, houses };
  }
  const collectors = (w: World) => w.state.villagers.filter((v) => v.job === 'tax');

  it('walk only the roads, house to house, and the gold counts once back at the office', () => {
    const { w, s, office, houses } = town();
    const paved = new Set([...footprint(s, office), ...houses.map((h) => h.y * s.w + h.x)]);
    for (let k = 0; k < 30 * 120; k++) {
      const gold = s.resources.gold;
      simulate(w, 1 / 30, 1 / 30);
      const [v] = collectors(w);
      if (v.state === 'toWork' || v.carry > 0) {
        const i = tileAt(s, v.x, v.y);
        expect(s.tiles[i] === Tile.Road || paved.has(i)).toBe(true);
      }
      if (v.carry > 0) expect(s.resources.gold).toBe(gold);
    }
    expect(s.resources.gold).toBeGreaterThan(0);
    expect(office.tally.gold).toBeCloseTo(s.totals.gold, 9);
  });

  it('visit more houses per round with the Satchel, and Deputies send a second collector', () => {
    const most = (satchel: number) => {
      const { w, s } = town();
      s.upgrades.satchel = satchel;
      let n = 0;
      for (let k = 0; k < 30 * 60; k++) {
        simulate(w, 1 / 30, 1 / 30);
        n = Math.max(n, collectors(w)[0].round?.length ?? 0);
      }
      return n;
    };
    expect(most(0)).toBe(1);
    expect(most(3)).toBe(3); // five per round, but there are only three houses
    const { w, s } = town(2);
    s.skills.deputies = 1;
    simulate(w, 1, 1 / 30);
    expect(collectors(w)).toHaveLength(2);
  });

  it('let houses hold only so much, and collect the same at any step size', () => {
    const run = (step: number) => {
      const { w, s, office } = town();
      s.paused = [office.id];
      simulate(w, 200, step);
      expect(s.buildings.filter((b) => b.kind === 'house').map((h) => h.due)).toEqual(Array(3).fill(getStats(s).taxHold));
      s.paused = [];
      simulate(w, 600, step);
      return s.resources.gold;
    };
    const a = run(1 / 30);
    expect(a).toBeGreaterThan(36);
    expect(Math.abs(run(1) - a)).toBeLessThan(1);
  });

  it('migrate a v18 save with the Satchel at level 0', () => {
    const old = JSON.parse(serialize(smallWorld().state, 1));
    old.version = 18;
    delete old.state.upgrades.satchel;
    expect(deserialize(JSON.stringify(old)).state.upgrades.satchel).toBe(0);
  });
});

describe('trade', () => {
  it('a Trading Post takes no villager; without a Market its mule waits at home', () => {
    const w = smallWorld(30, 1);
    w.state.nextRelicAt = Infinity;
    clearArea(w, 2, 13, 11, 14);
    addBuilding(w.state, 'tradingPost', 2, 13);
    pave(w);
    simulate(w, 30, 1 / 30);
    expect(w.state.villagers.map((v) => v.job)).toEqual(['lumber']);
    expect(w.state.mules).toMatchObject([{ state: 'idle', carry: 0 }]);
    expect(w.state.resources.gold).toBe(0);
  });

  it('its pack mule carries gold along the roads from the Trading Post to the Market', () => {
    const { w, postId, marketId } = withMarket(0, true);
    const s = w.state;
    expect(getStats(s).tradeLoads.get(postId)).toBeCloseTo(10, 9);
    const paved = new Set([marketId, postId, s.buildings[0].id].flatMap((id) => footprint(s, s.buildings.find((b) => b.id === id)!)));
    for (let k = 0; k < 300 * 30; k++) {
      simulate(w, 1 / 30, 1 / 30);
      const [m] = s.mules;
      const i = tileAt(s, m.x, m.y);
      expect(s.tiles[i] === Tile.Road || paved.has(i)).toBe(true);
    }
    expect(s.resources.gold).toBeGreaterThan(0);
    expect(s.resources.gold / 10).toBeCloseTo(Math.round(s.resources.gold / 10), 6); // whole trips
    expect(s.totals.gold).toBe(s.resources.gold);
  });

  it('pays more than linearly with the gap between the buildings', () => {
    const s = smallWorld(60).state;
    addBuilding(s, 'market', 26, 28); // touches the TC's west side
    const near = addBuilding(s, 'tradingPost', 15, 28).id; // gap 10
    const far = addBuilding(s, 'tradingPost', 5, 28).id; // gap 20
    const loads = getStats(s).tradeLoads;
    expect(loads.get(far)! / loads.get(near)!).toBeCloseTo(2 ** 1.5, 9);
    s.skills = { packMules: 2 };
    expect(getStats(s).tradeLoads.get(near)).toBeCloseTo(15, 9);
  });

  it('is independent of step size', () => {
    const a = withMarket(0, true, 3).w;
    const b = withMarket(0, true, 3).w;
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(a.state.resources.gold).toBeGreaterThan(0);
    expect(b.state.resources.gold).toBeCloseTo(a.state.resources.gold, 3);
  });

  it('removing the Trading Post mid-trip loses no gold; the mule delivers, then leaves', () => {
    const { w, postId } = withMarket(0, true);
    const s = w.state;
    for (let t = 0; t < 300 && !(s.mules[0]?.state === 'toMarket' && s.mules[0].carry > 0); t++) simulate(w, 1, 1 / 30);
    const total = s.resources.gold + s.mules[0].carry;
    expect(s.mules[0].carry).toBeGreaterThan(0);
    expect(removeBuilding(w, postId)).toBe(true);
    simulate(w, 60, 1 / 30);
    expect(s.mules).toHaveLength(0);
    expect(s.resources.gold).toBeCloseTo(total, 6);
  });

  it('migrates a v19 save: traders go back to lumberjacking and their gold is banked', () => {
    const w = smallWorld(30, 1);
    const old = JSON.parse(serialize(w.state, 1));
    old.version = 19;
    delete old.state.mules;
    Object.assign(old.state.villagers[0], { job: 'trade', workplace: 99, state: 'toHome', carry: 7 });
    const { state } = deserialize(JSON.stringify(old));
    expect(state.villagers[0]).toMatchObject({ job: 'lumber', workplace: -1, state: 'idle', carry: 0 });
    expect(state.mules).toEqual([]);
    expect(state.resources.gold).toBe(7);
  });
});

it('houses cost gold from the 13th', () => {
  const s = smallWorld().state;
  expect(buildingCost(s, 'house', 11).gold).toBeUndefined();
  expect(buildingCost(s, 'house', 12).gold).toBe(200);
});

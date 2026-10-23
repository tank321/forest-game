import { describe, expect, it } from 'vitest';
import { addBuilding } from '../src/core/buildings';
import { buyResource, removeBuilding, sellResource } from '../src/core/commands';
import { buildingCost, marketQuote } from '../src/core/economy';
import { simulate } from '../src/core/sim';
import { getStats } from '../src/core/stats';
import { onBuildingsChanged, type World } from '../src/core/world';
import { clearArea, smallWorld } from './helpers';

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
  onBuildingsChanged(w);
  return { w, marketId, postId };
}

const traders = (w: World) => w.state.villagers.filter((v) => v.job === 'trade');

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

describe('tax', () => {
  it('is paid once by each house within reach of any Tax Office', () => {
    const w = smallWorld(30);
    const s = w.state;
    addBuilding(s, 'taxOffice', 13, 11);
    const near = addBuilding(s, 'house', 12, 12).id;
    addBuilding(s, 'house', 2, 2); // far outside the radius
    expect([...getStats(s).taxedHouses]).toEqual([near]);
    expect(getStats(s).tax).toBeCloseTo(0.2, 9);
    addBuilding(s, 'taxOffice', 15, 11);
    expect(getStats(s).taxedHouses.size).toBe(1);
    s.skills = { taxCollectors: 2 };
    expect(getStats(s).tax).toBeCloseTo(0.28, 9);
  });

  it('accrues as gathered gold, independent of step size', () => {
    const make = () => {
      const w = smallWorld(30);
      addBuilding(w.state, 'taxOffice', 13, 11);
      for (const [x, y] of [[12, 13], [12, 14], [17, 13]]) addBuilding(w.state, 'house', x, y); // gaps 1, 2, 3
      return w;
    };
    const a = make();
    const b = make();
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(a.state.resources.gold).toBeCloseTo(600 * 3 * 0.2, 6);
    expect(b.state.resources.gold).toBeCloseTo(a.state.resources.gold, 6);
    expect(a.state.totals.gold).toBeCloseTo(a.state.resources.gold, 9);
  });
});

describe('trade', () => {
  it('a Trading Post without a Market takes no trader', () => {
    const w = smallWorld(30, 1);
    w.state.nextRelicAt = Infinity;
    clearArea(w, 2, 13, 11, 14);
    addBuilding(w.state, 'tradingPost', 2, 13);
    simulate(w, 30, 1 / 30);
    expect(traders(w)).toHaveLength(0);
  });

  it('a trader carries gold from the Trading Post to the Market', () => {
    const { w, postId } = withMarket(1, true);
    const s = w.state;
    expect(getStats(s).tradeLoads.get(postId)).toBeCloseTo(10, 9);
    simulate(w, 300, 1 / 30);
    expect(traders(w)).toHaveLength(1);
    expect(s.resources.gold).toBeGreaterThan(0);
    expect(s.resources.gold / 10).toBeCloseTo(Math.round(s.resources.gold / 10), 6); // whole trips
    expect(s.totals.gold).toBe(s.resources.gold);
  });

  it('pays more than linearly with the gap between the buildings', () => {
    const s = smallWorld(60).state;
    addBuilding(s, 'market', 0, 0);
    const near = addBuilding(s, 'tradingPost', 11, 0).id; // gap 10
    const far = addBuilding(s, 'tradingPost', 21, 0).id; // gap 20
    const loads = getStats(s).tradeLoads;
    expect(loads.get(far)! / loads.get(near)!).toBeCloseTo(2 ** 1.5, 9);
    s.skills = { packMules: 2 };
    expect(getStats(s).tradeLoads.get(near)).toBeCloseTo(15, 9);
  });

  it('is independent of step size', () => {
    const a = withMarket(1, true, 3).w;
    const b = withMarket(1, true, 3).w;
    simulate(a, 600, 1 / 30);
    simulate(b, 600, 1);
    expect(a.state.resources.gold).toBeGreaterThan(0);
    expect(b.state.resources.gold).toBeCloseTo(a.state.resources.gold, 3);
  });

  it('removing the Market mid-trip loses no gold and returns the trader to lumber', () => {
    const { w, marketId } = withMarket(1, true);
    const s = w.state;
    for (let t = 0; t < 300 && !(traders(w)[0]?.state === 'toHome' && traders(w)[0].carry > 0); t++) simulate(w, 1, 1 / 30);
    const [trader] = traders(w);
    expect(trader.carry).toBeGreaterThan(0);
    const total = s.resources.gold + trader.carry;
    expect(removeBuilding(w, marketId)).toBe(true);
    simulate(w, 60, 1 / 30);
    expect(traders(w)).toHaveLength(0);
    expect(s.resources.gold).toBeCloseTo(total, 6);
  });
});

it('houses cost gold from the 13th', () => {
  const s = smallWorld().state;
  expect(buildingCost(s, 'house', 11).gold).toBeUndefined();
  expect(buildingCost(s, 'house', 12).gold).toBe(200);
});

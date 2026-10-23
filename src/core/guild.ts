import { CONFIG } from '../config';
import { villagerCost, TRADE_RESOURCES, type TradeResource } from './economy';
import { rand } from './rng';
import { ringWood } from './trees';
import type { Contract, Deal, GameState } from './types';

/** Lifetime average gathering rate of `res` per second, from at least a minute of play. */
const rate = (s: GameState, res: TradeResource) => s.totals[res] / Math.max(s.time, 60);

const pick = <T>(s: GameState, xs: readonly T[]): T => xs[Math.floor(rand(s) * xs.length)];

/** Trade resources the town has gathered so far (wood always counts). */
const produced = (s: GameState) => TRADE_RESOURCES.filter((r) => r === 'wood' || s.totals[r] > 0);

/** How far along a contract is, from 0 to its `need`. */
export function contractProgress(s: GameState, c: Contract): number {
  const done = c.kind === 'gather' ? s.totals[c.res] - c.base : c.kind === 'fell' ? s.treesChopped - c.base : s.villagers.length;
  return Math.max(0, Math.min(c.need, done));
}

export const contractDone = (s: GameState, c: Contract) => contractProgress(s, c) >= c.need;

/**
 * A new contract, sized to a few minutes of the town's lifetime average rate and paid the market value of
 * what it asks for: the goods themselves, the wood in the trees, or the wood price of the hires.
 */
export function newContract(s: GameState): Contract {
  const k = CONFIG.skills.contracts;
  const [lo, hi] = k.minutes;
  const seconds = 60 * (lo + Math.floor(rand(s) * (hi - lo + 1)));
  const kind = pick(s, ['gather', 'gather', 'fell', 'grow'] as const);
  if (kind === 'gather') {
    const res = pick(s, produced(s));
    const need = Math.max(k.min.gather, Math.round(rate(s, res) * seconds));
    return { kind, res, need, base: s.totals[res], reward: Math.round(need * CONFIG.market.prices[res] * k.rewardMult) };
  }
  if (kind === 'fell') {
    const need = Math.max(k.min.fell, Math.round((s.treesChopped / Math.max(s.time, 60)) * seconds));
    const perTree = s.treesChopped ? s.totals.wood / s.treesChopped : ringWood(1);
    return { kind, need, base: s.treesChopped, reward: Math.round(need * perTree * CONFIG.market.prices.wood * k.rewardMult) };
  }
  const more = k.min.grow + Math.floor(rand(s) * 3);
  return { kind, need: s.villagers.length + more, reward: Math.round(more * (villagerCost(s, 'wood').wood ?? 0) * k.rewardMult) };
}

/** Tops the board up to `CONFIG.skills.contracts.board` contracts. */
export function fillContracts(s: GameState): void {
  while (s.contracts.length < CONFIG.skills.contracts.board) s.contracts.push(newContract(s));
}

/** The Merchant Caravan's deals: buy a resource cheap or sell one dear, sized to minutes of the town's average rate. */
export function rollDeals(s: GameState): Deal[] {
  const k = CONFIG.skills.caravan;
  return Array.from({ length: k.deals }, () => {
    const res = pick(s, produced(s));
    const n = Math.max(k.min, Math.round(rate(s, res) * k.seconds));
    const value = n * CONFIG.market.prices[res];
    return rand(s) < 0.5
      ? { give: { gold: Math.ceil(value * k.buyMult) }, get: { [res]: n } }
      : { give: { [res]: n }, get: { gold: Math.floor(value * k.sellMult) } };
  });
}

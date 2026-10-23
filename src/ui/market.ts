import { CONFIG } from '../config';
import { buyResource, sellResource } from '../core/commands';
import { marketQuote, TRADE_RESOURCES, type TradeResource } from '../core/economy';
import type { World } from '../core/world';
import type { UiState } from './state';
import { fmt, icon } from './text';

/** Quick-trade amounts, in units of the selected resource. */
const LOTS = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7] as const;
const LOT_LABEL = ['1', '10', '100', '1K', '10K', '100K', '1M', '10M'];
const NAME: Record<TradeResource, string> = { wood: 'Wood', food: 'Food', stone: 'Stone', cloth: 'Cloth' };

type Side = 'sell' | 'buy';

/**
 * Market trading panel: pick a resource, then sell or buy a quick lot or a typed amount.
 * Built once and updated in place every frame, so the amount field keeps focus and its text.
 */
export class MarketView {
  readonly el = document.createElement('div');
  private tiles: HTMLButtonElement[];
  private lots: Record<Side, HTMLButtonElement[]>;
  private input: HTMLInputElement;
  private custom: Record<Side, HTMLButtonElement>;
  private note: HTMLElement;
  private cache = new Map<Element, string>();

  constructor(
    private world: () => World,
    private ui: UiState,
  ) {
    const lotRow = (side: Side) =>
      LOT_LABEL.map((l) => `<button class="market-lot" data-side="${side}"><b>${l}</b><small></small></button>`).join('');
    this.el.className = 'market';
    this.el.innerHTML = `
      <h3 class="market-label" id="marketRes">Resource</h3>
      <div class="market-tiles" role="radiogroup" aria-labelledby="marketRes">${TRADE_RESOURCES.map((r) =>
        `<button class="market-tile" role="radio" title="${NAME[r]}">${icon(r)}<small></small></button>`).join('')}</div>
      <p class="market-rate"></p>
      <h3 class="market-label sell-label"></h3>
      <div class="market-grid">${lotRow('sell')}</div>
      <h3 class="market-label buy-label"></h3>
      <div class="market-grid">${lotRow('buy')}</div>
      <h3 class="market-label"><label for="marketAmount">Custom amount</label></h3>
      <div class="market-custom">
        <input id="marketAmount" class="frame dark" type="number" inputmode="numeric" min="1" step="1" placeholder="Amount" />
        <button class="market-max">Max</button>
      </div>
      <div class="market-confirm">
        <button class="gold" data-side="sell"></button>
        <button data-side="buy"></button>
      </div>
      <p class="market-note" role="status" aria-live="polite"></p>`;
    const all = <T extends Element>(sel: string) => [...this.el.querySelectorAll<T>(sel)];
    this.tiles = all<HTMLButtonElement>('.market-tile');
    this.lots = { sell: all<HTMLButtonElement>('.market-lot[data-side=sell]'), buy: all<HTMLButtonElement>('.market-lot[data-side=buy]') };
    this.input = this.el.querySelector('input')!;
    const [sell, buy] = all<HTMLButtonElement>('.market-confirm button');
    this.custom = { sell, buy };
    this.note = this.el.querySelector('.market-note')!;

    this.tiles.forEach((b, i) => (b.onclick = () => (ui.marketRes = TRADE_RESOURCES[i])));
    for (const side of ['sell', 'buy'] as const) {
      this.lots[side].forEach((b, i) => (b.onclick = () => this.trade(side, LOTS[i])));
      this.custom[side].onclick = () => this.trade(side, this.amount());
    }
    this.el.querySelector<HTMLButtonElement>('.market-max')!.onclick = () => {
      this.input.value = String(Math.floor(this.world().state.resources[this.ui.marketRes]));
    };
  }

  update(): void {
    const s = this.world().state;
    const res = this.ui.marketRes;
    const have = s.resources;
    const quote = (n: number, side: Side) => marketQuote(s, res, n, side);
    this.tiles.forEach((b, i) => {
      const r = TRADE_RESOURCES[i];
      b.classList.toggle('active', r === res);
      b.setAttribute('aria-checked', String(r === res));
      this.set(b.querySelector('small')!, fmt(have[r]));
    });
    const unit = CONFIG.market.lots[res];
    this.html(this.el.querySelector('.market-rate')!,
      `<span>${fmt(unit)} ${icon(res)} → ${fmt(quote(unit, 'sell'))} ${icon('gold')}</span>` +
      `<span>${fmt(quote(unit, 'buy'))} ${icon('gold')} → ${fmt(unit)} ${icon(res)}</span>`);
    this.set(this.el.querySelector('.sell-label')!, `Sell ${NAME[res].toLowerCase()} → gold`);
    this.set(this.el.querySelector('.buy-label')!, `Gold → buy ${NAME[res].toLowerCase()}`);
    LOTS.forEach((n, i) => {
      const gain = quote(n, 'sell');
      const price = quote(n, 'buy');
      this.lot(this.lots.sell[i], `+${fmt(gain)}`, have[res] >= n && gain > 0, `Sell ${fmt(n)} ${res} for ${fmt(gain)} gold`);
      this.lot(this.lots.buy[i], `−${fmt(price)}`, have.gold >= price, `Buy ${fmt(n)} ${res} for ${fmt(price)} gold`);
    });
    const n = this.amount();
    const gain = n ? quote(n, 'sell') : 0;
    const price = n ? quote(n, 'buy') : 0;
    this.html(this.custom.sell, n ? `Sell for ${icon('gold')}${fmt(gain)}` : 'Sell');
    this.html(this.custom.buy, n ? `Buy for ${icon('gold')}${fmt(price)}` : 'Buy');
    this.custom.sell.disabled = !n || have[res] < n || gain <= 0;
    this.custom.buy.disabled = !n || have.gold < price;
  }

  /** The typed amount as a whole number of units, or 0 if blank or invalid. */
  private amount(): number {
    const n = Math.floor(Number(this.input.value));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private trade(side: Side, n: number): void {
    const w = this.world();
    const res = this.ui.marketRes;
    const gold = marketQuote(w.state, res, n, side);
    const ok = side === 'sell' ? sellResource(w, res, n) : buyResource(w, res, n);
    if (ok) this.note.textContent = side === 'sell' ? `Sold ${fmt(n)} ${res} for ${fmt(gold)} gold.` : `Bought ${fmt(n)} ${res} for ${fmt(gold)} gold.`;
  }

  private lot(b: HTMLButtonElement, small: string, enabled: boolean, title: string): void {
    this.html(b.querySelector('small')!, `${small}${icon('gold')}`);
    b.disabled = !enabled;
    if (b.title !== title) b.title = title;
  }

  private set(el: Element, text: string): void {
    if (this.cache.get(el) === text) return;
    this.cache.set(el, text);
    el.textContent = text;
  }

  private html(el: Element, html: string): void {
    if (this.cache.get(el) === html) return;
    this.cache.set(el, html);
    el.innerHTML = html;
  }
}

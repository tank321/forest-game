import { popCap } from '../core/economy';
import { CONFIG } from '../config';
import { SEASONS, seasonLeft } from '../core/seasons';
import { getStats, type Stats } from '../core/stats';
import { RESOURCES, type Resources } from '../core/types';
import type { World } from '../core/world';
import { seasonEffects, seasonName } from './seasonInfo';
import type { UiState } from './state';
import { duration, fmt, icon } from './text';

const $ = (id: string) => document.getElementById(id)!;
const RATE_WINDOW = 60; // sim seconds
const SHORTAGE_HOLD = 10; // sim seconds a shortage stays shown, so deliveries don't make it flicker

/** Top bar. Reads state every frame, writes the DOM only on change. */
export class Hud {
  private res = RESOURCES.map((r) => {
    const span = document.createElement('span');
    span.title = `${r[0].toUpperCase()}${r.slice(1)}`;
    span.innerHTML = `${icon(r)}<b>0</b><small></small>`;
    return { r, amount: span.querySelector('b')!, rate: span.querySelector('small')!, span };
  });
  private els = {
    pop: $('pop'),
    land: $('land'),
    trees: $('trees'),
    relic: $('relic'),
    msg: $('msg'),
    season: $('season'),
  };
  private shortage = $('shortage');
  private seasonChip = $('seasonChip');
  private seasonBar = $('seasonBar');
  private seasonInfo = $('seasonInfo');
  private seasonHtml = '';
  private seasonHover = false; // mouse over the chip
  private seasonPinned = false; // opened by a click, tap or key; closed by another or a click elsewhere
  private lastShort = { hungry: -Infinity, cold: -Infinity }; // sim time each was last seen
  private find = $('findRelic') as HTMLButtonElement;
  private tools = [...document.querySelectorAll<HTMLButtonElement>('[data-tool]')];
  private cache = new Map<HTMLElement, string>();
  private msgUntil = 0;
  private samples: [number, Resources][] = []; // [sim time, lifetime totals]

  constructor(
    private world: () => World,
    private ui: UiState,
    onFindRelic: () => void,
  ) {
    $('hud').querySelector('.stats')!.prepend(...this.res.map((e) => e.span));
    for (const b of this.tools) b.onclick = () => (ui.tool = b.dataset.tool as UiState['tool']);
    this.find.onclick = onFindRelic;
    const chip = this.seasonChip;
    chip.onpointerenter = (e) => e.pointerType === 'mouse' && (this.seasonHover = true);
    chip.onpointerleave = (e) => e.pointerType === 'mouse' && (this.seasonHover = false);
    chip.onclick = () => (this.seasonPinned = !this.seasonPinned);
    chip.onkeydown = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      this.seasonPinned = !this.seasonPinned;
    };
    document.addEventListener('pointerdown', (e) => {
      const t = e.target as Node;
      if (!chip.contains(t) && !this.seasonInfo.contains(t)) this.seasonPinned = false;
    });
    addEventListener('keydown', (e) => e.key === 'Escape' && (this.seasonPinned = false));
  }

  message(text: string, ms = 4000): void {
    this.set(this.els.msg, text);
    this.msgUntil = performance.now() + ms;
  }

  update(): void {
    const s = this.world().state;
    const rate = this.perMinute();
    const st = getStats(s);
    for (const { r, amount, rate: el } of this.res) {
      const net = rate[r] - 60 * (r === 'food' ? st.eat : r === 'wood' ? st.burn : 0);
      this.set(amount, fmt(s.resources[r]));
      this.set(el, `${net < 0 ? '−' : '+'}${fmt(Math.abs(net))}/min`);
      el.classList.toggle('neg', net < 0);
    }
    this.set(this.els.season, seasonName(st.season));
    this.updateSeasonBar(st.season, s.time);
    this.updateSeasonInfo(st, s.time);
    this.updateShortage(s.time, st.hungry, st.cold);
    this.set(this.els.pop, `${s.villagers.length}/${popCap(s)}`);
    this.set(this.els.land, fmt(s.w * s.h - s.treesLeft - s.relics.length));
    this.set(this.els.trees, fmt(s.treesLeft));
    this.set(
      this.els.relic,
      s.relics.length ? `${s.relics.length} relic${s.relics.length > 1 ? 's' : ''} in the forest` : `Next relic: ${s.nextRelicAt - s.treesChopped} trees`,
    );
    this.find.hidden = !s.relics.length;
    for (const b of this.tools) b.classList.toggle('active', b.dataset.tool === this.ui.tool);
    if (s.treesLeft === 0) this.message(`Forest cleared in ${duration(s.time)}!`);
    else if (this.msgUntil && performance.now() > this.msgUntil) this.message('', 0);
  }

  /** How far the current season has run, colored by season. */
  private updateSeasonBar(season: number, time: number): void {
    const pct = (100 * (1 - seasonLeft(time) / CONFIG.seasons.length)).toFixed(1);
    if (this.cache.get(this.seasonBar) === pct) return;
    this.cache.set(this.seasonBar, pct);
    this.seasonBar.style.width = `${pct}%`;
    this.seasonBar.parentElement!.setAttribute('aria-valuenow', pct);
    this.seasonChip.dataset.season = SEASONS[season];
  }

  /** Current and next season's effects, under the season chip while hovered or pinned. */
  private updateSeasonInfo(st: Stats, time: number): void {
    const open = this.seasonHover || this.seasonPinned;
    const info = this.seasonInfo;
    info.hidden = !open;
    this.seasonChip.setAttribute('aria-expanded', String(open));
    if (!open) return;
    const next = (st.season + 1) % SEASONS.length;
    const list = (i: number) => `<ul>${seasonEffects(st, i).map((e) => `<li>${e}</li>`).join('')}</ul>`;
    const html =
      `<h3>Now: ${seasonName(st.season)} <small>${duration(seasonLeft(time))} left</small></h3>${list(st.season)}` +
      `<h3>Next: ${seasonName(next)}</h3>${list(next)}`;
    if (html !== this.seasonHtml) info.innerHTML = this.seasonHtml = html;
    // Under the chip, kept inside the HUD (the plaque scrolls sideways on narrow screens).
    const hud = info.offsetParent!.getBoundingClientRect();
    const chip = this.seasonChip.getBoundingClientRect();
    const left = Math.max(0, Math.min(chip.left - hud.left, hud.width - info.offsetWidth));
    info.style.left = `${left}px`;
  }

  private updateShortage(time: number, hungry: boolean, cold: boolean): void {
    const last = this.lastShort;
    if (time < last.hungry) last.hungry = -Infinity; // time went back: a new game
    if (time < last.cold) last.cold = -Infinity;
    if (hungry) last.hungry = time;
    if (cold) last.cold = time;
    const h = time - last.hungry < SHORTAGE_HOLD;
    const c = time - last.cold < SHORTAGE_HOLD;
    this.shortage.hidden = !h && !c;
    if (!h && !c) return;
    const [b, small] = this.shortage.children as unknown as [HTMLElement, HTMLElement];
    this.set(b, h && c ? 'Hungry & cold' : h ? 'Hungry' : 'Cold');
    this.set(small, h && c ? 'Most work ×0.5' : h ? 'Chop & mine ×0.5' : 'Farm, mine, herd, pick ×0.5');
    this.shortage.title = h ? 'Out of food: build farms.' + (c ? ' Out of firewood: chop wood.' : '') : 'Out of firewood: chop wood.';
  }

  /** Lifetime-totals slope over the last minute of simulated time (offline catch-up included). */
  private perMinute(): Resources {
    const s = this.world().state;
    const smp = this.samples;
    if (!smp.length || s.time - smp[smp.length - 1][0] >= 1) smp.push([s.time, { ...s.totals }]);
    while (smp.length > 2 && s.time - smp[0][0] > RATE_WINDOW) smp.shift();
    const [t0, r0] = smp[0];
    const dt = s.time - t0;
    return Object.fromEntries(
      RESOURCES.map((k) => [k, dt > 0 ? ((s.totals[k] - r0[k]) / dt) * 60 : 0]),
    ) as Resources;
  }

  private set(el: HTMLElement, text: string): void {
    if (this.cache.get(el) === text) return;
    this.cache.set(el, text);
    el.textContent = text;
  }
}

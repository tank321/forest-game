import { popCap } from '../core/economy';
import { CONFIG } from '../config';
import { SEASONS, seasonLeft } from '../core/seasons';
import { getStats, type Stats } from '../core/stats';
import { jobResource } from '../core/systems/workplace';
import { RESOURCES, type GameState, type ResourceKey, type Resources } from '../core/types';
import { SOURCES, type Source, type World } from '../core/world';
import { seasonEffects, seasonName } from './seasonInfo';
import { duration, fmt, icon } from './text';

const $ = (id: string) => document.getElementById(id)!;
const RATE_WINDOW = 60; // sim seconds
const RATE_REFRESH_MS = 1000; // rates are recomputed at most this often (wall clock), so they stay readable
const RATE_MIN = 5; // sim seconds of history needed before a rate is shown
const SHORTAGE_HOLD = 10; // sim seconds a shortage stays shown, so deliveries don't make it flicker

type Flows = Record<Source, Resources>;

const SOURCE_LABEL: Record<Source, string> = {
  lumber: 'Lumberjacks',
  farm: 'Farms',
  orchard: 'Orchards',
  mine: 'Quarries',
  herd: 'Sheep farms',
  cotton: 'Cotton plantations',
  trade: 'Trading posts',
  hand: 'Chopping by hand',
  tax: 'Tax',
  bonus: 'Skill bonuses',
};

/** Gathered per source so far, plus loads still being carried (under the carrier's job, a mule's under trade), so it grows as goods are gathered, not in lumps at delivery. */
function gathered(w: World): Flows {
  const out = Object.fromEntries(SOURCES.map((src) => [src, { ...w.gathered[src] }])) as Flows;
  for (const v of w.state.villagers) out[v.job][jobResource(v.job)] += v.carry;
  for (const m of w.state.mules) out.trade.gold += m.carry;
  return out;
}

/** Upkeep drawn from a resource, per minute. */
function sinks(r: ResourceKey, st: Stats): [string, number][] {
  if (r === 'food' && st.eat) return [['Villagers eat', 60 * st.eat]];
  if (r === 'wood' && st.burn) return [['Firewood', 60 * st.burn]];
  return [];
}

const signed = (n: number) => `${n < 0 ? '−' : '+'}${fmt(Math.abs(n))}`;
const perMin = (n: number) => `${signed(n)}/min`;

/** Top bar. Reads state every frame, writes the DOM only on change. */
export class Hud {
  private res = RESOURCES.map((r) => {
    const span = document.createElement('span');
    span.tabIndex = 0;
    span.setAttribute('role', 'button');
    span.setAttribute('aria-label', `${r[0].toUpperCase()}${r.slice(1)}: show sources and upkeep`);
    span.setAttribute('aria-controls', 'resourceInfo');
    // "/min" is its own span so phones can drop it (style.css).
    span.innerHTML = `${icon(r)}<b>0</b><small><span>…</span><span class="per" hidden>/min</span></small>`;
    const [rate, per] = span.querySelectorAll('small span') as unknown as [HTMLElement, HTMLElement];
    return { r, amount: span.querySelector('b')!, small: span.querySelector('small')!, rate, per, span };
  });
  private els = {
    pop: $('pop'),
    land: $('land'),
    relicCountdown: $('relicCountdown'),
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
  private cache = new Map<HTMLElement, string>();
  private msgUntil = 0;
  private samples: [number, Flows][] = []; // [sim time, gathered so far per source]
  private rateAt = -Infinity; // wall-clock time the shown rates were computed
  private flows: Flows | null = null; // per-minute rate per source, null until there is enough history
  private resourceInfo = $('resourceInfo');
  private resourceHtml = '';
  private resHover: ResourceKey | null = null; // resource under the mouse
  private resPinned: ResourceKey | null = null; // opened by a click, tap or key

  constructor(private world: () => World) {
    const stats = $('hud').querySelector<HTMLElement>('.stats')!;
    stats.prepend(...this.res.map((e) => e.span));
    // The plaque wraps onto more rows on a phone; the Lucky Chest and toasts sit below it (style.css).
    new ResizeObserver(() => $('map').style.setProperty('--hud-h', `${stats.offsetHeight}px`)).observe(stats);
    for (const { r, span } of this.res) {
      span.onpointerenter = (e) => e.pointerType === 'mouse' && (this.resHover = r);
      span.onpointerleave = (e) => e.pointerType === 'mouse' && this.resHover === r && (this.resHover = null);
      span.onclick = () => (this.resPinned = this.resPinned === r ? null : r);
      span.onkeydown = (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        this.resPinned = this.resPinned === r ? null : r;
      };
    }
    document.addEventListener('pointerdown', (e) => {
      const t = e.target as Node;
      if (!this.res.some(({ span }) => span.contains(t)) && !this.resourceInfo.contains(t)) this.resPinned = null;
    });
    addEventListener('keydown', (e) => e.key === 'Escape' && (this.resPinned = null));
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

  /** Current income per minute of each resource from every source but chopping by hand, upkeep not taken off; empty until there is enough history. */
  income(): Partial<Resources> {
    const f = this.flows;
    if (!f) return {};
    return Object.fromEntries(RESOURCES.map((r) => [r, SOURCES.reduce((n, src) => n + (src === 'hand' ? 0 : f[src][r]), 0)]));
  }

  message(text: string, ms = 4000): void {
    this.set(this.els.msg, text);
    this.msgUntil = performance.now() + ms;
  }

  update(): void {
    const s = this.world().state;
    const st = getStats(s);
    const now = performance.now();
    const refresh = now - this.rateAt >= RATE_REFRESH_MS;
    if (refresh) {
      this.rateAt = now;
      this.flows = this.perMinute();
    }
    for (const { r, amount, small, rate, per, span } of this.res) {
      // Wood shows from the start; every other resource once some has been gathered or bought.
      const hide = r !== 'wood' && !s.totals[r] && !s.resources[r];
      if (span.hidden !== hide) span.hidden = hide;
      if (hide) continue;
      this.set(amount, fmt(s.resources[r]));
      if (!refresh || !this.flows) continue;
      const net = this.net(this.flows, r, st);
      this.set(rate, signed(net));
      per.hidden = false;
      small.classList.toggle('neg', net < 0);
    }
    this.updateResourceInfo(st);
    this.set(this.els.season, seasonName(st.season));
    this.updateSeasonBar(st.season, s.time);
    this.updateSeasonInfo(s, st);
    this.updateShortage(s.time, st.hungry, st.cold, st.wellFed);
    this.set(this.els.pop, `${s.villagers.length}/${popCap(s)}`);
    this.set(this.els.land, fmt(s.w * s.h - s.treesLeft - s.relics.length));
    // Zero only while a due relic finds no spot to appear; it retries on the next fell.
    this.set(this.els.relicCountdown, `relic in ${fmt(Math.max(0, s.nextRelicAt - s.treesChopped))}`);
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
  private updateSeasonInfo(s: GameState, st: Stats): void {
    const open = this.seasonHover || this.seasonPinned;
    const info = this.seasonInfo;
    info.hidden = !open;
    this.seasonChip.setAttribute('aria-expanded', String(open));
    if (!open) return;
    const next = (st.season + 1) % SEASONS.length;
    const line = (i: number) => `<p>${seasonEffects(s, st, i).join(' · ')}</p>`;
    const html =
      `<h3>${seasonName(st.season)} <small>${duration(seasonLeft(s.time))} left</small></h3>${line(st.season)}` +
      `<h3>Next: ${seasonName(next)}</h3>${line(next)}`;
    if (html !== this.seasonHtml) info.innerHTML = this.seasonHtml = html;
    // Under the chip, kept inside the HUD (the plaque scrolls sideways on narrow screens).
    const hud = info.offsetParent!.getBoundingClientRect();
    const chip = this.seasonChip.getBoundingClientRect();
    const left = Math.max(0, Math.min(chip.left - hud.left, hud.width - info.offsetWidth));
    info.style.left = `${left}px`;
  }

  private updateShortage(time: number, hungry: boolean, cold: boolean, wellFed: boolean): void {
    const last = this.lastShort;
    if (time < last.hungry) last.hungry = -Infinity; // time went back: a new game
    if (time < last.cold) last.cold = -Infinity;
    if (hungry) last.hungry = time;
    if (cold) last.cold = time;
    const h = time - last.hungry < SHORTAGE_HOLD;
    const c = time - last.cold < SHORTAGE_HOLD;
    const [b, small] = this.shortage.children as unknown as [HTMLElement, HTMLElement];
    // Without a shortage the same chip shows Well Fed, in green.
    const fed = !h && !c && wellFed;
    this.shortage.hidden = !h && !c && !fed;
    this.shortage.classList.toggle('alert', h || c);
    this.shortage.classList.toggle('boon', fed);
    if (fed) {
      this.set(b, 'Well Fed');
      this.set(small, `Gathering ×${CONFIG.skills.wellFed.gather}`);
      this.shortage.title = `At least ${CONFIG.skills.wellFed.perVillager} food per villager in stock.`;
    }
    if (!h && !c) return;
    this.set(b, h && c ? 'Hungry & cold' : h ? 'Hungry' : 'Cold');
    this.set(small, h && c ? 'Most work ×0.5' : h ? 'Chop & mine ×0.5' : 'Farm, mine, herd, pick ×0.5');
    this.shortage.title = h ? 'Out of food: build farms.' + (c ? ' Out of firewood: chop wood.' : '') : 'Out of firewood: chop wood.';
  }

  /**
   * Rolling one-minute rate per source of everything gathered, or null until there is enough
   * history. Loads still being carried count, so a delivery doesn't make the rate jump.
   */
  private perMinute(): Flows | null {
    const w = this.world();
    const t = w.state.time;
    const now = gathered(w);
    const smp = this.samples;
    if (!smp.length || t - smp[smp.length - 1][0] >= 1) smp.push([t, now]);
    while (smp.length > 2 && t - smp[0][0] > RATE_WINDOW) smp.shift();
    const [t0, then] = smp[0];
    const dt = t - t0;
    if (dt < RATE_MIN) return null;
    return Object.fromEntries(SOURCES.map((src) => [src, Object.fromEntries(
      RESOURCES.map((r) => [r, ((now[src][r] - then[src][r]) / dt) * 60]),
    )])) as Flows;
  }

  /** Net per-minute change of a resource: every source minus upkeep. */
  private net(flows: Flows, r: ResourceKey, st: Stats): number {
    return SOURCES.reduce((sum, src) => sum + flows[src][r], 0) - sinks(r, st).reduce((sum, [, n]) => sum + n, 0);
  }

  /** Sources and upkeep of the hovered or pinned resource, under its stat. */
  private updateResourceInfo(st: Stats): void {
    const r = this.resHover ?? this.resPinned;
    const info = this.resourceInfo;
    info.hidden = r === null;
    for (const { r: k, span } of this.res) span.setAttribute('aria-expanded', String(k === r));
    if (r === null) return;
    const flows = this.flows;
    const row = (label: string, n: number) => `<li><span>${label}</span><span class="${n < 0 ? 'neg' : 'pos'}">${perMin(n)}</span></li>`;
    let body: string;
    if (!flows) body = '<p>Measuring…</p>';
    else {
      const sources = SOURCES.filter((src) => flows[src][r] > 0).sort((a, b) => flows[b][r] - flows[a][r]);
      const used = sinks(r, st);
      const rows = [...sources.map((src) => row(SOURCE_LABEL[src], flows[src][r])), ...used.map(([label, n]) => row(label, -n))];
      body = rows.length ? `<ul>${rows.join('')}</ul>` : '<p>Nothing gathered in the last minute.</p>';
      if (used.length) body += `<ul class="net">${row('Net', this.net(flows, r, st))}</ul>`;
    }
    if (body !== this.resourceHtml) info.innerHTML = this.resourceHtml = body;
    // Under the stat, kept inside the HUD (the plaque scrolls sideways on narrow screens).
    const span = this.res.find((e) => e.r === r)!.span;
    const hud = info.offsetParent!.getBoundingClientRect();
    const left = Math.max(0, Math.min(span.getBoundingClientRect().left - hud.left, hud.width - info.offsetWidth));
    info.style.left = `${left}px`;
  }

  private set(el: HTMLElement, text: string): void {
    if (this.cache.get(el) === text) return;
    this.cache.set(el, text);
    el.textContent = text;
  }
}

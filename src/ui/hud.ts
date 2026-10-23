import { popCap } from '../core/economy';
import type { World } from '../core/world';
import type { UiState } from './state';
import { duration, fmt } from './text';

const $ = (id: string) => document.getElementById(id)!;
const RATE_WINDOW = 60; // sim seconds

/** Top bar. Reads state every frame, writes the DOM only on change. */
export class Hud {
  private els = {
    wood: $('wood'),
    rate: $('rate'),
    pop: $('pop'),
    land: $('land'),
    trees: $('trees'),
    relic: $('relic'),
    msg: $('msg'),
  };
  private find = $('findRelic') as HTMLButtonElement;
  private tools = [...document.querySelectorAll<HTMLButtonElement>('[data-tool]')];
  private cache = new Map<HTMLElement, string>();
  private msgUntil = 0;
  private samples: [number, number][] = []; // [sim time, lifetime wood]

  constructor(
    private world: () => World,
    private ui: UiState,
    onFindRelic: () => void,
  ) {
    for (const b of this.tools) b.onclick = () => (ui.tool = b.dataset.tool as UiState['tool']);
    this.find.onclick = onFindRelic;
  }

  message(text: string, ms = 4000): void {
    this.set(this.els.msg, text);
    this.msgUntil = performance.now() + ms;
  }

  update(): void {
    const s = this.world().state;
    this.set(this.els.wood, fmt(s.resources.wood));
    this.set(this.els.rate, `+${fmt(this.woodPerMinute())}/min`);
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

  /** Lifetime-wood slope over the last minute of simulated time (offline catch-up included). */
  private woodPerMinute(): number {
    const s = this.world().state;
    const smp = this.samples;
    if (!smp.length || s.time - smp[smp.length - 1][0] >= 1) smp.push([s.time, s.totals.wood]);
    while (smp.length > 2 && s.time - smp[0][0] > RATE_WINDOW) smp.shift();
    const [t0, w0] = smp[0];
    const dt = s.time - t0;
    return dt > 0 ? ((s.totals.wood - w0) / dt) * 60 : 0;
  }

  private set(el: HTMLElement, text: string): void {
    if (this.cache.get(el) === text) return;
    this.cache.set(el, text);
    el.textContent = text;
  }
}

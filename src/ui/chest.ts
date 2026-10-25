import { CONFIG } from '../config';
import { expireBoosts, isBoost, isSpeed, refillChest, runningBoosts, type BoostKind, type ChestReward } from '../core/chest';
import { claimChest, openChest } from '../core/commands';
import { RESOURCES, type Resources } from '../core/types';
import type { World } from '../core/world';
import type { Sound } from './sound';
import { CHEST_TEXT, CHEST_TIERS, fmt, icon } from './text';

const calm = matchMedia('(prefers-reduced-motion: reduce)');
/** Glow, rays and gems by tier (index 1–4): Great gold, Super blue, Epic purple, Legendary orange. */
const TIER_COLOR = ['', '#f2d77a', '#6cc4ff', '#c77dff', '#ff9a3c'];
const COIN_COLORS = ['#f2d77a', '#d9a93c', '#fff3c4'];
// The show's timeline in ms; these match the chest animations in style.css.
const DROP_MS = 450;
const SHAKE_MS = 1100;
const COUNT_MS = 1100; // Windfall amounts count up this long, after the card lands
const COUNT_DELAY_MS = 500;
const SKIP_GUARD_MS = 450; // a tap this soon after the burst doesn't collect yet (it was probably meant to skip)
const AUTO_COLLECT_MS = 6000;
const COLLECT_MS = 650;
const QUAKE_MS = 450;
const GOT_MS = 650;

type Phase = 'idle' | 'drop' | 'shake' | 'reveal' | 'collect';

/** m:ss */
const clock = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

/** A reward's line on the card: what it does, and for how long. */
function rewardDesc(reward: ChestReward): string {
  const text = CHEST_TEXT[reward];
  return isBoost(reward) ? `${text.desc} for ${CONFIG.chest.boosts[reward].seconds / 60} minutes` : text.desc;
}

/** The card's heading when several chests open at once. */
const MANY = ['', '', 'Double chest!', 'Triple chest!'];

/** Each letter in its own span, so they can drop in one after another. */
const letters = (text: string) => [...text].map((ch, k) => `<span style="--k:${k}">${ch}</span>`).join('');

/** Coins and gems flung up out of the chest, then falling. UI-only randomness. */
function loot(n: number, gem: string, delay = 0): string {
  let out = '';
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const d = 130 + Math.random() * 200;
    const dx = Math.cos(a) * d * 1.3;
    const dy = Math.sin(a) * d;
    const isGem = k % 4 === 0;
    const style = `--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--r:${Math.round((Math.random() - 0.5) * 900)}deg;--t:${(1100 + Math.random() * 700).toFixed(0)}ms;`
      + `${isGem ? `--c:${gem};` : `--c:${COIN_COLORS[k % COIN_COLORS.length]};`}animation-delay:${delay + Math.round(Math.random() * 120)}ms`;
    out += `<i class="${isGem ? 'gem' : 'coin'}" style="${style}"></i>`;
  }
  return out;
}

/** Twinkling stars scattered around the chest. UI-only randomness. */
function sparks(n: number, delay = 0): string {
  let out = '';
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const d = 70 + Math.random() * 150;
    out += `<i class="spark" style="--x:${(Math.cos(a) * d * 1.4).toFixed(0)}px;--y:${(Math.sin(a) * d - 40).toFixed(0)}px;animation-delay:${delay + Math.round(Math.random() * 900)}ms"></i>`;
  }
  return out;
}

/** One boost's badge under the chest. */
interface Badge {
  el: HTMLElement;
  time: HTMLElement;
  bar: HTMLElement;
}

/**
 * The Lucky Chest: a button in the map's top-right corner that stores an opening every `CONFIG.chest.cooldownMs`
 * (up to `CONFIG.chest.store`), the boosts under it, and the show when it opens. One tap opens every stored chest
 * together: the chest drops onto the map, rattles while its seam flickers through the tier colors, bursts open with
 * a flash, rays, coins and a fanfare, and the rewards rise out. A tap (or a few seconds) collects them into the corner.
 */
export class LuckyChest {
  private phase: Phase = 'idle';
  private stage: HTMLElement | null = null;
  private rewards: ChestReward[] = []; // the rewards being shown
  private timers: number[] = [];
  private openedAt = 0; // performance.now() of the burst
  private wasStored: number;
  private cache = new Map<HTMLElement, string>();
  private time: HTMLElement;
  private badges = new Map<BoostKind, Badge>();
  private badgeOrder = '';

  constructor(
    private map: HTMLElement,
    private corner: HTMLElement,
    private btn: HTMLButtonElement,
    private badge: HTMLElement,
    private world: () => World,
    private income: () => Partial<Resources>,
    private sound: Sound,
    private message: (text: string, ms?: number) => void,
  ) {
    this.time = btn.querySelector('.chest-time')!;
    this.wasStored = this.ready(Date.now());
    btn.onclick = () => this.open();
    addEventListener('keydown', (e) => {
      if (!this.stage || !['Enter', ' ', 'Escape'].includes(e.key)) return;
      e.preventDefault();
      this.advance();
    });
  }

  /** Called every frame: stores chests that are due, ends boosts whose time is up, and shows the countdown, the chests waiting and the boosts. */
  update(): void {
    const s = this.world().state;
    const now = Date.now();
    const ended = expireBoosts(s.chest, now);
    if (ended.length) {
      const next = ended.some((b) => isSpeed(b.kind)) ? s.chest.boosts.find((b) => isSpeed(b.kind)) : undefined;
      this.message(`${ended.map((b) => CHEST_TEXT[b.kind].name).join(' and ')} ${ended.length > 1 ? 'have' : 'has'} worn off.${next ? ` ${CHEST_TEXT[next.kind].name} starts now.` : ''}`);
    }
    const n = this.ready(now);
    if (n > this.wasStored) {
      this.sound.chime(2);
      this.message(n > 1 ? `${n} Lucky Chests are waiting! Open them in the top right corner.` : 'A Lucky Chest is ready! Open it in the top right corner.', 6000);
    }
    this.wasStored = n;
    const full = s.chest.stored >= CONFIG.chest.store;
    const left = s.chest.readyAt - now;
    const busy = this.phase !== 'idle';
    this.corner.classList.toggle('ready', n > 0 && !busy);
    this.btn.classList.toggle('ready', n > 0 && !busy);
    this.set(this.time, n > 1 ? `Open ×${n}` : n ? 'Open!' : clock(left));
    this.prop(this.btn, '--p', n ? '1' : (1 - left / CONFIG.chest.cooldownMs).toFixed(3));
    const more = full ? ', full' : `, another in ${clock(left)}`;
    this.attr(this.btn, 'aria-label', n ? `Lucky Chest: ${n} ready to open${more}` : `Lucky Chest: opens in ${clock(left)}`);
    this.attr(this.btn, 'title', n ? `Open ${n > 1 ? `all ${n} Lucky Chests` : 'the Lucky Chest'}${full ? ' (full: open it to start the next one)' : `; another in ${clock(left)}`}` : `The Lucky Chest opens again in ${clock(left)}`);
    this.updateBadges(now);
  }

  /** A badge per boost under the chest, in queue order; a queued speed waits dimmed with its whole time. */
  private updateBadges(now: number): void {
    const c = this.world().state.chest;
    const running = runningBoosts(c);
    this.badge.hidden = !c.boosts.length || this.phase === 'reveal' || this.phase === 'collect';
    this.map.classList.toggle('boosted', running.length > 0);
    this.map.classList.toggle('boost-speed', running.some((b) => isSpeed(b.kind)));
    if (running.length) this.prop(this.map, '--boost', TIER_COLOR[Math.max(...running.map((b) => CHEST_TEXT[b.kind].tier))]);
    const order = c.boosts.map((b) => b.kind).join();
    if (order !== this.badgeOrder) {
      this.badgeOrder = order;
      for (const [kind, badge] of this.badges) {
        if (c.boosts.some((b) => b.kind === kind)) continue;
        badge.el.remove();
        this.badges.delete(kind);
      }
      for (const b of c.boosts) {
        const badge = this.badges.get(b.kind) ?? this.makeBadge(b.kind);
        this.badges.set(b.kind, badge);
        this.badge.append(badge.el); // in queue order
      }
    }
    const speeds = c.boosts.filter((b) => isSpeed(b.kind));
    for (const b of c.boosts) {
      const badge = this.badges.get(b.kind)!;
      const on = running.includes(b);
      badge.el.classList.toggle('queued', !on);
      // Hovering tells what it does; a queued speed also says what it waits for.
      const before = speeds[speeds.indexOf(b) - 1];
      this.attr(badge.el, 'title', `${CHEST_TEXT[b.kind].desc}${on ? '' : `, once ${CHEST_TEXT[before.kind].name} ends`}.`);
      this.set(badge.time, on ? clock(b.until - now) : `next · ${clock(b.ms)}`);
      this.prop(badge.bar, 'width', `${on ? (100 * Math.max(0, b.until - now) / b.ms).toFixed(2) : 100}%`);
    }
  }

  private makeBadge(kind: BoostKind): Badge {
    const text = CHEST_TEXT[kind];
    const el = document.createElement('div');
    el.className = 'chest-boost frame parchment';
    el.style.setProperty('--boost', TIER_COLOR[text.tier]);
    el.innerHTML = `<i class="ico ico-${text.icon}"></i><b>${text.name}</b><small></small><span class="chest-boost-bar"><i></i></span>`;
    return { el, time: el.querySelector('small')!, bar: el.querySelector('.chest-boost-bar > i')! };
  }

  /**
   * Chests ready to open at `now`, after storing any that are due: those stored, or those opened before but never
   * claimed (the game closed during the show).
   */
  private ready(now: number): number {
    const c = this.world().state.chest;
    refillChest(c, now);
    return c.pending.length || c.stored;
  }

  private open(): void {
    if (this.phase !== 'idle') return;
    const s = this.world().state;
    const rewards = openChest(this.world(), Date.now());
    if (!rewards) return this.message(`The Lucky Chest opens again in ${clock(s.chest.readyAt - Date.now())}.`);
    this.show(rewards);
  }

  /**
   * Builds the stage and runs the show: drop, shake, burst, as big as the best reward. Several chests open as one,
   * with every reward on the card. The rewards are only claimed at the burst, so nothing gives them away sooner.
   */
  private show(rewards: ChestReward[]): void {
    this.rewards = rewards;
    const tier = this.tier();
    const one = rewards.length === 1;
    const name = one ? CHEST_TEXT[rewards[0]].name : MANY[rewards.length] ?? `${rewards.length} chests!`;
    const desc = one
      ? `<span class="chest-desc">${rewardDesc(rewards[0])}</span>`
      : rewards.map((r) => `<span class="chest-desc chest-line">${icon(CHEST_TEXT[r].icon)}<b>${CHEST_TEXT[r].name}</b> ${rewardDesc(r)}</span>`).join('');
    const st = document.createElement('div');
    st.className = `chest-stage tier-${tier}`;
    st.style.setProperty('--glow', TIER_COLOR[tier]);
    st.setAttribute('role', 'dialog');
    st.setAttribute('aria-label', 'Lucky Chest');
    st.innerHTML = `<div class="chest-dim"></div>
      <div class="chest-spot">
        <div class="chest-rays"><i></i><i></i></div>
        <div class="chest-glow"></div>
        <div class="chest-shadow"></div>
        <div class="chest-box"><i class="chest-base"></i><i class="chest-seam"></i><i class="chest-lid"></i></div>
        <div class="chest-burst"></div>
        <div class="chest-prize" style="--n:${rewards.length}">${rewards.map((r) => icon(CHEST_TEXT[r].icon)).join('')}</div>
      </div>
      <div class="chest-card" aria-live="polite">
        <small class="chest-tier">${letters(CHEST_TIERS[tier])}</small>
        <b class="chest-name">${name}</b>
        ${desc}
        <em class="chest-hint">Tap to collect</em>
      </div>
      <div class="chest-flash"></div>`;
    st.onclick = () => this.advance();
    this.map.append(st);
    this.stage = st;
    if (calm.matches) return this.burst();
    this.phase = 'drop';
    st.classList.add('is-drop');
    this.later(DROP_MS, () => {
      this.phase = 'shake';
      st.classList.replace('is-drop', 'is-shake');
      this.sound.rattle(SHAKE_MS / 1000);
      this.tease(tier);
    });
    this.later(DROP_MS + SHAKE_MS, () => this.burst());
  }

  /** While it shakes, the light from the seam flickers through the tier colors, slowing down, and settles on the real one. */
  private tease(tier: number): void {
    const st = this.stage!;
    const end = SHAKE_MS - 160;
    for (let at = SHAKE_MS * 0.3, gap = 70, k = tier; at < end; at += gap, gap *= 1.22, k++) {
      const c = TIER_COLOR[(k % 4) + 1];
      this.later(at, () => st.style.setProperty('--seam', c));
    }
    this.later(end, () => st.style.setProperty('--seam', TIER_COLOR[tier]));
  }

  /** The show's tier: the best reward's. */
  private tier(): 1 | 2 | 3 | 4 {
    return Math.max(...this.rewards.map((r) => CHEST_TEXT[r].tier)) as 1 | 2 | 3 | 4;
  }

  /** The lid flies off: the rewards are claimed, with a flash, rays, loot, the fanfare, and the rewards rising out. */
  private burst(): void {
    this.clearTimers();
    const st = this.stage!;
    const tier = this.tier();
    const extra = 8 * (this.rewards.length - 1); // more loot for more chests
    st.style.setProperty('--seam', TIER_COLOR[tier]);
    const paid = claimChest(this.world(), Date.now(), this.income())?.paid ?? {};
    const amounts = RESOURCES.filter((r) => paid[r]).map((r) => `<li>${icon(r)}<b data-n="${paid[r]}">+0</b></li>`).join('');
    if (amounts) [...st.querySelectorAll('.chest-desc')].at(-1)!.insertAdjacentHTML('afterend', `<ul class="chest-amounts">${amounts}</ul>`);
    this.phase = 'reveal';
    this.openedAt = performance.now();
    st.classList.remove('is-drop', 'is-shake');
    st.classList.add('is-open');
    if (calm.matches) st.classList.add('calm');
    this.sound.chest(tier);
    if (!calm.matches) {
      const gem = TIER_COLOR[tier];
      st.querySelector('.chest-burst')!.innerHTML = loot(16 + 8 * tier + extra, gem) + sparks(8 + 4 * tier) + (tier >= 3 ? loot(10 + 6 * tier, gem, 320) : '');
      this.map.classList.add('chest-quake');
      window.setTimeout(() => this.map.classList.remove('chest-quake'), QUAKE_MS);
    }
    this.countUp();
    this.later(AUTO_COLLECT_MS, () => this.collect());
  }

  /** Windfall amounts roll up from zero. */
  private countUp(): void {
    const nums = [...this.stage!.querySelectorAll<HTMLElement>('.chest-amounts b')];
    if (!nums.length) return;
    const start = performance.now() + (calm.matches ? 0 : COUNT_DELAY_MS);
    const step = () => {
      if (!this.stage) return;
      const k = calm.matches ? 1 : Math.min(1, Math.max(0, (performance.now() - start) / COUNT_MS));
      const ease = 1 - (1 - k) ** 3;
      for (const el of nums) el.textContent = `+${fmt(Math.round(Number(el.dataset.n) * ease))}`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** A tap or key: skips to the burst while it drops or shakes, collects once it is open. */
  private advance(): void {
    const st = this.stage;
    if (!st) return;
    if (this.phase === 'drop' || this.phase === 'shake') this.burst();
    else if (this.phase === 'reveal' && performance.now() - this.openedAt >= SKIP_GUARD_MS) this.collect();
  }

  /** The reward flies into the corner button and the stage fades away. */
  private collect(): void {
    const st = this.stage;
    if (!st || this.phase !== 'reveal') return;
    this.clearTimers();
    this.phase = 'collect';
    const prize = st.querySelector<HTMLElement>('.chest-prize')!.getBoundingClientRect();
    const to = this.btn.getBoundingClientRect();
    st.style.setProperty('--tx', `${(to.left + to.width / 2 - (prize.left + prize.width / 2)).toFixed(0)}px`);
    st.style.setProperty('--ty', `${(to.top + to.height / 2 - (prize.top + prize.height / 2)).toFixed(0)}px`);
    st.classList.add('is-collect');
    this.later(calm.matches ? 0 : COLLECT_MS, () => {
      st.remove();
      this.stage = null;
      this.rewards = [];
      this.phase = 'idle';
      for (const el of [this.btn, ...[...this.badges.values()].map((b) => b.el)]) {
        el.classList.add('got');
        window.setTimeout(() => el.classList.remove('got'), GOT_MS);
      }
    });
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private clearTimers(): void {
    for (const t of this.timers.splice(0)) clearTimeout(t);
  }

  private set(el: HTMLElement, text: string): void {
    if (this.cache.get(el) === text) return;
    this.cache.set(el, text);
    el.textContent = text;
  }

  private attr(el: HTMLElement, name: string, value: string): void {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  private prop(el: HTMLElement, name: string, value: string): void {
    if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  }
}

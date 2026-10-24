import { ACHIEVEMENTS, tiersOf, type AchievementDef, type AchievementId } from '../core/achievements';
import { achievementDesc, achievementIcon, achievementName, icon } from './text';

const MAX_SHOWN = 3;
const LEAVE_MS = 300; // matches the toast-out animation in style.css
const FLASH_MS = 900; // matches the toast-flash animation
/** By rank (index 1–3): how long a toast stays up, and how much confetti it throws. */
const SHOW_MS = [0, 4000, 5000, 7000];
const CONFETTI = [0, 14, 28, 56];
const CONFETTI_COLORS = ['#f2d77a', '#d9a93c', '#f8efd6', '#c0392b', '#6f9e4f', '#5c9ed6'];
const calm = matchMedia('(prefers-reduced-motion: reduce)');

/** 1: a first tier or first building; 2: a later tier or a feat; 3: tier 4+, a ladder's last tier, or a secret. */
function rank(id: AchievementId, tier: number): 1 | 2 | 3 {
  const def: AchievementDef = ACHIEVEMENTS[id];
  const n = tiersOf(id).length;
  if (def.secret || tier >= 4 || (n > 1 && tier === n)) return 3;
  return tier >= 2 || def.group === 'feats' ? 2 : 1;
}

function headline(id: AchievementId, tier: number): string {
  const n = tiersOf(id).length;
  if ((ACHIEVEMENTS[id] as AchievementDef).secret) return 'Secret found!';
  if (n > 1 && tier === n) return 'Mastered!';
  return tier > 1 ? 'New tier!' : 'Achievement unlocked!';
}

/** Confetti flung out from the toast's middle, wider than tall to match the card. UI-only randomness. */
function confetti(n: number, delay = 0): string {
  let out = '';
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.6;
    const d = 50 + Math.random() * 90;
    const dx = Math.cos(a) * d * 1.8;
    const dy = Math.sin(a) * d - 30;
    const c = CONFETTI_COLORS[k % CONFETTI_COLORS.length];
    const tall = k % 3 === 0 ? ' class="tall"' : '';
    const t = 900 + Math.random() * 600;
    const r = Math.round((Math.random() - 0.5) * 720);
    out += `<i${tall} style="--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--r:${r}deg;--c:${c};--t:${t.toFixed(0)}ms;animation-delay:${delay + Math.round(Math.random() * 80)}ms"></i>`;
  }
  return out;
}

/**
 * Achievement toasts: up to three at once, the rest wait their turn. The higher the rank, the bigger the show:
 * more confetti, spinning rays behind the medal, and for rank 3 a second burst, a gold flash over the map and a wobble.
 */
export class Toasts {
  private queue: { html: string; rank: 1 | 2 | 3 }[] = [];

  constructor(
    private box: HTMLElement,
    onClick: () => void,
    private chime: (rank: 1 | 2 | 3) => void,
  ) {
    box.onclick = (e) => (e.target as HTMLElement).closest('.toast') && onClick();
  }

  achievement(id: AchievementId, tier: number): void {
    const n = tiersOf(id).length;
    const pips = n > 1 ? `<span class="toast-pips">${Array.from({ length: n }, (_, k) => `<i class="${k < tier - 1 ? 'filled' : k === tier - 1 ? 'filled new' : ''}"></i>`).join('')}</span>` : '';
    this.push(
      `<span class="toast-medal">${achievementIcon(id)}</span><div><small>${headline(id, tier)}</small><b>${achievementName(id, tier)}</b><span>${achievementDesc(id, tier)}</span>${pips}</div>`,
      rank(id, tier),
    );
  }

  summary(text: string): void {
    this.push(`<span class="toast-medal">${icon('trophy')}</span><div><small>Achievements</small><b>${text}</b></div>`, 2);
  }

  private push(html: string, rank: 1 | 2 | 3): void {
    this.queue.push({ html, rank });
    this.next();
  }

  /** Shows queued toasts while there is room. Toasts that appear together play one chime, the biggest. */
  private next(): void {
    let loudest = 0;
    while (this.box.childElementCount < MAX_SHOWN && this.queue.length) {
      const { html, rank } = this.queue.shift()!;
      const wrap = document.createElement('div');
      wrap.className = `toast-wrap rank-${rank}`;
      const burst = calm.matches ? '' : `<div class="toast-burst">${confetti(CONFETTI[rank])}${rank === 3 ? confetti(CONFETTI[rank] / 2, 350) : ''}</div>`;
      wrap.innerHTML = `<div class="toast frame">${html}</div>${burst}`;
      this.box.append(wrap);
      loudest = Math.max(loudest, rank);
      if (rank === 3 && !calm.matches) this.flash();
      window.setTimeout(() => {
        wrap.classList.add('leaving');
        window.setTimeout(() => {
          wrap.remove();
          this.next();
        }, LEAVE_MS);
      }, SHOW_MS[rank]);
    }
    if (loudest) this.chime(loudest as 1 | 2 | 3);
  }

  /** A gold flash over the whole map. */
  private flash(): void {
    const el = document.createElement('div');
    el.className = 'toast-flash';
    this.box.parentElement!.append(el);
    window.setTimeout(() => el.remove(), FLASH_MS);
  }
}

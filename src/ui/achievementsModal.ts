import {
  ACHIEVEMENT_IDS, ACHIEVEMENTS, earned, earnedTiers, nextUp, progress, tiersOf, TOTAL_TIERS, type AchievementDef, type AchievementGroup, type AchievementId,
} from '../core/achievements';
import type { World } from '../core/world';
import { ACHIEVEMENT_GROUP_TEXT, achievementDesc, achievementIcon, achievementName, fmt, icon } from './text';

const GROUPS = Object.keys(ACHIEVEMENT_GROUP_TEXT) as AchievementGroup[];
const REFRESH_MS = 250;

const bar = (frac: number) => `<i class="ach-bar"><i style="width:${(100 * frac).toFixed(1)}%"></i></i>`;

/** The Achievements window, and the next-up button in the sidebar that shows the closest goal and opens it. */
export class AchievementsModal {
  private body: HTMLElement;
  private summary: HTMLElement;
  private key = '';
  private nextKey = '';
  private at = 0;

  constructor(
    private dlg: HTMLDialogElement,
    private btn: HTMLButtonElement,
    private nextBtn: HTMLButtonElement,
    private world: () => World,
  ) {
    this.body = dlg.querySelector('.ach-body')!;
    this.summary = dlg.querySelector('.skill-summary')!;
    dlg.querySelector<HTMLButtonElement>('.close')!.onclick = () => dlg.close();
    dlg.addEventListener('close', () => btn.setAttribute('aria-expanded', 'false'));
    btn.onclick = () => this.open();
    nextBtn.onclick = () => this.open();
  }

  open(): void {
    this.key = '';
    this.render();
    if (!this.dlg.open) this.dlg.showModal();
    this.btn.setAttribute('aria-expanded', 'true');
  }

  update(): void {
    const now = performance.now();
    if (now - this.at < REFRESH_MS) return;
    this.at = now;
    this.updateNext();
    if (this.dlg.open) this.render();
  }

  private updateNext(): void {
    const s = this.world().state;
    const id = nextUp(s);
    const p = id && progress(s, id);
    const key = p ? `${id}|${earned(s, id)}|${fmt(p.value)}|${p.frac.toFixed(2)}` : '';
    if (key === this.nextKey) return;
    this.nextKey = key;
    this.nextBtn.hidden = !p;
    if (!id || !p) return;
    const tier = earned(s, id) + 1;
    this.nextBtn.setAttribute('aria-label', `Next achievement: ${achievementDesc(id, tier)}, ${fmt(p.value)} of ${fmt(p.goal)}`);
    this.nextBtn.innerHTML = `${achievementIcon(id)}<span class="next-up-copy"><small>Next: ${achievementName(id, tier)}</small><b>${achievementDesc(id, tier)}</b>${bar(p.frac)}</span><small class="next-up-count">${fmt(Math.min(p.value, p.goal))}/${fmt(p.goal)}</small>`;
  }

  private render(): void {
    const s = this.world().state;
    const rows = ACHIEVEMENT_IDS.map((id) => ({ id, have: earned(s, id), p: progress(s, id) }));
    const key = JSON.stringify(rows.map(({ have, p }) => [have, p && fmt(p.value)]));
    if (key === this.key) return;
    this.key = key;
    this.summary.textContent = `${earnedTiers(s)} of ${TOTAL_TIERS} earned`;
    this.body.replaceChildren(
      ...GROUPS.map((g) => {
        const section = document.createElement('section');
        const cards = rows.filter((r) => ACHIEVEMENTS[r.id].group === g).map((r) => this.card(r.id, r.have, r.p));
        section.innerHTML = `<h3 class="ach-group">${ACHIEVEMENT_GROUP_TEXT[g]}</h3><ul class="ach-list">${cards.join('')}</ul>`;
        return section;
      }),
    );
  }

  private card(id: AchievementId, have: number, p: ReturnType<typeof progress>): string {
    const tiers = tiersOf(id);
    if ((ACHIEVEMENTS[id] as AchievementDef).secret && !have) {
      return `<li class="ach-card frame parchment locked"><span class="ach-icon">${icon('relic')}</span><div><h4>???</h4><p>A secret achievement</p></div></li>`;
    }
    const done = have === tiers.length;
    const pips = tiers.length > 1 ? `<span class="skill-pips">${tiers.map((_, k) => `<i${k < have ? ' class="filled"' : ''}></i>`).join('')}</span>` : '';
    const goal = p ? `<span class="ach-progress">${bar(p.frac)}<small>${fmt(Math.min(p.value, p.goal))} / ${fmt(p.goal)}</small></span>` : '';
    const cls = done ? 'gold done' : have ? 'parchment' : 'parchment locked';
    return `<li class="ach-card frame ${cls}"><span class="ach-icon">${achievementIcon(id)}</span><div><h4>${achievementName(id, have)}</h4><p>${achievementDesc(id, done ? have : have + 1)}</p>${pips}${goal}</div></li>`;
  }
}

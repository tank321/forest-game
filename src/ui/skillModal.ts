import { pickSkill } from '../core/commands';
import { lvl, SKILL_IDS, SKILLS, type SkillId } from '../core/skills';
import type { World } from '../core/world';
import { prerequisite, skillBonus, SKILL_GROUP, skillStatus } from './skillInfo';
import { icon, SKILL_TEXT } from './text';

type SkillView = 'all' | 'choose';

/** Skill journal and relic rewards. Browsing never spends a pick; the simulation keeps running. */
export class SkillModal {
  private key = '';
  private pending = 0;
  private view: SkillView = 'all';
  private selected: SkillId | null = null;
  private gallery: HTMLElement;
  private detailSlot: HTMLElement;
  private filters: HTMLElement;
  private status: HTMLSelectElement;
  private group: HTMLSelectElement;
  private summary: HTMLElement;
  private feedback: HTMLElement;
  private feedbackTimer = 0;
  private tabs: HTMLButtonElement[];
  private mobile = matchMedia('(max-width: 640px)');

  constructor(
    private dlg: HTMLDialogElement,
    private reopen: HTMLButtonElement,
    private world: () => World,
    private notify: (message: string) => void,
  ) {
    const el = <T extends HTMLElement>(selector: string) => dlg.querySelector<T>(selector)!;
    this.gallery = el('.skill-gallery');
    this.detailSlot = el('.skill-detail-slot');
    this.filters = el('.skill-filters');
    this.status = el<HTMLSelectElement>('#skillStatus');
    this.group = el<HTMLSelectElement>('#skillGroup');
    this.summary = el('.skill-summary');
    this.feedback = el('.skill-feedback');
    this.tabs = [...dlg.querySelectorAll<HTMLButtonElement>('[data-skill-view]')];
    el<HTMLButtonElement>('.close').onclick = () => dlg.close();
    dlg.addEventListener('close', () => {
      document.getElementById('skillsBtn')!.setAttribute('aria-expanded', 'false');
      this.feedback.textContent = '';
      window.clearTimeout(this.feedbackTimer);
    });
    for (const tab of this.tabs) tab.onclick = () => this.open(tab.dataset.skillView as SkillView);
    this.status.onchange = this.group.onchange = () => this.render();
    this.mobile.addEventListener('change', () => { if (dlg.open) this.render(); });
    const cardOf = (event: Event) => (event.target as HTMLElement).closest<HTMLButtonElement>('[data-skill]')?.dataset.skill as SkillId | undefined;
    // While choosing, a click on a card picks it; the journal only inspects.
    this.gallery.onclick = (event) => {
      const id = cardOf(event);
      if (id) (this.view === 'choose' ? this.choose(id) : this.inspect(id));
    };
    this.gallery.addEventListener('pointerover', (event) => {
      const id = cardOf(event);
      if (id && !this.mobile.matches && event.pointerType === 'mouse') this.inspect(id);
    });
    this.gallery.addEventListener('focusin', (event) => {
      const id = cardOf(event);
      if (id && this.view === 'choose' && !this.mobile.matches) this.inspect(id);
    });
    reopen.onclick = () => this.open('choose');
  }

  private inspect(id: SkillId): void {
    if (this.selected === id) return;
    this.selected = id;
    if (this.mobile.matches) {
      this.render();
      return;
    }
    // Keep the hovered card and keyboard focus intact while updating the preview.
    for (const button of this.gallery.querySelectorAll<HTMLButtonElement>('[data-skill]')) {
      const selected = button.dataset.skill === id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    if (this.view === 'choose') this.showStacked(id);
    else this.detailSlot.replaceChildren(this.details(id));
  }

  /** Shows one of the stacked choice details. All of them share a grid cell, so the slot keeps the tallest one's height. */
  private showStacked(id: SkillId): void {
    for (const detail of this.detailSlot.querySelectorAll<HTMLElement>('.skill-detail')) {
      const hidden = detail.dataset.detail !== id;
      detail.classList.toggle('is-hidden', hidden);
      detail.inert = hidden;
    }
  }

  /** Learns an offered skill. Returns to the game, or shows the next choice while picks remain. */
  private choose(id: SkillId): void {
    const w = this.world();
    if (!pickSkill(w, id)) return;
    const s = w.state;
    const message = `${SKILL_TEXT[id].name} upgraded to level ${lvl(s, id)}!`;
    if (!s.cards.length) {
      this.dlg.close();
      this.notify(message);
      return;
    }
    this.feedback.textContent = message;
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(() => { this.feedback.textContent = ''; }, 3500);
    this.selected = s.cards[0];
    this.render();
  }

  open(view: SkillView = 'all'): void {
    if (view !== this.view) this.selected = null;
    this.view = view;
    this.render();
    if (!this.dlg.open) this.dlg.showModal();
    document.getElementById('skillsBtn')!.setAttribute('aria-expanded', 'true');
  }

  update(): void {
    const s = this.world().state;
    const newPick = s.picksPending > this.pending;
    this.pending = s.picksPending;
    if (newPick && s.cards.length) this.open('choose');
    this.reopen.hidden = !s.cards.length || this.dlg.open;
    const label = this.reopen.querySelector('span')!;
    const text = `Pick skill (${s.picksPending})`;
    if (label.textContent !== text) label.textContent = text;
    if (!this.dlg.open) return;
    const key = JSON.stringify([s.skills, s.cards, s.picksPending, s.relicsSpawned - s.relics.length]);
    if (key !== this.key) {
      this.key = key;
      this.render();
    }
  }

  private render(): void {
    const s = this.world().state;
    if (!s.cards.length) this.view = 'all';
    const choosing = this.view === 'choose';
    this.dlg.classList.toggle('is-choosing', choosing);
    const focused = this.dlg.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.focus : undefined;
    for (const tab of this.tabs) {
      const choice = tab.dataset.skillView === 'choose';
      tab.classList.toggle('active', choice === choosing);
      tab.setAttribute('aria-pressed', String(choice === choosing));
      if (choice) {
        tab.textContent = `Choose a skill (${s.picksPending})`;
        tab.disabled = !s.cards.length;
      }
    }
    const learned = SKILL_IDS.filter((id) => lvl(s, id) > 0).length;
    this.summary.textContent = choosing
      ? `${s.picksPending} pick${s.picksPending === 1 ? '' : 's'} waiting. Pick a skill to learn it.`
      : `${learned} of ${SKILL_IDS.length} skills learned · ${s.relicsSpawned - s.relics.length} relics collected`;
    this.filters.hidden = choosing;
    const ids = choosing ? s.cards : SKILL_IDS.filter((id) =>
      (this.status.value === 'all' || skillStatus(s, id).toLowerCase() === this.status.value ||
        (this.status.value === 'learned' && lvl(s, id) > 0)) &&
      (this.group.value === 'all' || SKILL_GROUP[id] === this.group.value),
    );
    if (!this.selected || !ids.includes(this.selected)) this.selected = ids[0] ?? null;
    this.gallery.classList.toggle('choosing', choosing);
    this.detailSlot.classList.toggle('stacked', choosing);
    this.detailSlot.replaceChildren();
    this.gallery.replaceChildren(...ids.map((id) => {
      const level = lvl(s, id);
      const status = skillStatus(s, id);
      const text = SKILL_TEXT[id];
      const entry = document.createElement('div');
      entry.className = 'skill-entry';
      const b = document.createElement('button');
      b.className = `skill-card parchment ${status.toLowerCase()}${s.cards.includes(id) ? ' is-offered' : ''}${this.selected === id ? ' is-selected' : ''}`;
      b.dataset.skill = id;
      b.dataset.focus = id;
      b.setAttribute('aria-pressed', String(this.selected === id));
      b.setAttribute('aria-label', `${text.name}, level ${level} of ${SKILLS[id].max}, ${status}${s.cards.includes(id) ? ', offered by relic' : ''}`);
      // A choice card shows its next level, so it can be picked without opening the details.
      const extra = choosing
        ? `<span class="skill-next">Next: ${skillBonus(id, level + 1)}</span>`
        : s.cards.includes(id) ? '<span class="skill-offer">Relic choice</span>' : '';
      b.innerHTML = `${icon(text.icon)}<span class="skill-card-copy"><b>${text.name}</b><span class="skill-card-meta">${status} · ${level}/${SKILLS[id].max}</span><span class="skill-pips" aria-hidden="true">${Array.from({ length: SKILLS[id].max }, (_, i) => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</span>${extra}</span>`;
      entry.append(b);
      if (this.mobile.matches && !choosing && this.selected === id) entry.append(this.details(id));
      return entry;
    }));
    if (!ids.length) {
      const empty = document.createElement('p');
      empty.className = 'skill-empty';
      empty.textContent = 'No skills match these filters. Try another group or show all skills.';
      this.gallery.append(empty);
    } else if (!this.mobile.matches) {
      // While choosing, every offered skill's details are stacked so hovering never resizes the dialog.
      if (choosing) {
        this.detailSlot.append(...ids.map((id) => this.details(id)));
        this.showStacked(this.selected!);
      } else this.detailSlot.append(this.details(this.selected!));
    }
    if (focused) {
      const target = [...this.dlg.querySelectorAll<HTMLElement>('[data-focus]')].find((el) => el.dataset.focus === focused && !el.closest('[inert]'));
      (target ?? this.gallery.querySelector<HTMLButtonElement>('[aria-pressed="true"]'))?.focus({ preventScroll: true });
    }
  }

  private details(id: SkillId): HTMLElement {
    const s = this.world().state;
    const text = SKILL_TEXT[id];
    const level = lvl(s, id);
    const max = SKILLS[id].max;
    const req = prerequisite(id);
    const status = skillStatus(s, id);
    const detail = document.createElement('section');
    detail.className = 'skill-detail frame parchment';
    detail.dataset.detail = id;
    detail.setAttribute('aria-label', `${text.name} details`);
    detail.innerHTML = `<div class="skill-detail-heading">${icon(text.icon)}<div><p class="skill-eyebrow">${SKILL_GROUP[id]} · ${status}</p><h3>${text.name}</h3></div></div><p>${text.desc}.</p><dl><dt>Current bonus · level ${level}</dt><dd>${skillBonus(id, level)}</dd>${level < max ? `<dt>Next level · ${level + 1}/${max}</dt><dd>${skillBonus(id, level + 1)}</dd>` : '<dt>Fully learned</dt><dd>You have every level of this skill.</dd>'}</dl>`;
    if (req) {
      const b = document.createElement('button');
      b.className = 'skill-requirement parchment';
      b.dataset.focus = 'prerequisite';
      b.textContent = `${status === 'Locked' ? 'Requires:' : 'Requires (met):'} ${SKILL_TEXT[req].name} · level 1 ↗`;
      b.onclick = () => {
        this.status.value = this.group.value = 'all';
        this.open('all');
        this.selected = req;
        this.render();
      };
      detail.append(b);
    }
    const unlocks = SKILL_IDS.filter((child) => prerequisite(child) === id);
    if (unlocks.length) {
      const p = document.createElement('p');
      p.className = 'skill-unlocks';
      p.textContent = `${level ? 'Unlocks' : 'Level 1 unlocks'}: ${unlocks.map((child) => SKILL_TEXT[child].name).join(', ')}.`;
      detail.append(p);
    }
    const offered = s.cards.includes(id);
    if (offered && this.view === 'choose') {
      const choose = document.createElement('button');
      choose.className = 'gold skill-choose';
      choose.dataset.focus = 'choose';
      choose.textContent = `Choose ${text.name} · level ${level + 1}`;
      choose.onclick = () => this.choose(id);
      detail.append(choose);
    } else {
      const p = document.createElement('p');
      p.className = 'skill-hint';
      p.textContent = status === 'Maxed' ? 'Maximum level reached.' : status === 'Locked'
        ? 'Learn the prerequisite to unlock this skill for future relic choices.'
        : offered ? 'This skill is one of your current relic choices.' : 'Collect relics to receive skill choices.';
      detail.append(p);
      if (offered) {
        const b = document.createElement('button');
        b.className = 'gold skill-choose';
        b.dataset.focus = 'review';
        b.textContent = 'Review relic choice';
        b.onclick = () => { this.open('choose'); this.selected = id; this.render(); };
        detail.append(b);
      }
    }
    return detail;
  }
}

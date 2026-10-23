import { unlocks } from '../core/buildings';
import { pickSkill } from '../core/commands';
import { availableSkills, lvl, prerequisite, SKILL_IDS, SKILLS, TRACK_IDS, trackOf, TRACKS, type SkillId } from '../core/skills';
import type { World } from '../core/world';
import { skillBonus, skillStatus } from './skillInfo';
import { BUILDING_TEXT, icon, skillIcon, SKILL_TEXT, TRACK_TEXT } from './text';

type SkillView = 'all' | 'choose';

/** Every skill in track order: the tree's columns, top to bottom. */
const TREE_ORDER: SkillId[] = TRACK_IDS.flatMap((t) => [...TRACKS[t]]);

const pips = (id: SkillId, level: number) =>
  `<span class="skill-pips" aria-hidden="true">${Array.from({ length: SKILLS[id].max }, (_, i) => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</span>`;

/** Skill tree and relic rewards. Browsing never spends a pick; the simulation keeps running. */
export class SkillModal {
  private key = '';
  private pending = 0;
  private view: SkillView = 'all';
  private selected: SkillId | null = null;
  private gallery: HTMLElement;
  private detailSlot: HTMLElement;
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
    this.mobile.addEventListener('change', () => { if (dlg.open) this.render(); });
    const cardOf = (event: Event) => (event.target as HTMLElement).closest<HTMLButtonElement>('[data-skill]')?.dataset.skill as SkillId | undefined;
    // A click on an offered skill picks it, in the choice list or the tree; any other skill is only inspected.
    this.gallery.onclick = (event) => {
      const id = cardOf(event);
      if (id) (this.world().state.cards.includes(id) ? this.choose(id) : this.inspect(id));
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
      if (this.view === 'all') this.gallery.querySelector('.skill-detail')?.scrollIntoView({ block: 'nearest' });
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
    const kind = unlocks(id);
    const message = kind ? `${BUILDING_TEXT[kind].name} unlocked! Find it in the build menu.` : `${SKILL_TEXT[id].name} upgraded to level ${lvl(s, id)}!`;
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
    const ids = choosing ? s.cards : TREE_ORDER;
    if (!this.selected || !ids.includes(this.selected)) {
      const open = availableSkills(s);
      this.selected = (choosing ? ids[0] : s.cards[0] ?? TREE_ORDER.find((id) => open.includes(id)) ?? ids[0]) ?? null;
    }
    this.gallery.classList.toggle('choosing', choosing);
    this.detailSlot.classList.toggle('stacked', choosing);
    this.detailSlot.replaceChildren();
    if (choosing) {
      this.gallery.replaceChildren(...ids.map((id) => {
        const entry = document.createElement('div');
        entry.className = 'skill-entry';
        entry.append(this.card(id));
        return entry;
      }));
      // Every offered skill's details are stacked so hovering never resizes the dialog.
      if (!this.mobile.matches && ids.length) {
        this.detailSlot.append(...ids.map((id) => this.details(id)));
        this.showStacked(this.selected!);
      }
    } else {
      this.gallery.replaceChildren(this.tree());
      if (this.selected) (this.mobile.matches ? this.gallery : this.detailSlot).append(this.details(this.selected));
    }
    if (focused) {
      const target = [...this.dlg.querySelectorAll<HTMLElement>('[data-focus]')].find((el) => el.dataset.focus === focused && !el.closest('[inert]'));
      (target ?? this.gallery.querySelector<HTMLButtonElement>('[aria-pressed="true"]'))?.focus({ preventScroll: true });
    }
  }

  /** A relic choice: the skill's track and next level, so it can be picked without opening the details. */
  private card(id: SkillId): HTMLButtonElement {
    const s = this.world().state;
    const level = lvl(s, id);
    const text = SKILL_TEXT[id];
    const track = TRACK_TEXT[trackOf(id)].name;
    const b = document.createElement('button');
    b.className = `skill-card parchment ${skillStatus(s, id).toLowerCase()}${this.selected === id ? ' is-selected' : ''}`;
    b.dataset.skill = id;
    b.dataset.focus = id;
    b.setAttribute('aria-pressed', String(this.selected === id));
    b.setAttribute('aria-label', `${text.name}, ${track}, level ${level} of ${SKILLS[id].max}`);
    b.innerHTML = `${skillIcon(id)}<span class="skill-card-copy"><b>${text.name}</b><span class="skill-card-meta">${track} · ${level}/${SKILLS[id].max}</span>${pips(id, level)}<span class="skill-next">Next: ${skillBonus(id, level + 1)}</span></span>`;
    return b;
  }

  /** One column per track, its skills top to bottom; a link is solid once the skill above it has a level. */
  private tree(): HTMLElement {
    const s = this.world().state;
    const tree = document.createElement('div');
    tree.className = 'skill-tree';
    for (const track of TRACK_IDS) {
      const ids: readonly SkillId[] = TRACKS[track];
      const { name, icon: ico } = TRACK_TEXT[track];
      const col = document.createElement('section');
      col.className = 'skill-track';
      col.setAttribute('aria-label', `${name} track`);
      col.innerHTML = `<h3 class="skill-track-head">${icon(ico)}<span>${name}</span><small>${ids.filter((id) => lvl(s, id)).length}/${ids.length}</small></h3>`;
      const list = document.createElement('ol');
      list.append(...ids.map((id, i) => {
        const li = document.createElement('li');
        if (i && lvl(s, ids[i - 1])) li.className = 'linked';
        li.append(this.node(id));
        return li;
      }));
      col.append(list);
      tree.append(col);
    }
    return tree;
  }

  private node(id: SkillId): HTMLButtonElement {
    const s = this.world().state;
    const level = lvl(s, id);
    const status = skillStatus(s, id);
    const text = SKILL_TEXT[id];
    const offered = s.cards.includes(id);
    const b = document.createElement('button');
    b.className = `skill-node ${status.toLowerCase()}${offered ? ' is-offered' : ''}${this.selected === id ? ' is-selected' : ''}`;
    b.dataset.skill = id;
    b.dataset.focus = id;
    b.setAttribute('aria-pressed', String(this.selected === id));
    b.setAttribute('aria-label', `${text.name}, level ${level} of ${SKILLS[id].max}, ${status}${offered ? ', offered by relic, press to learn' : ''}`);
    if (offered) b.title = `Learn ${text.name} · level ${level + 1}`;
    b.innerHTML = `<span class="skill-node-tile frame">${skillIcon(id)}</span><b>${text.name}</b>${pips(id, level)}`;
    return b;
  }

  private details(id: SkillId): HTMLElement {
    const s = this.world().state;
    const text = SKILL_TEXT[id];
    const level = lvl(s, id);
    const max = SKILLS[id].max;
    const req = prerequisite(id);
    const status = skillStatus(s, id);
    const track: readonly SkillId[] = TRACKS[trackOf(id)];
    const detail = document.createElement('section');
    detail.className = 'skill-detail frame parchment';
    detail.dataset.detail = id;
    detail.setAttribute('aria-label', `${text.name} details`);
    detail.innerHTML = `<div class="skill-detail-heading">${skillIcon(id)}<div><p class="skill-eyebrow">${TRACK_TEXT[trackOf(id)].name} ${track.indexOf(id) + 1} of ${track.length} · ${status}</p><h3>${text.name}</h3></div></div><p>${text.desc}.</p><dl><dt>Current bonus · level ${level}</dt><dd>${skillBonus(id, level)}</dd>${level < max ? `<dt>Next level · ${level + 1}/${max}</dt><dd>${skillBonus(id, level + 1)}</dd>` : '<dt>Fully learned</dt><dd>You have every level of this skill.</dd>'}</dl>`;
    if (req) {
      const b = document.createElement('button');
      b.className = 'skill-requirement parchment';
      b.dataset.focus = 'prerequisite';
      b.textContent = `${lvl(s, req) ? 'Requires (met):' : 'Requires:'} ${SKILL_TEXT[req].name} · level 1 ↗`;
      b.onclick = () => {
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
    if (s.cards.includes(id)) {
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
        ? `Learn ${SKILL_TEXT[req!].name} to unlock this skill for future relic choices.`
        : 'Collect relics to receive skill choices.';
      detail.append(p);
    }
    return detail;
  }
}

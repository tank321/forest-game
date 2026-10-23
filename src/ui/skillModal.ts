import { unlocks } from '../core/buildings';
import { pickSkill } from '../core/commands';
import { availableSkills, isMastery, lvl, prerequisite, SKILL_IDS, SKILLS, TRACK_IDS, trackOf, TRACKS, unlockedBy, type SkillId } from '../core/skills';
import type { World } from '../core/world';
import { PanZoom } from './panZoom';
import { lockReason, skillBonus, skillStatus } from './skillInfo';
import { edgePath, NODE, skillLayout } from './skillGraph';
import { BUILDING_TEXT, icon, skillIcon, SKILL_TEXT, TRACK_TEXT } from './text';

type SkillView = 'all' | 'choose';

/** Every skill in track order, parents first. */
const TREE_ORDER: SkillId[] = TRACK_IDS.flatMap((t) => [...TRACKS[t]]);
const LAYOUT = skillLayout();
const SVG = 'http://www.w3.org/2000/svg';

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
  private coarse = matchMedia('(pointer: coarse)');
  private graph = new PanZoom(LAYOUT.w, LAYOUT.h, 'Skill tree');
  /** The tree's stats popup for the selected skill, kept beside it as the view pans and zooms. */
  private tip = document.createElement('div');

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
      if (this.view === 'all') this.selected = null;
    });
    for (const tab of this.tabs) tab.onclick = () => this.open(tab.dataset.skillView as SkillView);
    this.mobile.addEventListener('change', () => { if (dlg.open) this.render(); });
    this.tip.className = 'skill-tip frame parchment';
    this.tip.id = 'skillTip';
    this.tip.setAttribute('role', 'tooltip');
    this.tip.hidden = true;
    this.graph.viewport.append(this.tip);
    this.graph.onMove = () => this.placeTip();
    const cardOf = (event: Event) => (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-skill]')?.dataset.skill as SkillId | undefined;
    // A choice card is picked on click. In the tree, an offered skill is picked once its popup shows
    // (on hover, keyboard focus, or a first tap), and a click anywhere else in the tree hides the popup.
    this.gallery.onclick = (event) => {
      const id = cardOf(event);
      if (!id) {
        if (this.view === 'all') this.inspect(null);
        return;
      }
      const offered = this.world().state.cards.includes(id);
      if (offered && (this.view === 'choose' || this.selected === id)) this.choose(id);
      else this.inspect(id);
    };
    this.gallery.addEventListener('pointerover', (event) => {
      const id = cardOf(event);
      if (id && !this.mobile.matches && event.pointerType === 'mouse' && !this.graph.dragging) this.inspect(id);
    });
    this.gallery.addEventListener('pointerout', (event) => {
      if (this.view !== 'all' || event.pointerType !== 'mouse' || this.graph.dragging) return;
      if (cardOf(event) && !(event.relatedTarget as HTMLElement | null)?.closest('[data-skill]')) this.inspect(null);
    });
    // Only keyboard focus inspects: a tap focuses too, and must leave the second tap to pick.
    this.gallery.addEventListener('focusin', (event) => {
      const id = cardOf(event);
      if (id && (event.target as HTMLElement).matches(':focus-visible') && (this.view === 'all' || !this.mobile.matches)) this.inspect(id);
    });
    reopen.onclick = () => this.open('choose');
  }

  private inspect(id: SkillId | null): void {
    if (this.selected === id) return;
    this.selected = id;
    if (this.mobile.matches && this.view === 'choose') return this.render();
    // Keep the hovered card and keyboard focus intact while updating the preview.
    for (const button of this.gallery.querySelectorAll<HTMLButtonElement>('[data-skill]')) {
      const selected = button.dataset.skill === id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      if (selected && this.view === 'all') button.setAttribute('aria-describedby', this.tip.id);
      else button.removeAttribute('aria-describedby');
    }
    if (this.view === 'choose') this.showStacked(id!);
    else this.showTip();
  }

  /** Fills the tree's popup with the selected skill's stats, or hides it. */
  private showTip(): void {
    const id = this.selected;
    this.tip.hidden = this.view !== 'all' || !id;
    if (this.tip.hidden || !id) return;
    const s = this.world().state;
    const level = lvl(s, id);
    const max = SKILLS[id].max;
    const status = skillStatus(s, id);
    const text = SKILL_TEXT[id];
    const hint = s.cards.includes(id)
      ? `${this.coarse.matches ? 'Tap again' : 'Click'} to learn level ${level + 1}`
      : status === 'Locked' ? lockReason(s, id) : '';
    const track = `${TRACK_TEXT[trackOf(id)].name}${isMastery(id) ? ' Mastery' : ''}`;
    this.tip.innerHTML = `<div class="skill-tip-head">${skillIcon(id)}<div><b>${text.name}</b><p class="skill-eyebrow">${track} · ${status} · ${level}/${max}</p></div></div>`
      + `<p>${text.desc}.</p><dl>${level ? `<dt>Now</dt><dd>${skillBonus(id, level)}</dd>` : ''}${level < max ? `<dt>Next</dt><dd>${skillBonus(id, level + 1)}</dd>` : ''}</dl>`
      + (hint ? `<p class="skill-tip-hint">${hint}</p>` : '');
    this.placeTip();
  }

  /** Puts the popup beside the selected node's tile: right, else left, else below or above it, inside the view. */
  private placeTip(): void {
    const id = this.selected;
    const node = id && !this.tip.hidden && this.graph.layer.querySelector<HTMLElement>(`[data-skill="${id}"]`);
    if (!node) return;
    const gap = 8;
    const v = this.graph.viewport.getBoundingClientRect();
    const tile = node.querySelector('.skill-node-tile')!.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const { offsetWidth: tw, offsetHeight: th } = this.tip;
    const clamp = (n: number, hi: number) => Math.max(gap, Math.min(n, hi - gap));
    let left = tile.right - v.left + gap;
    let top = tile.top - v.top;
    if (left + tw > v.width - gap) left = tile.left - v.left - gap - tw;
    if (left < gap) {
      left = box.left - v.left + (box.width - tw) / 2;
      top = box.bottom - v.top + gap;
      if (top + th > v.height - gap) top = box.top - v.top - gap - th;
    }
    this.tip.style.translate = `${clamp(left, v.width - tw)}px ${clamp(top, v.height - th)}px`;
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
    this.selected = this.view === 'choose' ? s.cards[0] : id;
    this.render();
  }

  open(view: SkillView = 'all'): void {
    const fresh = view !== this.view || !this.dlg.open;
    if (view !== this.view) this.selected = null;
    this.view = view;
    this.render();
    if (!this.dlg.open) this.dlg.showModal();
    if (fresh && this.view === 'all') {
      // Start on a skill on offer, else the first one that can be offered.
      const s = this.world().state;
      const open = availableSkills(s);
      const focus = s.cards[0] ?? TREE_ORDER.find((id) => open.includes(id));
      const at = focus && LAYOUT.nodes[focus];
      this.graph.home(at ? at.x : undefined, at ? at.y + NODE.h / 2 : undefined);
    }
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
    // The tree selects nothing until a skill is hovered, focused or tapped.
    if (choosing && (!this.selected || !ids.includes(this.selected))) this.selected = ids[0] ?? null;
    this.gallery.classList.toggle('choosing', choosing);
    this.gallery.classList.toggle('is-graph', !choosing);
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
    }
    this.showTip();
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

  /**
   * The pannable skill graph: a tree per track under its header. A link is solid once its parent has a level.
   * The view keeps its pan and zoom across re-renders.
   */
  private tree(): HTMLElement {
    const s = this.world().state;
    const edges = document.createElementNS(SVG, 'svg');
    edges.classList.add('skill-edges');
    edges.setAttribute('width', String(LAYOUT.w));
    edges.setAttribute('height', String(LAYOUT.h));
    // Locked links first, so the solid ones are drawn over the stems they share.
    const links = SKILL_IDS.flatMap((id) => (prerequisite(id) ? [[prerequisite(id)!, id] as const] : []))
      .sort(([a], [b]) => Number(lvl(s, a) > 0) - Number(lvl(s, b) > 0));
    for (const [parent, child] of links) {
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', edgePath(LAYOUT.nodes[parent], LAYOUT.nodes[child]));
      if (lvl(s, parent)) path.classList.add('linked');
      edges.append(path);
    }
    const heads = TRACK_IDS.map((track) => {
      const ids: readonly SkillId[] = TRACKS[track];
      const { name, icon: ico } = TRACK_TEXT[track];
      const { x, y, w } = LAYOUT.tracks[track];
      const h = document.createElement('h3');
      h.className = 'skill-track-head';
      Object.assign(h.style, { left: `${x}px`, top: `${y}px`, width: `${w}px` });
      h.innerHTML = `${icon(ico)}<span>${name}</span><small>${ids.filter((id) => lvl(s, id)).length}/${ids.length}</small>`;
      return h;
    });
    const nodes = TREE_ORDER.map((id) => {
      const b = this.node(id);
      const { x, y } = LAYOUT.nodes[id];
      Object.assign(b.style, { left: `${x - NODE.w / 2}px`, top: `${y}px` });
      return b;
    });
    this.graph.layer.replaceChildren(edges, ...heads, ...nodes);
    return this.graph.viewport;
  }

  private node(id: SkillId): HTMLButtonElement {
    const s = this.world().state;
    const level = lvl(s, id);
    const status = skillStatus(s, id);
    const text = SKILL_TEXT[id];
    const offered = s.cards.includes(id);
    const b = document.createElement('button');
    b.className = `skill-node ${status.toLowerCase()}${isMastery(id) ? ' is-mastery' : ''}${offered ? ' is-offered' : ''}${this.selected === id ? ' is-selected' : ''}`;
    b.dataset.skill = id;
    b.dataset.focus = id;
    b.setAttribute('aria-pressed', String(this.selected === id));
    if (this.selected === id) b.setAttribute('aria-describedby', this.tip.id);
    b.setAttribute('aria-label', `${text.name}, level ${level} of ${SKILLS[id].max}, ${status}${offered ? ', offered by relic, press to learn' : ''}`);
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
    const detail = document.createElement('section');
    detail.className = 'skill-detail frame parchment';
    detail.dataset.detail = id;
    detail.setAttribute('aria-label', `${text.name} details`);
    detail.innerHTML = `<div class="skill-detail-heading">${skillIcon(id)}<div><p class="skill-eyebrow">${TRACK_TEXT[trackOf(id)].name} · ${status}</p><h3>${text.name}</h3></div></div><p>${text.desc}.</p><dl><dt>Current bonus · level ${level}</dt><dd>${skillBonus(id, level)}</dd>${level < max ? `<dt>Next level · ${level + 1}/${max}</dt><dd>${skillBonus(id, level + 1)}</dd>` : '<dt>Fully learned</dt><dd>You have every level of this skill.</dd>'}</dl>`;
    if (req) {
      const b = document.createElement('button');
      b.className = 'skill-requirement parchment';
      b.dataset.focus = 'prerequisite';
      b.textContent = `${lvl(s, req) ? 'Requires (met):' : 'Requires:'} ${SKILL_TEXT[req].name} · level 1 ↗`;
      b.onclick = () => {
        this.open('all');
        this.selected = req;
        this.render();
        const node = this.graph.layer.querySelector<HTMLElement>(`[data-skill="${req}"]`);
        if (node) this.graph.reveal(node);
      };
      detail.append(b);
    }
    const unlocks = unlockedBy(id);
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
        ? `${lockReason(s, id)} to unlock this skill for future relic choices.`
        : 'Collect relics to receive skill choices.';
      detail.append(p);
    }
    return detail;
  }
}

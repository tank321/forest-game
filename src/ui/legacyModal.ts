import { CONFIG } from '../config';
import { prestige } from '../core/commands';
import { availablePerks, canPrestige, LEGACY, legacyRequirement, perk, PERK_IDS, skillLevels, type PerkId } from '../core/legacy';
import type { GameState } from '../core/types';
import type { World } from '../core/world';
import { icon, LEGACY_TEXT } from './text';

type PerkStatus = 'Owned' | 'Available' | 'Locked';

/** Perks that sit on the trunk and span both branch columns. */
const TRUNK: ReadonlySet<PerkId> = new Set(['masterHarvest', 'swiftAndStrong', 'relicHunters', 'legacyX2']);
const NODE_CLASS: Record<PerkStatus, string> = { Owned: 'maxed', Available: 'unlearned', Locked: 'locked' };

function perkStatus(s: GameState, id: PerkId): PerkStatus {
  if (availablePerks(s).includes(id)) return 'Available';
  return perk(s, id) ? 'Owned' : 'Locked';
}

/** Legacy perk tree and the rebuild (prestige) action. Rebuilding takes two clicks, since it wipes the world. */
export class LegacyModal {
  private key = '';
  private selected: PerkId | null = null;
  private armed: PerkId | null = null;
  private armTimer = 0;
  private gallery: HTMLElement;
  private detailSlot: HTMLElement;
  private summary: HTMLElement;
  private mobile = matchMedia('(max-width: 640px)');

  constructor(
    private dlg: HTMLDialogElement,
    private btn: HTMLButtonElement,
    private world: () => World,
    private rebuild: (next: GameState) => void,
  ) {
    const el = <T extends HTMLElement>(selector: string) => dlg.querySelector<T>(selector)!;
    this.gallery = el('.skill-gallery');
    this.detailSlot = el('.skill-detail-slot');
    this.summary = el('.skill-summary');
    el<HTMLButtonElement>('.close').onclick = () => dlg.close();
    dlg.addEventListener('close', () => {
      btn.setAttribute('aria-expanded', 'false');
      this.disarm();
    });
    btn.onclick = () => this.open();
    this.gallery.onclick = (event) => {
      const id = (event.target as HTMLElement).closest<HTMLElement>('[data-perk]')?.dataset.perk as PerkId | undefined;
      if (!id) return;
      this.selected = id;
      this.disarm();
      this.render();
    };
    this.mobile.addEventListener('change', () => { if (dlg.open) this.render(); });
  }

  open(): void {
    this.render();
    if (!this.dlg.open) this.dlg.showModal();
    this.btn.setAttribute('aria-expanded', 'true');
  }

  update(): void {
    const s = this.world().state;
    const ready = canPrestige(s);
    if (this.btn.classList.contains('gold') !== ready) this.btn.classList.toggle('gold', ready);
    if (!this.dlg.open) return;
    const key = JSON.stringify([skillLevels(s), s.legacy]);
    if (key !== this.key) {
      this.key = key;
      this.render();
    }
  }

  private disarm(): void {
    this.armed = null;
    window.clearTimeout(this.armTimer);
  }

  /** First click arms the rebuild; a second click within a few seconds starts the new run. */
  private choose(id: PerkId): void {
    if (this.armed !== id) {
      this.disarm();
      this.armed = id;
      this.armTimer = window.setTimeout(() => {
        this.armed = null;
        if (this.dlg.open) this.render();
      }, 4000);
      this.render();
      return;
    }
    const next = prestige(this.world(), id);
    if (next) this.rebuild(next);
  }

  private render(): void {
    const s = this.world().state;
    const levels = skillLevels(s);
    const need = legacyRequirement(s);
    this.summary.textContent = canPrestige(s)
      ? `Run ${s.legacy.runs + 1} · ready to rebuild (${levels} of ${need} skill levels)`
      : `Run ${s.legacy.runs + 1} · ${levels} of ${need} skill levels to rebuild`;
    if (!this.selected) this.selected = availablePerks(s)[0] ?? PERK_IDS[0];
    const tree = document.createElement('div');
    tree.className = 'legacy-tree';
    tree.append(...PERK_IDS.map((id) => this.node(s, id)));
    this.gallery.replaceChildren(tree);
    this.detailSlot.replaceChildren();
    (this.mobile.matches ? this.gallery : this.detailSlot).append(this.details(s, this.selected));
  }

  private node(s: GameState, id: PerkId): HTMLButtonElement {
    const status = perkStatus(s, id);
    const text = LEGACY_TEXT[id];
    const level = perk(s, id);
    const b = document.createElement('button');
    const ready = status === 'Available' && canPrestige(s);
    b.className = `skill-node ${NODE_CLASS[status]}${TRUNK.has(id) ? ' wide' : ''}${ready ? ' is-offered' : ''}${this.selected === id ? ' is-selected' : ''}`;
    b.dataset.perk = id;
    b.setAttribute('aria-pressed', String(this.selected === id));
    b.setAttribute('aria-label', `${text.name}, ${status}`);
    const name = LEGACY[id].repeat && level ? `${text.name} (${level})` : text.name;
    b.innerHTML = `<span class="skill-node-tile frame">${icon(text.icon)}</span><b>${name}</b>`;
    return b;
  }

  private details(s: GameState, id: PerkId): HTMLElement {
    const text = LEGACY_TEXT[id];
    const status = perkStatus(s, id);
    const detail = document.createElement('section');
    detail.className = 'skill-detail frame parchment';
    detail.setAttribute('aria-label', `${text.name} details`);
    const requires = LEGACY[id].requires.map((r) => LEGACY_TEXT[r].name).join(' and ');
    detail.innerHTML = `<div class="skill-detail-heading">${icon(text.icon)}<div><p class="skill-eyebrow">Legacy · ${status}</p><h3>${text.name}</h3></div></div><p>${text.desc}. Permanent.</p>`;
    const hint = document.createElement('p');
    hint.className = 'skill-hint';
    if (status === 'Available' && canPrestige(s)) {
      const b = document.createElement('button');
      b.className = 'skill-choose gold';
      b.textContent = this.armed === id ? 'Click again: this world will be wiped' : `Rebuild with ${text.name}`;
      b.onclick = () => this.choose(id);
      detail.append(b);
    } else if (status === 'Available') {
      hint.textContent = `Learn ${legacyRequirement(s) - skillLevels(s)} more skill levels to rebuild with this perk.`;
    } else if (status === 'Locked') {
      hint.textContent = `Take ${requires} first.`;
    } else {
      hint.textContent = 'Owned. Active in every run.';
    }
    hint.textContent += `${hint.textContent ? ' ' : ''}Rebuilding starts a new map: buildings, villagers, resources and skills are lost. Legacy perks are kept, and every rebuild adds ${CONFIG.legacy.roadsPerRun} starting roads.`;
    detail.append(hint);
    return detail;
  }
}

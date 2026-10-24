import { BUILDINGS, HUB_KINDS, isUnlocked, NEEDS, type BuildingDef, type BuildingKind } from '../core/buildings';
import { isMastery, trackOf } from '../core/skills';
import type { World } from '../core/world';
import { BUILDING_TEXT, icon, SKILL_TEXT, TRACK_TEXT } from './text';

const KINDS = Object.keys(BUILDINGS) as BuildingKind[];

/** Short facts read from the building's definition, so they stay in step with the game. */
function facts(kind: BuildingKind): string[] {
  const d: BuildingDef = BUILDINGS[kind];
  const out = [`${d.w}×${d.h} tiles`];
  if (d.workers) out.push(`${d.workers} worker${d.workers > 1 ? 's' : ''}`);
  if (d.dropoff.length) out.push(`Drop-off ${d.dropoff.map((r) => icon(r)).join('')}`);
  if (HUB_KINDS.includes(kind)) out.push('Roads start here');
  else if (!d.road) out.push('No road needed');
  const needs = NEEDS[kind];
  if (needs) out.push(`Needs a ${BUILDING_TEXT[needs].name}`);
  if (d.limit) out.push(`Only ${d.limit}`);
  return out;
}

/** Reference list of every building and what it does. Locked ones are shown dimmed with the skill that unlocks them. */
export class GuideModal {
  private list: HTMLElement;
  private summary: HTMLElement;

  constructor(
    private dlg: HTMLDialogElement,
    private btn: HTMLButtonElement,
    private world: () => World,
  ) {
    this.list = dlg.querySelector('.guide-list')!;
    this.summary = dlg.querySelector('.skill-summary')!;
    dlg.querySelector<HTMLButtonElement>('.close')!.onclick = () => dlg.close();
    dlg.addEventListener('close', () => btn.setAttribute('aria-expanded', 'false'));
    btn.onclick = () => this.open();
  }

  open(): void {
    this.render();
    if (!this.dlg.open) this.dlg.showModal();
    this.btn.setAttribute('aria-expanded', 'true');
  }

  private render(): void {
    const s = this.world().state;
    const open = KINDS.filter((k) => isUnlocked(s, k)).length;
    this.summary.textContent = `${open} of ${KINDS.length} unlocked`;
    this.list.replaceChildren(
      ...KINDS.map((kind) => {
        const text = BUILDING_TEXT[kind];
        const skill = BUILDINGS[kind].unlock;
        const locked = skill && !isUnlocked(s, kind);
        const card = document.createElement('li');
        card.className = `guide-card frame parchment${locked ? ' locked' : ''}`;
        const lock = locked
          ? `<p class="guide-lock">Locked · learn <b>${SKILL_TEXT[skill].name}</b> (${TRACK_TEXT[trackOf(skill)].name}${isMastery(skill) ? ' mastery' : ''})</p>`
          : '';
        const chips = facts(kind).map((f) => `<span>${f}</span>`).join('');
        card.innerHTML = `<i class="thumb thumb-${kind}"></i><div><h3>${text.name}</h3><p>${text.desc}</p><p class="guide-facts">${chips}</p>${lock}</div>`;
        return card;
      }),
    );
  }
}

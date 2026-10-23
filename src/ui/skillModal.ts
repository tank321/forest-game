import { pickSkill } from '../core/commands';
import { lvl, SKILLS } from '../core/skills';
import type { World } from '../core/world';
import type { UiState } from './state';
import { icon, SKILL_TEXT } from './text';

/**
 * Relic reward popup: the skill cards on offer. The game keeps running behind it. Closing it
 * defers the pick (the sidebar's reopen button shows instead); a newly collected relic reopens it.
 */
export class SkillModal {
  private key = '';
  private pending = 0;
  private cards: HTMLElement;
  private sub: HTMLElement;
  private reopenLabel: HTMLElement;

  constructor(
    private dlg: HTMLDialogElement,
    private reopen: HTMLButtonElement,
    private world: () => World,
    private ui: UiState,
  ) {
    this.cards = dlg.querySelector('.cards')!;
    this.sub = dlg.querySelector('.sub')!;
    this.reopenLabel = reopen.querySelector('span')!;
    const hide = () => (ui.cardsHidden = true);
    dlg.addEventListener('cancel', hide); // Esc
    dlg.querySelector<HTMLButtonElement>('.close')!.onclick = hide;
    dlg.querySelector<HTMLButtonElement>('.view')!.onclick = () => {
      hide();
      ui.selected = ui.placing = null;
      ui.view = 'skills';
    };
    reopen.onclick = () => (ui.cardsHidden = false);
  }

  update(): void {
    const w = this.world();
    const s = w.state;
    if (s.picksPending > this.pending) this.ui.cardsHidden = false;
    this.pending = s.picksPending;
    const offer = s.cards.length > 0;
    const open = offer && !this.ui.cardsHidden;
    this.reopen.hidden = !offer || open;

    const key = JSON.stringify([s.cards, s.cards.map((id) => lvl(s, id)), s.picksPending]);
    if (key !== this.key) {
      this.key = key;
      const more = s.picksPending - 1;
      this.sub.textContent = more > 0 ? `Relic found! ${more} more pick${more > 1 ? 's' : ''} after this.` : 'Relic found!';
      this.reopenLabel.textContent = `Pick skill (${s.picksPending})`;
      this.cards.replaceChildren(
        ...s.cards.map((id) => {
          const t = SKILL_TEXT[id];
          const b = document.createElement('button');
          b.className = 'card';
          b.innerHTML = `${icon(t.icon)}<span><b>${t.name}</b><span class="lv">Lv ${lvl(s, id) + 1}/${SKILLS[id].max}</span><span class="desc">${t.desc}</span></span>`;
          b.onclick = () => pickSkill(w, id);
          return b;
        }),
      );
    }
    if (open && !this.dlg.open) this.dlg.showModal();
    else if (!open && this.dlg.open) this.dlg.close();
  }
}

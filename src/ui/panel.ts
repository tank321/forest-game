import { BUILDINGS, type BuildingKind } from '../core/buildings';
import { pickSkill } from '../core/commands';
import { buildingCost, canAfford } from '../core/economy';
import { lvl, SKILL_IDS, SKILLS, type SkillDef, type SkillId } from '../core/skills';
import type { World } from '../core/world';
import { ACTIONS, type Action } from './actions';
import type { UiState } from './state';
import { BUILDING_TEXT, fmtCost, SKILL_TEXT } from './text';

const BUILDABLE = (Object.keys(BUILDINGS) as BuildingKind[]).filter((k) => BUILDINGS[k].buildable);

/** Bottom panel: placement prompt, selected building's actions, or the build menu. */
export class Panel {
  private key = '';

  constructor(
    private el: HTMLElement,
    private world: () => World,
    private ui: UiState,
  ) {}

  update(): void {
    const { title, sub, actions, rows = [], cls = '' } = this.view();
    const key = JSON.stringify([title, sub, cls, rows, actions.map((a) => [a.label, a.cost, a.enabled])]);
    if (key === this.key) return;
    this.key = key;
    this.el.className = cls;
    const list = rows.length ? `<ul>${rows.map((r) => `<li>${r}</li>`).join('')}</ul>` : '';
    this.el.innerHTML = `<h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${list}<div class="actions"></div>`;
    const box = this.el.querySelector('.actions')!;
    for (const a of actions) {
      const b = document.createElement('button');
      b.innerHTML = a.cost ? `${a.label}<span class="cost">${fmtCost(a.cost)}</span>` : a.label;
      b.disabled = !a.enabled;
      b.onclick = a.run;
      box.append(b);
    }
  }

  private view(): { title: string; sub: string; actions: Action[]; rows?: string[]; cls?: string } {
    const w = this.world();
    const s = w.state;
    const { ui } = this;
    if (s.cards.length) {
      return {
        title: 'Relic found! Choose a skill',
        sub: s.picksPending > 1 ? `${s.picksPending} picks waiting` : '',
        cls: 'cards',
        actions: s.cards.map((id) => ({
          label: `${SKILL_TEXT[id].name} · Lv ${lvl(s, id) + 1}/${SKILLS[id].max} — ${SKILL_TEXT[id].desc}`,
          cost: null,
          enabled: true,
          run: () => pickSkill(w, id),
        })),
      };
    }
    if (ui.placing) {
      return {
        title: `Place ${BUILDING_TEXT[ui.placing].name}`,
        sub: 'Tap your territory. Green = valid.',
        actions: [{ label: 'Cancel', cost: null, enabled: true, run: () => (ui.placing = null) }],
      };
    }
    if (ui.selected) {
      const k = ui.selected.kind;
      const actions = ACTIONS[k]?.(w) ?? [];
      actions.push({ label: 'Close', cost: null, enabled: true, run: () => (ui.selected = null) });
      return { title: BUILDING_TEXT[k].name, sub: BUILDING_TEXT[k].desc, actions };
    }
    if (ui.view === 'skills') {
      return {
        title: 'Skills',
        sub: `Relics found: ${s.relicsSpawned - s.relics.length}. Each relic offers 3 skills.`,
        rows: SKILL_IDS.map((id) => {
          const req = (SKILLS[id] as SkillDef).requires as SkillId | undefined;
          const locked = req && !lvl(s, req) ? ` <i>(needs ${SKILL_TEXT[req].name})</i>` : '';
          return `<b>${SKILL_TEXT[id].name}</b> ${lvl(s, id)}/${SKILLS[id].max} · ${SKILL_TEXT[id].desc}${locked}`;
        }),
        actions: [{ label: 'Close', cost: null, enabled: true, run: () => (ui.view = 'build') }],
      };
    }
    return {
      title: 'Build',
      sub: 'Tap a building to select it.',
      actions: BUILDABLE.map((k) => {
        const cost = buildingCost(s, k);
        return {
          label: BUILDING_TEXT[k].name,
          cost,
          enabled: canAfford(s, cost),
          run: () => (ui.placing = k),
        };
      }),
    };
  }
}

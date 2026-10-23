import { BUILDINGS, type BuildingKind } from '../core/buildings';
import { removeBuilding } from '../core/commands';
import { buildingCost, buildingRefund, canAfford } from '../core/economy';
import type { World } from '../core/world';
import { ACTIONS, INFO, type Action } from './actions';
import type { UiState } from './state';
import { BUILDING_TEXT, costHtml } from './text';

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
    const { title, sub, status, actions } = this.view();
    const have = this.world().state.resources;
    const html = actions.map((a) => {
      const thumb = a.thumb ? `<i class="thumb thumb-${a.thumb}"></i>` : '';
      const cost = a.cost && !a.upgrade ? `<span class="cost">${costHtml(a.cost, have)}</span>` : '';
      const refund = a.refund ? `<span class="refund">Refund: ${costHtml(a.refund, { ...have, ...a.refund }) || 'none'}</span>` : '';
      return `${thumb}<span class="label">${a.label}${cost}${refund}</span>`;
    });
    const key = JSON.stringify([this.ui.selected?.id, this.ui.moving?.id, this.ui.removing, title, sub, status, html,
      actions.map((a) => [a.enabled, a.secondary, a.danger, a.upgrade, a.hint]),
      actions.map((a) => a.upgrade && a.cost ? costHtml(a.cost, have) : '')]);
    if (key === this.key) return;
    this.key = key;
    this.el.innerHTML = `<h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${status ? `<p class="building-status">${status}</p>` : ''}<div class="actions"></div><div class="building-controls"></div>`;
    const box = this.el.querySelector('.actions')!;
    actions.forEach((a, i) => {
      const b = document.createElement('button');
      b.innerHTML = html[i];
      if (a.thumb) b.className = 'parchment';
      if (a.danger) b.classList.add('danger');
      b.disabled = !a.enabled;
      b.onclick = a.run;
      if (a.upgrade) {
        const u = a.upgrade;
        const card = document.createElement('section');
        card.className = 'upgrade-card frame parchment';
        card.setAttribute('aria-label', u.title);
        card.innerHTML = `<div class="upgrade-heading"><h3>${u.title}</h3><span class="upgrade-level">Level ${u.level} of ${u.max}</span></div><table><caption>${u.scope}</caption><thead><tr><th scope="col">Stat</th><th scope="col">Current</th><th scope="col">Next</th></tr></thead><tbody>${u.rows.map((row) => `<tr><th scope="row">${row.label}</th><td>${row.current}</td><td class="upgrade-next">${row.next ?? '—'}</td></tr>`).join('')}</tbody></table>${a.cost ? `<div class="upgrade-cost"><span>Cost</span><span class="cost">${costHtml(a.cost, have)}</span></div>` : '<p class="upgrade-complete">All levels unlocked.</p>'}`;
        b.classList.add('gold');
        card.append(b);
        box.append(card);
      } else if (a.hint) {
        const item = document.createElement('div');
        item.className = 'action-with-hint';
        const hint = document.createElement('p');
        hint.textContent = a.hint;
        item.append(b, hint);
        box.append(item);
      } else (a.secondary ? this.el.querySelector('.building-controls')! : box).append(b);
    });
  }

  private view(): { title: string; sub: string; status?: string; actions: Action[] } {
    const w = this.world();
    const s = w.state;
    const { ui } = this;
    if (ui.moving) {
      return {
        title: `Move ${BUILDING_TEXT[ui.moving.kind].name}`,
        sub: 'Tap clear land for the new location. Green = valid. Moving is free; the original stays until placed.',
        actions: [{ label: 'Cancel move', cost: null, enabled: true, run: () => (ui.moving = null) }],
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
      const b = ui.selected;
      const k = b.kind;
      if (ui.removing === b.id && k !== 'townCenter') {
        const consequence = k === 'house' ? 'Population capacity decreases; existing villagers stay.'
          : BUILDINGS[k].workers ? 'Workers deliver any carried resources, then return to lumberjacking.' : '';
        return {
          title: `Remove ${BUILDING_TEXT[k].name}?`,
          sub: `This permanently removes the building. You get 50% of its original construction materials back, rounded down. Upgrades stay unlocked. ${consequence}`,
          actions: [
            { label: 'Remove permanently', cost: null, refund: buildingRefund(b), danger: true, enabled: true, run: () => {
              if (removeBuilding(w, b.id)) { ui.selected = null; ui.removing = null; }
            } },
            { label: 'Keep building', cost: null, enabled: true, run: () => (ui.removing = null) },
          ],
        };
      }
      const actions = ACTIONS[k]?.(w, ui.selected) ?? [];
      if (k !== 'townCenter') {
        actions.push(
          { label: 'Move', cost: null, secondary: true, enabled: true, run: () => { ui.moving = b; ui.removing = null; } },
          { label: 'Remove…', cost: null, secondary: true, danger: true, enabled: true, run: () => (ui.removing = b.id) },
        );
      }
      actions.push({ label: 'Close', cost: null, secondary: true, enabled: true, run: () => { ui.selected = null; ui.removing = null; } });
      const info = INFO[k]?.(w, ui.selected);
      return { title: BUILDING_TEXT[k].name, sub: BUILDING_TEXT[k].desc, status: info, actions };
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
          thumb: k,
        };
      }),
    };
  }
}

import { CONFIG } from '../config';
import { BUILDINGS, buildingById, isUnlocked, type BuildingKind } from '../core/buildings';
import { removeBuilding, removeRoad } from '../core/commands';
import { buildingCost, buildingRefund, canAfford } from '../core/economy';
import { linkedBuildings, roadNetwork, roadsBuilt, roadStock } from '../core/roads';
import { Tile } from '../core/types';
import type { World } from '../core/world';
import { ACTIONS, INFO, tallyHtml, type Action } from './actions';
import { MarketView } from './market';
import type { UiState } from './state';
import { BUILDING_TEXT, costHtml } from './text';

const BUILDABLE = (Object.keys(BUILDINGS) as BuildingKind[]).filter((k) => BUILDINGS[k].buildable);

/** Bottom panel: placement prompt, selected building's actions, or the build menu. */
export class Panel {
  private key = '';
  private market: MarketView;

  constructor(
    private el: HTMLElement,
    private world: () => World,
    private ui: UiState,
  ) {
    this.market = new MarketView(world, ui);
  }

  update(): void {
    const { title, thumb, sub, status, tally, actions, custom } = this.view();
    custom?.update(); // updates itself in place, so it stays out of the change key
    const have = this.world().state.resources;
    const html = actions.map((a) => {
      const cost = a.cost && !a.upgrade ? `<span class="cost">${costHtml(a.cost, have)}</span>` : '';
      // Build card: icon and name share a fixed top row, costs run full width below.
      if (a.thumb) return `<i class="thumb thumb-${a.thumb}"></i><span class="name">${a.label}</span>${cost}`;
      const lost = `${Math.round(100 * (1 - CONFIG.economy.buildingRefund))}% lost`;
      const refund = a.refund ? `<span class="refund">Refund: ${costHtml(a.refund, { ...have, ...a.refund }) || 'none'} · ${lost}</span>` : '';
      return `<span class="label">${a.label}${cost}${refund}</span>`;
    });
    const key = JSON.stringify([this.ui.selected?.id, this.ui.road, this.ui.moving?.id, title, thumb, sub, status, html, !!custom, tally !== undefined,
      actions.map((a) => [a.enabled, a.secondary, a.danger, a.upgrade, a.hint]),
      actions.map((a) => a.upgrade && a.cost ? costHtml(a.cost, have) : '')]);
    if (key === this.key) {
      // The counter ticks up constantly, so it is patched in place rather than rebuilding the buttons.
      const counter = this.el.querySelector('.building-tally');
      if (counter && tally !== undefined && counter.innerHTML !== tally) counter.innerHTML = tally;
      return;
    }
    this.key = key;
    const heading = thumb ? `<h2 class="with-thumb"><i class="thumb thumb-${thumb}"></i>${title}</h2>` : `<h2>${title}</h2>`;
    this.el.innerHTML = `${heading}${sub ? `<p class="sub">${sub}</p>` : ''}${status ? `<p class="building-status">${status}</p>` : ''}${tally !== undefined ? `<p class="building-tally">${tally}</p>` : ''}<div class="actions"></div><div class="building-controls"></div>`;
    const box = this.el.querySelector('.actions')!;
    box.classList.toggle('build-grid', actions.length > 0 && actions.every((a) => a.thumb));
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
    if (custom) box.replaceWith(custom.el);
  }

  private view(): { title: string; thumb?: BuildingKind | 'road'; sub: string; status?: string; tally?: string; actions: Action[]; custom?: MarketView } {
    const w = this.world();
    const s = w.state;
    const { ui } = this;
    if (ui.moving) {
      return {
        title: `Move ${BUILDING_TEXT[ui.moving.kind].name}`,
        sub: 'Tap clear land for the new location. Green = valid; yellow = valid but needs a road to the Town Center. Moving is free; the original stays until placed.',
        actions: [{ label: 'Cancel move', cost: null, enabled: true, run: () => (ui.moving = null) }],
      };
    }
    if (ui.paving) {
      const built = roadsBuilt(s);
      return {
        title: 'Roads',
        sub: `Tap or drag over cleared land to lay road; start on a road (or right-click) to lift it. Buildings work only where they touch the Town Center or a road joined to it. ${built} of ${roadStock(s)} roads laid; each house adds ${CONFIG.roads.perHouse}.`,
        actions: [{ label: 'Done', cost: null, enabled: true, run: () => (ui.paving = false) }],
      };
    }
    if (ui.placing) {
      return {
        title: `Place ${BUILDING_TEXT[ui.placing].name}`,
        sub: 'Tap your territory. Green = valid; yellow = valid but needs a road to the Town Center.',
        actions: [{ label: 'Cancel', cost: null, enabled: true, run: () => (ui.placing = null) }],
      };
    }
    if (ui.road !== null && s.tiles[ui.road] !== Tile.Road) ui.road = null; // lifted while selected
    if (ui.road !== null && ui.movingRoad) {
      return {
        title: 'Move Road',
        sub: 'Tap cleared land for the new location.',
        actions: [{ label: 'Cancel move', cost: null, enabled: true, run: () => (ui.movingRoad = false) }],
      };
    }
    if (ui.road !== null) {
      const i = ui.road;
      return {
        title: 'Road',
        thumb: 'road',
        sub: 'Buildings work only where they touch the Town Center or a road joined to it.',
        status: roadNetwork(s)[i] ? 'Connected to the Town Center.' : 'Not connected to the Town Center.',
        actions: [
          { label: 'Move', cost: null, enabled: true, run: () => (ui.movingRoad = true) },
          { label: 'Sell (back to the road stock)', cost: null, danger: true, enabled: true, run: () => {
            if (removeRoad(w, i)) ui.road = null;
          } },
          { label: 'Close', cost: null, secondary: true, enabled: true, run: () => (ui.road = null) },
        ],
      };
    }
    if (ui.selected) {
      const b = ui.selected;
      const k = b.kind;
      const actions = ACTIONS[k]?.(w, ui.selected) ?? [];
      if (k !== 'townCenter') {
        actions.push(
          { label: 'Move', cost: null, secondary: true, enabled: true, run: () => (ui.moving = b) },
          { label: 'Remove', cost: null, refund: buildingRefund(b), secondary: true, danger: true, enabled: true, run: () => {
            if (removeBuilding(w, b.id)) ui.selected = null;
          } },
        );
      }
      actions.push({ label: 'Close', cost: null, secondary: true, enabled: true, run: () => (ui.selected = null) });
      const isolated = BUILDINGS[k].road && !linkedBuildings(s).has(b.id);
      const info = isolated ? 'Isolated: not connected to the Town Center, so it does nothing. Lay a road from it to the Town Center.' : INFO[k]?.(w, ui.selected);
      const custom = k === 'market' ? this.market : undefined;
      return { title: BUILDING_TEXT[k].name, thumb: k, sub: BUILDING_TEXT[k].desc, status: info, tally: tallyHtml(buildingById(s, b.id) ?? b), actions, custom };
    }
    return {
      title: 'Build',
      sub: 'Tap a building to select it.',
      // Kinds still locked behind a skill stay out of the menu.
      actions: [
        { label: `Road (${Math.max(0, roadStock(s) - roadsBuilt(s))} left)`, cost: null, enabled: true, run: () => (ui.paving = true), thumb: 'road' as const },
        ...BUILDABLE.filter((k) => isUnlocked(s, k)).map((k) => {
          const cost = buildingCost(s, k);
          return {
            label: BUILDING_TEXT[k].name,
            cost,
            enabled: canAfford(s, cost),
            run: () => (ui.placing = k),
            thumb: k,
          };
        }),
      ],
    };
  }
}

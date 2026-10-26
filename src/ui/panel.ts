import { CONFIG } from '../config';
import { atLimit, BUILDINGS, buildingById, isUnlocked, type BuildingKind } from '../core/buildings';
import { removeBuilding, removeDecor, removeRoad } from '../core/commands';
import { DECOR, DECOR_KINDS, isDecorUnlocked } from '../core/decor';
import { buildingCost, buildingRefund, canAfford } from '../core/economy';
import { linkedBuildings, roadNetwork, roadsBuilt, roadStock } from '../core/roads';
import { lvl } from '../core/skills';
import { Tile, type Cost, type ResourceKey, type Resources } from '../core/types';
import type { World } from '../core/world';
import { ACTIONS, INFO, tallyHtml, type Action, type Thumb } from './actions';
import { MarketView } from './market';
import { readPref, writePref } from './prefs';
import { paints } from './placement';
import type { UiState } from './state';
import { achievementName, BUILDING_TEXT, costHtml, DECOR_TEXT, fmt } from './text';

const BUILDABLE = (Object.keys(BUILDINGS) as BuildingKind[]).filter((k) => BUILDINGS[k].buildable);
const REMOVE_MS = 3000; // a second tap on Remove within this long removes the building

/** An upgrade's stat change, the unit said once: "57 wood" and "65 wood" read "57 → 65 wood". */
function change(current: string, next: string | null): string {
  if (next === null) return current;
  const [a, ...unitA] = current.split(' ');
  const [b, ...unitB] = next.split(' ');
  const unit = unitA.join(' ');
  return unit === unitB.join(' ') ? `${a} → <b class="upgrade-next">${b}</b>${unit ? ` ${unit}` : ''}` : `${current} → <b class="upgrade-next">${next}</b>`;
}

/** How far the stock goes toward a cost, 0–1, by its scarcest resource. */
const progress = (c: Cost, have: Resources) =>
  Math.min(1, ...(Object.entries(c) as [ResourceKey, number][]).map(([k, v]) => (v > 0 ? have[k] / v : 1)));
const costText = (c: Cost) => (Object.entries(c) as [ResourceKey, number][]).filter(([, v]) => v > 0).map(([k, v]) => `${fmt(v)} ${k}`).join(', ');

/** Bottom panel: placement prompt, selected building's actions, or the build menu. */
export class Panel {
  private key = '';
  private market: MarketView;
  private coarse = matchMedia('(pointer: coarse)'); // touch screens aim a placement before placing it
  private narrow = matchMedia('(max-width: 899px)'); // the phone layout (style.css): a compact panel
  private removing: { id: number; until: number } | null = null; // Remove tapped once, awaiting the second tap
  private scrolls = new Map<string, number>(); // how far each card row (by panel title) was swiped, kept across other panels
  private title = '';
  private full = readPref(CONFIG.buildMenu.key) === 'full'; // on a phone the build menu shows named cards, not the hotbar

  constructor(
    private el: HTMLElement,
    private world: () => World,
    private ui: UiState,
  ) {
    this.market = new MarketView(world, ui);
  }

  update(): void {
    const { title, thumb, sub, status, tally, actions, custom, foldable } = this.view();
    custom?.update(); // updates itself in place, so it stays out of the change key
    const have = this.world().state.resources;
    const narrow = this.narrow.matches;
    const compact = !!foldable && narrow && !this.full; // a phone's build menu as one row of icon tiles
    const html = actions.map((a) => {
      // Hotbar tile: just the icon, a bar filling toward its cost (patched in place below), and a badge.
      if (a.thumb && compact) return `<i class="thumb thumb-${a.thumb}"></i><span class="meter"><i></i></span>${a.badge ? `<span class="badge">${a.badge}</span>` : ''}`;
      const cost = a.locked ? `<span class="cost">${a.locked}</span>` : a.cost && !a.upgrade ? `<span class="cost">${costHtml(a.cost, have)}</span>` : '';
      // Build card: icon and name share a fixed top row, costs run full width below.
      if (a.thumb) return `<i class="thumb thumb-${a.thumb}"></i><span class="name">${a.label}</span>${cost}`;
      const lost = `${Math.round(100 * (1 - CONFIG.economy.buildingRefund))}% lost`;
      const refund = a.refund ? `<span class="refund">Refund: ${costHtml(a.refund, { ...have, ...a.refund }) || 'none'} · ${lost}</span>` : '';
      return `<span class="label">${a.label}${cost}${refund}</span>`;
    });
    const key = JSON.stringify([this.ui.selected?.id, this.ui.road, this.ui.moving?.id, this.ui.decorSel, title, thumb, sub, status, html, !!custom, tally !== undefined, foldable, compact, narrow,
      actions.map((a) => [a.enabled, a.secondary, a.danger, a.upgrade, a.hint]),
      actions.map((a) => a.upgrade && a.cost ? costHtml(a.cost, have) : compact && a.cost ? costText(a.cost) : '')]);
    if (key === this.key) {
      // The counter ticks up constantly, so it is patched in place rather than rebuilding the buttons.
      const counter = this.el.querySelector('.building-tally');
      if (counter && tally !== undefined && counter.innerHTML !== tally) counter.innerHTML = tally;
      if (compact) this.fillMeters(actions, have);
      return;
    }
    this.key = key;
    const grid = this.el.querySelector('.build-grid');
    if (grid) this.scrolls.set(this.title, grid.scrollLeft); // a swiped card row stays put when redrawn or come back to
    this.title = title;
    this.el.classList.toggle('compact', compact);
    // The fold button only shows on narrow screens (style.css): it switches the build menu between the hotbar and named cards.
    const fold = foldable ? `<button class="fold" aria-expanded="${!compact}" aria-label="${compact ? 'Show names and costs' : 'Show the compact build bar'}"><i class="fold-arrow"></i></button>` : '';
    const heading = compact ? '' : thumb ? `<h2 class="with-thumb"><i class="thumb thumb-${thumb}"></i>${title}${fold}</h2>` : `<h2>${title}${fold}</h2>`;
    // On a phone the status and the tally share one line.
    const info = narrow
      ? (status || tally !== undefined ? `<p class="building-status">${status ?? ''}${tally !== undefined ? `<span class="building-tally">${tally}</span>` : ''}</p>` : '')
      : `${status ? `<p class="building-status">${status}</p>` : ''}${tally !== undefined ? `<p class="building-tally">${tally}</p>` : ''}`;
    this.el.innerHTML = `${heading}${sub ? `<p class="sub">${sub}</p>` : ''}${info}<div class="actions"></div>${compact ? fold : ''}<div class="building-controls"></div>`;
    const foldBtn = this.el.querySelector<HTMLButtonElement>('.fold');
    if (foldBtn) {
      foldBtn.onclick = () => {
        this.full = !this.full;
        writePref(CONFIG.buildMenu.key, this.full ? 'full' : 'compact');
        this.key = ''; // redrawn next frame
      };
    }
    const box = this.el.querySelector('.actions')!;
    const cards = actions.filter((a) => !a.secondary);
    box.classList.toggle('build-grid', cards.length > 0 && cards.every((a) => a.thumb));
    box.classList.toggle('hotbar', compact);
    actions.forEach((a, i) => {
      const b = document.createElement('button');
      b.innerHTML = html[i];
      if (a.thumb) b.className = 'parchment';
      if (a.locked) b.classList.add('locked');
      if (a.danger) b.classList.add('danger');
      b.disabled = !a.enabled;
      if (a.thumb && compact) {
        // A tile is tappable even when it can't be afforded yet: aiming it shows the name and full cost.
        b.disabled = false;
        b.classList.toggle('poor', !a.enabled);
        b.setAttribute('aria-label', a.cost ? `${a.label}: ${costText(a.cost)}` : a.label);
      }
      b.onclick = a.run;
      if (a.upgrade) {
        const u = a.upgrade;
        const card = document.createElement('section');
        card.className = 'upgrade-card frame parchment';
        card.setAttribute('aria-label', u.title);
        b.classList.add('gold');
        if (narrow) {
          // One row: the title, level and stat changes beside an Upgrade button that carries its cost.
          card.classList.add('compact');
          card.innerHTML = `<div class="upgrade-info"><h3>${u.title} <small>${isFinite(u.max) ? `${u.level}/${u.max}` : `Lv ${u.level}`}</small></h3>${u.rows.map((row) => `<p>${row.label} ${change(row.current, row.next)}</p>`).join('')}</div>`;
          b.innerHTML = a.cost ? `<span>Upgrade</span><span class="cost">${costHtml(a.cost, have)}</span>` : 'Max level';
          card.append(b);
          box.append(card);
          return;
        }
        card.innerHTML = `<div class="upgrade-heading"><h3>${u.title}</h3><span class="upgrade-level">Level ${u.level}${isFinite(u.max) ? ` of ${u.max}` : ''}</span></div><table><caption>${u.scope}</caption><thead><tr><th scope="col">Stat</th><th scope="col">Current</th><th scope="col">Next</th></tr></thead><tbody>${u.rows.map((row) => `<tr><th scope="row">${row.label}</th><td>${row.current}</td><td class="upgrade-next">${row.next ?? '—'}</td></tr>`).join('')}</tbody></table>${a.cost ? `<div class="upgrade-cost"><span>Cost</span><span class="cost">${costHtml(a.cost, have)}</span></div>` : '<p class="upgrade-complete">All levels unlocked.</p>'}`;
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
    box.scrollLeft = this.scrolls.get(title) ?? 0;
    if (compact) this.fillMeters(actions, have);
  }

  /** Sets each hotbar tile's bar to how far the stock goes toward its cost, without redrawing the tiles. */
  private fillMeters(actions: Action[], have: Resources): void {
    const tiles = this.el.querySelectorAll<HTMLElement>('.hotbar > button .meter > i');
    actions.filter((a) => a.thumb).forEach((a, i) => {
      const width = `${Math.floor(100 * (a.cost ? progress(a.cost, have) : 1))}%`;
      if (tiles[i] && tiles[i].style.width !== width) tiles[i].style.width = width;
    });
  }

  /** How to choose where a placement goes: tap it with a mouse; on touch, aim the footprint and tap it to confirm. */
  private aim(where: string): string {
    return this.coarse.matches ? `Drag the footprint onto ${where}, then tap it to place it.` : `Tap ${where}.`;
  }

  private view(): { title: string; thumb?: Thumb; sub: string; status?: string; tally?: string; actions: Action[]; custom?: MarketView; foldable?: boolean } {
    const w = this.world();
    const s = w.state;
    const { ui } = this;
    if (ui.moving) {
      return {
        title: `Move ${BUILDING_TEXT[ui.moving.kind].name}`,
        sub: `${this.aim('clear land for the new location')} Green = valid; yellow = valid but needs a road to the Town Center. Moving is free; the original stays until placed.`,
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
    if (ui.placing && this.narrow.matches) {
      // On a phone the build menu's tiles carry no names or costs, so aiming one shows them, and what is still short.
      const kind = ui.placing;
      const cost = buildingCost(s, kind);
      const short = (Object.entries(cost) as [ResourceKey, number][]).filter(([k, v]) => s.resources[k] < v).map(([k]) => k);
      const need = short.length ? `<b class="need">Not enough ${short.join(' or ')} yet.</b> ` : '';
      return {
        title: `Place ${BUILDING_TEXT[kind].name}`,
        thumb: kind,
        sub: `${need}${this.aim('your territory')} Yellow = needs a road. ${BUILDING_TEXT[kind].desc}`,
        status: costHtml(cost, s.resources),
        actions: [{ label: '✕', cost: null, secondary: true, enabled: true, run: () => (ui.placing = null) }],
      };
    }
    if (ui.placing) {
      return {
        title: `Place ${BUILDING_TEXT[ui.placing].name}`,
        sub: `${this.aim('your territory')} Green = valid; yellow = valid but needs a road to the Town Center.`,
        actions: [{ label: 'Cancel', cost: null, enabled: true, run: () => (ui.placing = null) }],
      };
    }
    if (ui.decorSel && !s.decor.includes(ui.decorSel)) {
      ui.decorSel = null; // built over, or lifted, while selected
      ui.movingDecor = false;
    }
    if (ui.decorSel && ui.movingDecor) {
      return {
        title: `Move ${DECOR_TEXT[ui.decorSel.kind].name}`,
        sub: `${this.aim('open ground for the new spot')} Moving is free.`,
        actions: [{ label: 'Cancel move', cost: null, enabled: true, run: () => (ui.movingDecor = false) }],
      };
    }
    if (ui.decor) {
      const kind = ui.decor;
      const how = paints(kind) ? 'Tap or drag over open ground to lay them; start a drag on one to lift it.' : this.aim('open ground');
      return {
        title: `Place ${DECOR_TEXT[kind].name}`,
        thumb: `decor-${kind}`,
        sub: `${how} Each one returns all it cost when removed.`,
        status: `Each: ${costHtml(DECOR[kind].cost, s.resources)}`,
        actions: [{ label: 'Done', cost: null, enabled: true, run: () => (ui.decor = null) }],
      };
    }
    if (ui.road !== null && s.tiles[ui.road] !== Tile.Road) ui.road = null; // lifted while selected
    if (ui.road !== null && ui.movingRoad) {
      return {
        title: 'Move Road',
        sub: this.aim('cleared land for the new location'),
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
      const narrow = this.narrow.matches;
      const actions = ACTIONS[k]?.(w, ui.selected) ?? [];
      // On a phone, Pause and the like join Move and Remove in the header row.
      if (narrow) for (const a of actions) if (a.compact) Object.assign(a, { label: a.compact, hint: undefined, secondary: true });
      if (k !== 'townCenter') {
        // Remove takes a second tap within a few seconds; the first shows the refund.
        const armed = this.removing?.id === b.id && performance.now() < this.removing.until;
        actions.push(
          { label: 'Move', cost: null, secondary: true, enabled: true, run: () => (ui.moving = b) },
          { label: armed ? 'Confirm remove' : 'Remove', cost: null, refund: armed ? buildingRefund(b) : undefined, secondary: true, danger: true, enabled: true, run: () => {
            if (!armed) return void (this.removing = { id: b.id, until: performance.now() + REMOVE_MS });
            this.removing = null;
            if (removeBuilding(w, b.id)) ui.selected = null;
          } },
        );
      }
      actions.push({ label: narrow ? '✕' : 'Close', cost: null, secondary: true, enabled: true, run: () => (ui.selected = null) });
      const isolated = BUILDINGS[k].road && !linkedBuildings(s).has(b.id);
      const fields = k === 'farm' && lvl(s, 'fieldPaths') ? ', or set it beside a connected farm' : '';
      const info = isolated ? `Isolated: not connected to the Town Center, so it does nothing. Lay a road from it to the Town Center${fields}.` : INFO[k]?.(w, ui.selected);
      const custom = k === 'market' ? this.market : undefined;
      // A phone leaves out the description (the Guide has it) when the building has more to show.
      const busy = narrow && (!!info || !!custom || actions.some((a) => !a.secondary));
      return { title: BUILDING_TEXT[k].name, thumb: k, sub: busy ? '' : BUILDING_TEXT[k].desc, status: info, tally: tallyHtml(buildingById(s, b.id) ?? b), actions, custom };
    }
    if (ui.decorSel) {
      const d = ui.decorSel;
      return {
        title: DECOR_TEXT[d.kind].name,
        thumb: `decor-${d.kind}`,
        sub: `${DECOR_TEXT[d.kind].desc} Removing it returns all it cost.`,
        actions: [
          { label: 'Move', cost: null, secondary: true, enabled: true, run: () => (ui.movingDecor = true) },
          { label: 'Remove', cost: null, secondary: true, danger: true, enabled: true, run: () => {
            if (removeDecor(w, d.y * s.w + d.x, DECOR[d.kind].layer)) ui.decorSel = null;
          } },
          { label: this.narrow.matches ? '✕' : 'Close', cost: null, secondary: true, enabled: true, run: () => (ui.decorSel = null) },
        ],
      };
    }
    if (ui.decorating) {
      // Two pages, switched by a button: the town decorations, and the trophies earned with achievements.
      const trophies = DECOR_KINDS.filter((k) => DECOR[k].trophy);
      const earned = trophies.filter((k) => isDecorUnlocked(s, k)).length;
      return {
        title: ui.trophies ? 'Trophies' : 'Decorate',
        sub: ui.trophies
          ? 'Trophies unlock with an achievement tier and stay unlocked across rebuilds. Like all decorations, they are only for looks.'
          : 'Decorations are only for looks: villagers walk over them and nothing works any differently. Building or laying road over one hands it back.',
        // Trophies stay on show, in silhouette, until their achievement is earned.
        actions: [
          ...DECOR_KINDS.filter((k) => !!DECOR[k].trophy === ui.trophies).map((k): Action => {
            const trophy = DECOR[k].trophy;
            const open = isDecorUnlocked(s, k);
            return {
              label: DECOR_TEXT[k].name,
              cost: DECOR[k].cost,
              locked: open || !trophy ? undefined : `Earn ${achievementName(trophy.achievement, trophy.tier)}`,
              enabled: open && canAfford(s, DECOR[k].cost),
              run: () => (ui.decor = k),
              thumb: `decor-${k}`,
            };
          }),
          { label: ui.trophies ? 'Town decorations' : `Trophies (${earned}/${trophies.length})`, cost: null, secondary: true, enabled: true, run: () => (ui.trophies = !ui.trophies) },
          { label: 'Back', cost: null, secondary: true, enabled: true, run: () => (ui.decorating = false) },
        ],
      };
    }
    const left = Math.max(0, roadStock(s) - roadsBuilt(s));
    return {
      title: 'Build',
      sub: 'Tap a building to select it.',
      foldable: true,
      // Kinds still locked behind a skill, or at their limit (the Tailor, the Market, the Outpost), stay out of the menu.
      actions: [
        { label: `Road (${left} left)`, cost: null, enabled: true, run: () => (ui.paving = true), thumb: 'road' as const, badge: String(left) },
        ...BUILDABLE.filter((k) => isUnlocked(s, k) && !atLimit(s, k)).map((k) => {
          const cost = buildingCost(s, k);
          return {
            label: BUILDING_TEXT[k].name,
            cost,
            enabled: canAfford(s, cost),
            run: () => (ui.placing = k),
            thumb: k,
          };
        }),
        { label: 'Decorate', cost: null, enabled: true, run: () => (ui.decorating = true), thumb: 'decor-cherry' },
      ],
    };
  }
}

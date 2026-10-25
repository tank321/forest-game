import { CONFIG } from '../config';
import { BUILDINGS, type BuildingKind } from '../core/buildings';
import { canAfford, villagerCost } from '../core/economy';
import { isCollectable } from '../core/grid';
import { legacyRequirement } from '../core/legacy';
import { linkedBuildings, roadNetwork, roadsBuilt, roadStock } from '../core/roads';
import type { World } from '../core/world';
import { readPref, writePref } from './prefs';
import type { UiState } from './state';

/** What the player has done in the UI this session, for goals the game state doesn't record. */
export interface Seen {
  skillTree: boolean; // opened with the Skills button
}

/** One goal on the coach card. Its text and highlight can change as the player gets partway there. */
interface Step {
  title: string;
  text: (w: World, ui: UiState) => string;
  done?: (w: World, seen: Seen) => boolean; // none on the last step: the player closes the card
  target?: (w: World, ui: UiState) => Element | null; // pulsed while the step is shown
  focus?: (w: World) => { x: number; y: number }; // the camera glides here when the step starts
}

const GLOW = 'tutorial-glow';
const SKIP = 'Skip tutorial';

const panelButton = (pick: (text: string) => boolean) =>
  [...document.querySelectorAll<HTMLButtonElement>('#panel button')].find((b) => pick(b.textContent ?? '')) ?? null;
const hireButton = (ui: UiState) => (ui.selected?.kind === 'townCenter' ? panelButton((t) => t.startsWith('Hire villager with wood')) : null);
/** The build menu card for `kind`, or the Close button while a building's panel is in the way. */
const buildCard = (kind: BuildingKind | 'road') =>
  document.querySelector(`#panel .build-grid .thumb-${kind}`)?.closest('button') ?? panelButton((t) => t === 'Close' || t === '✕');

function placed(w: World, kind: BuildingKind): 'none' | 'isolated' | 'linked' {
  const s = w.state;
  const all = s.buildings.filter((b) => b.kind === kind);
  if (!all.length) return 'none';
  const linked = linkedBuildings(s);
  return all.some((b) => linked.has(b.id)) ? 'linked' : 'isolated';
}

/** A building that takes deliveries and sells an upgrade: build it, connect it, then buy the first level. */
function workshopTarget(kind: 'lumberCamp' | 'barn') {
  return (w: World, ui: UiState) => {
    const at = placed(w, kind);
    if (at !== 'linked') return buildCard(at === 'none' ? kind : 'road');
    return ui.selected?.kind === kind ? document.querySelector('#panel .upgrade-card button') : null;
  };
}

const { basePop, popPerHouse } = CONFIG.economy;

export const STEPS: Step[] = [
  {
    title: 'Chop trees',
    text: (w) => `Tap trees at the edge of your clearing: each tap gives wood. Gather ${villagerCost(w.state).wood} wood to hire your first villager.`,
    done: (w) => w.state.villagers.length > 0 || canAfford(w.state, villagerCost(w.state)),
  },
  {
    title: 'Hire a villager',
    text: () => 'Tap the Town Center, then hire a villager with wood. Villagers fell trees and carry the wood home on their own.',
    done: (w) => w.state.villagers.length > 0,
    target: (_, ui) => hireButton(ui),
    focus: (w) => {
      const tc = w.state.buildings.find((b) => b.kind === 'townCenter')!;
      return { x: tc.x + BUILDINGS.townCenter.w / 2, y: tc.y + BUILDINGS.townCenter.h / 2 };
    },
  },
  {
    title: 'Grow the village',
    text: (w) =>
      `Hire villagers until you have ${basePop} (${w.state.villagers.length} so far). Each costs more than the last, so keep tapping too. Tip: right-click a tree to flag it, and lumberjacks fell it first.`,
    done: (w) => w.state.villagers.length >= basePop,
    target: (_, ui) => hireButton(ui),
  },
  {
    title: 'Build a House',
    text: () =>
      `Your village is full. Choose House in the build menu and place it touching the Town Center. Each house makes room for ${popPerHouse} more villagers and adds ${CONFIG.roads.perHouse} roads.`,
    done: (w) => placed(w, 'house') === 'linked',
    target: () => buildCard('house'),
  },
  {
    title: 'Grow food',
    text: (w) =>
      placed(w, 'farm') === 'isolated'
        ? 'Your Farm is isolated, so it does nothing. Choose Road and drag from the Town Center to the Farm to connect it.'
        : `Every villager past the first ${CONFIG.upkeep.freeVillagers} eats food. Build a Farm touching the Town Center, or anywhere a road can join it to the Town Center.`,
    done: (w) => placed(w, 'farm') === 'linked',
    target: (w) => buildCard(placed(w, 'farm') === 'isolated' ? 'road' : 'farm'),
  },
  {
    title: 'Lay a road',
    text: (w) =>
      `Buildings work only while they touch the Town Center or a road joined to it. Choose Road and drag from the Town Center out toward the trees. You have ${roadStock(w.state) - roadsBuilt(w.state)} roads left, and each House adds ${CONFIG.roads.perHouse}.`,
    done: (w) => roadNetwork(w.state).includes(1),
    target: () => buildCard('road'),
  },
  {
    title: 'Sharpen the axes',
    text: (w) => {
      const camp = placed(w, 'lumberCamp');
      if (camp === 'none') return 'Build a Lumber Camp at the end of your road, out by the trees: lumberjacks drop their wood there instead of walking back to the Town Center.';
      if (camp === 'isolated') return 'Connect your Lumber Camp to the Town Center with a road, so it starts working.';
      return 'Tap your Lumber Camp and upgrade the axe, so lumberjacks chop faster and carry more.';
    },
    done: (w) => w.state.upgrades.axe >= 1,
    target: workshopTarget('lumberCamp'),
  },
  {
    title: 'Better farms',
    text: (w) => {
      const barn = placed(w, 'barn');
      if (barn === 'none') return 'A Barn takes food and cloth, like the Lumber Camp takes wood. Build one near your farms, so farmers walk less.';
      if (barn === 'isolated') return 'Connect your Barn to the Town Center with a road, so it starts working.';
      return 'Tap your Barn and upgrade farms, so farmers harvest faster and carry more.';
    },
    done: (w) => w.state.upgrades.farm >= 1,
    target: workshopTarget('barn'),
  },
  {
    title: 'Find a relic',
    text: (w) => {
      const s = w.state;
      if (s.relics.some((r) => isCollectable(s, r))) return 'Your land reaches the relic. Tap the glowing stone and choose one of the skills it offers.';
      if (s.relics.length) return 'A relic has appeared in the forest! Clear a path to it, then tap it.';
      return 'Keep clearing land. A relic appears in the forest when the countdown next to your land runs out.';
    },
    done: (w) => Object.values(w.state.skills).some((n) => n > 0),
    target: (w) => {
      return w.state.relics.length ? null : document.getElementById('relicCountdown');
    },
  },
  {
    title: 'Explore your skills',
    text: () =>
      'More relics appear as you clear land, each with a new skill. Skills shows all six tracks: each skill you learn opens the ones that grow from it, and some unlock new buildings such as the Quarry and the Market. Open it to see where you are headed.',
    done: (_, seen) => seen.skillTree,
    target: () => document.getElementById('skillsBtn'),
  },
  {
    title: 'Rebuild with Legacy',
    text: (w) =>
      `Once you have learned ${legacyRequirement(w.state)} skill levels, Legacy turns gold: rebuild on a new map and keep one perk forever. The Guide lists every building and what unlocks it. Good luck!`,
    target: () => document.getElementById('legacyBtn'),
  },
];

/** The first step from `from` on that isn't done yet. The last step is never done on its own. */
export function nextStep(w: World, from: number, seen: Seen = { skillTree: false }): number {
  let i = from;
  while (STEPS[i].done?.(w, seen)) i++;
  return i;
}

/** Where each step of the 8-step tutorial (v38 and earlier, kept under `CONFIG.tutorial.oldKey`) is now. */
const OLD_STEPS = [0, 1, 2, 3, 4, 6, 8, 9];

/** The step to resume from the stored progress (or the old tutorial's), or -1 when finished or never started. */
export function resumeStep(kept: string | null, old: string | null): number {
  const n = Number(kept ?? NaN);
  if (kept !== null) return Number.isInteger(n) ? Math.min(Math.max(n, 0), STEPS.length - 1) : -1;
  const o = Number(old ?? NaN);
  return Number.isInteger(o) ? OLD_STEPS[Math.min(Math.max(o, 0), OLD_STEPS.length - 1)] : -1;
}

/**
 * The coach card in the sidebar: one goal at a time, each finished by doing it. Progress is a per-browser
 * setting (the step, or "done"), not part of the save. It starts on a fresh game; a save without it never shows it.
 */
export class Tutorial {
  private step: number;
  private shown = -1;
  private glow: Element | null = null;
  private armed = 0;
  private seen: Seen = { skillTree: false };
  private count: HTMLElement;
  private title: HTMLElement;
  private body: HTMLElement;
  private btn: HTMLButtonElement;

  constructor(
    private el: HTMLElement,
    private world: () => World,
    private ui: UiState,
    private glide: (x: number, y: number) => void,
    fresh: boolean,
  ) {
    this.step = fresh ? 0 : resumeStep(readPref(CONFIG.tutorial.key), readPref(CONFIG.tutorial.oldKey));
    if (fresh || this.step >= 0) writePref(CONFIG.tutorial.key, String(this.step));
    this.count = el.querySelector('small')!;
    this.title = el.querySelector('h3')!;
    this.body = el.querySelector('p')!;
    this.btn = el.querySelector('button')!;
    // Skipping takes a second click within a few seconds, since there is no way back.
    this.btn.onclick = () => {
      if (this.step === STEPS.length - 1 || this.armed) return this.close();
      this.btn.textContent = 'Sure?';
      this.armed = window.setTimeout(() => {
        this.armed = 0;
        this.btn.textContent = SKIP;
      }, 3000);
    };
    el.hidden = this.step < 0;
  }

  /** The Skills button opened the skill tree. */
  sawSkillTree(): void {
    this.seen.skillTree = true;
  }

  update(): void {
    if (this.step < 0) return;
    const w = this.world();
    const step = nextStep(w, this.step, this.seen);
    if (step !== this.step) {
      this.step = step;
      writePref(CONFIG.tutorial.key, String(step));
    }
    const def = STEPS[step];
    if (step !== this.shown) {
      if (this.shown >= 0 && def.focus) {
        const { x, y } = def.focus(w);
        this.glide(x, y);
      }
      this.shown = step;
      this.count.textContent = `Tutorial · ${step + 1} of ${STEPS.length}`;
      this.title.textContent = def.title;
      window.clearTimeout(this.armed);
      this.armed = 0;
      this.btn.textContent = step === STEPS.length - 1 ? 'Finish' : SKIP;
    }
    const text = def.text(w, this.ui);
    if (this.body.textContent !== text) this.body.textContent = text;
    this.highlight(def.target?.(w, this.ui) ?? null);
  }

  private highlight(el: Element | null): void {
    if (el === this.glow) return;
    this.glow?.classList.remove(GLOW);
    el?.classList.add(GLOW);
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); // on a phone the build menu scrolls sideways
    this.glow = el;
  }

  private close(): void {
    window.clearTimeout(this.armed);
    this.step = -1;
    this.highlight(null);
    this.el.hidden = true;
    writePref(CONFIG.tutorial.key, 'done');
  }
}

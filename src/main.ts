import { CONFIG } from './config';
import { buildingAt } from './core/buildings';
import { chopTree, collectRelic, moveBuilding, placeBuilding, toggleMark } from './core/commands';
import { inBounds, tileAt } from './core/grid';
import { clearSave, deserialize, loadGame, saveGame, serialize } from './core/save';
import { simulate, tick } from './core/sim';
import { createInitialState } from './core/state';
import { Tile } from './core/types';
import { createWorld } from './core/world';
import { attachInput } from './input/input';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { Hud } from './ui/hud';
import { Panel } from './ui/panel';
import { placementAt } from './ui/placement';
import { SkillModal } from './ui/skillModal';
import { createUiState } from './ui/state';
import { applySkin } from './ui/skin';
import { BUILDING_TEXT, duration, fmt } from './ui/text';
import './style.css';

const { dt, catchUpDt, maxFrameSeconds, maxOfflineSeconds } = CONFIG.sim;

applySkin();
const loaded = loadGame();
const world = createWorld(loaded?.state ?? createInitialState());
const s = world.state;
const ui = createUiState();
const canvas = document.getElementById('world') as HTMLCanvasElement;
const cam = new Camera(s.w, s.h);
const renderer = new Renderer(canvas, cam, s.w, s.h);
const hud = new Hud(() => world, ui, () => {
  const r = s.relics[0];
  cam.x = (r % s.w) + 0.5;
  cam.y = ((r / s.w) | 0) + 0.5;
});
const panel = new Panel(document.getElementById('panel')!, () => world, ui);
const skillModal = new SkillModal(
  document.getElementById('skillModal') as HTMLDialogElement,
  document.getElementById('pickSkillBtn') as HTMLButtonElement,
  () => world,
  (message) => hud.message(message),
);

attachInput(canvas, cam, {
  hover: (x, y) => (ui.hover = { x, y }),
  leave: () => (ui.hover = null),
  tap(wx, wy, alt) {
    ui.hover = { x: wx, y: wy };
    if (ui.moving) {
      const b = ui.moving;
      const { x, y } = placementAt(b.kind, wx, wy);
      if (moveBuilding(world, b.id, x, y)) {
        ui.moving = null;
        hud.message(`${BUILDING_TEXT[b.kind].name} moved.`);
      } else hud.message('Cannot move there. Choose clear land; city buildings must touch the Town Center or another city building.');
      return;
    }
    if (ui.placing) {
      const { x, y } = placementAt(ui.placing, wx, wy);
      if (placeBuilding(world, ui.placing, x, y)) ui.placing = null;
      else hud.message("Can't build there");
      return;
    }
    if (!inBounds(s, wx, wy)) return;
    ui.removing = null;
    const i = tileAt(s, wx, wy);
    ui.selected = s.tiles[i] === Tile.Building ? (buildingAt(s, i) ?? null) : null;
    if (s.tiles[i] === Tile.Relic) {
      if (!collectRelic(world, i)) hud.message('Clear a path to the relic first');
      return;
    }
    if (s.tiles[i] !== Tile.Tree) return;
    if (alt || ui.tool === 'mark') toggleMark(world, i);
    else chopTree(world, i);
  },
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || document.getElementById('skillModal')!.matches('[open]')) return;
  if (ui.moving) ui.moving = null;
  else if (ui.removing !== null) ui.removing = null;
  else ui.placing = ui.selected = null;
});

function catchUp(seconds: number): void {
  const t = Math.min(seconds, maxOfflineSeconds);
  const before = { ...s.resources };
  simulate(world, t, catchUpDt);
  const change = (r: 'wood' | 'food' | 'gold') => {
    const d = s.resources[r] - before[r];
    return `${d < 0 ? '−' : '+'}${fmt(Math.abs(d))} ${r}`;
  };
  const gold = s.resources.gold !== before.gold ? `, ${change('gold')}` : '';
  if (t >= 60) hud.message(`Away ${duration(t)}: ${change('wood')}, ${change('food')}${gold}`, 8000);
}
if (loaded) catchUp((Date.now() - loaded.savedAt) / 1000);

// Fixed-timestep loop. Long gaps (hidden tab) go through the catch-up path.
let last = performance.now();
let acc = 0;
function frame(now: number): void {
  const elapsed = (now - last) / 1000;
  last = now;
  if (elapsed > maxFrameSeconds) catchUp(elapsed);
  else {
    acc += elapsed * world.dev.speed;
    while (acc >= dt) {
      tick(world, dt);
      acc -= dt;
    }
  }
  renderer.draw(world, ui);
  hud.update();
  panel.update();
  skillModal.update();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

let resetting = false;
const save = () => !resetting && saveGame(s);

// Menu: skills popup, save export/import, dev tap multiplier, game speed and reset.
const $ = (id: string) => document.getElementById(id)!;
$('skillsBtn').onclick = () => skillModal.open();
$('exportBtn').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([serialize(s)], { type: 'application/json' }));
  a.download = `forest-save-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
const file = $('importFile') as HTMLInputElement;
$('importBtn').onclick = () => file.click();
file.onchange = async () => {
  const text = await file.files?.[0]?.text();
  file.value = '';
  if (!text) return;
  let imported;
  try {
    imported = deserialize(text).state; // validates + migrates before anything is replaced
  } catch (e) {
    return hud.message(`Import failed: ${(e as Error).message}`, 6000);
  }
  resetting = true;
  localStorage.setItem(CONFIG.save.key, serialize(imported)); // stamped now: no offline catch-up
  location.reload();
};
const reset = () => {
  resetting = true;
  clearSave();
  location.reload();
};
if (import.meta.env.DEV) {
  $('devTools').hidden = false;
  const tap = $('devTap');
  const tapLabel = () => (tap.textContent = `Tap ×${world.dev.manualMult}`);
  tap.onclick = () => {
    world.dev.manualMult = world.dev.manualMult >= 1000 ? 1 : world.dev.manualMult * 10;
    tapLabel();
  };
  tapLabel();

  const SPEEDS = [1, 2, 5, 10];
  const speed = $('devSpeed');
  const speedLabel = () => (speed.textContent = `Speed ×${world.dev.speed}`);
  speed.onclick = () => {
    world.dev.speed = SPEEDS[(SPEEDS.indexOf(world.dev.speed) + 1) % SPEEDS.length];
    speedLabel();
  };
  speedLabel();

  // Two clicks within a few seconds, so a stray click can't wipe the game.
  const wipe = $('devReset');
  let armed = 0;
  wipe.onclick = () => {
    if (armed) return reset();
    wipe.textContent = 'Sure?';
    armed = window.setTimeout(() => {
      armed = 0;
      wipe.textContent = 'Reset';
    }, 3000);
  };
}
setInterval(save, CONFIG.save.intervalMs);
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => document.hidden && save());

// Dev console helpers: `world`, `cam`, `reset()`.
if (import.meta.env.DEV) Object.assign(window, { world, cam, reset });

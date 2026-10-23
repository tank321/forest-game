import { CONFIG } from './config';
import { buildingAt } from './core/buildings';
import { chopTree, collectRelic, placeBuilding, toggleMark } from './core/commands';
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
import { createUiState } from './ui/state';
import { applySkin } from './ui/skin';
import { duration, fmt } from './ui/text';
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

attachInput(canvas, cam, {
  hover: (x, y) => (ui.hover = { x, y }),
  tap(wx, wy, alt) {
    ui.hover = { x: wx, y: wy };
    if (ui.placing) {
      const { x, y } = placementAt(ui.placing, wx, wy);
      if (placeBuilding(world, ui.placing, x, y)) ui.placing = null;
      else hud.message("Can't build there");
      return;
    }
    if (!inBounds(s, wx, wy)) return;
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
  if (e.key === 'Escape') ui.placing = ui.selected = null;
});

function catchUp(seconds: number): void {
  const t = Math.min(seconds, maxOfflineSeconds);
  const before = s.resources.wood;
  simulate(world, t, catchUpDt);
  if (t >= 60) hud.message(`Away ${duration(t)}: +${fmt(s.resources.wood - before)} wood`, 8000);
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
    acc += elapsed;
    while (acc >= dt) {
      tick(world, dt);
      acc -= dt;
    }
  }
  renderer.draw(world, ui);
  hud.update();
  panel.update();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

let resetting = false;
const save = () => !resetting && saveGame(s);

// Menu: skills view, save export/import, dev tap multiplier.
const $ = (id: string) => document.getElementById(id)!;
$('skillsBtn').onclick = () => {
  ui.selected = ui.placing = null;
  ui.view = ui.view === 'skills' ? 'build' : 'skills';
};
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
if (import.meta.env.DEV) {
  const dev = $('devTap');
  const label = () => (dev.textContent = `DEV tap ×${world.dev.manualMult}`);
  dev.hidden = false;
  dev.onclick = () => {
    world.dev.manualMult = world.dev.manualMult >= 1000 ? 1 : world.dev.manualMult * 10;
    label();
  };
  label();
}
setInterval(save, CONFIG.save.intervalMs);
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => document.hidden && save());

// Dev console helpers: `world`, `cam`, `reset()`.
if (import.meta.env.DEV) {
  Object.assign(window, {
    world,
    cam,
    reset: () => {
      resetting = true;
      clearSave();
      location.reload();
    },
  });
}

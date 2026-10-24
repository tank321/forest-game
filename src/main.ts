import { CONFIG } from './config';
import { checkAchievements } from './core/achievements';
import { buildingAt } from './core/buildings';
import { chopTree, collectRelic, moveBuilding, moveRoad, placeBuilding, placeRoad, removeRoad, toggleMark } from './core/commands';
import { inBounds, tileAt } from './core/grid';
import { roadsBuilt, roadStock } from './core/roads';
import { clearSave, deserialize, loadGame, saveGame, serialize } from './core/save';
import { SEASONS, seasonOf } from './core/seasons';
import { simulate, tick } from './core/sim';
import { createInitialState } from './core/state';
import { Tile } from './core/types';
import { createWorld } from './core/world';
import { attachInput } from './input/input';
import { Camera } from './render/camera';
import { AchievementsModal } from './ui/achievementsModal';
import { Renderer } from './render/renderer';
import { Hud } from './ui/hud';
import { GuideModal } from './ui/guideModal';
import { Panel } from './ui/panel';
import { LegacyModal } from './ui/legacyModal';
import { Music } from './ui/music';
import { placementAt } from './ui/placement';
import { SkillModal } from './ui/skillModal';
import { Sound } from './ui/sound';
import { Toasts } from './ui/toast';
import { createUiState } from './ui/state';
import { applySkin } from './ui/skin';
import { BUILDING_TEXT, duration, fmt } from './ui/text';
import { Tutorial } from './ui/tutorial';
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
const hud = new Hud(() => world);
const panel = new Panel(document.getElementById('panel')!, () => world, ui);
const skillModal = new SkillModal(
  document.getElementById('skillModal') as HTMLDialogElement,
  document.getElementById('pickSkillBtn') as HTMLButtonElement,
  () => world,
  (message) => hud.message(message),
);
// A rebuild replaces the save like an import does: stamped now, so no offline catch-up.
const legacyModal = new LegacyModal(
  document.getElementById('legacyModal') as HTMLDialogElement,
  document.getElementById('legacyBtn') as HTMLButtonElement,
  () => world,
  (next) => {
    resetting = true;
    localStorage.setItem(CONFIG.save.key, serialize(next));
    location.reload();
  },
);
new GuideModal(document.getElementById('guideModal') as HTMLDialogElement, document.getElementById('guideBtn') as HTMLButtonElement, () => world);
const achievementsModal = new AchievementsModal(
  document.getElementById('achievementsModal') as HTMLDialogElement,
  document.getElementById('achievementsBtn') as HTMLButtonElement,
  document.getElementById('nextUpBtn') as HTMLButtonElement,
  () => world,
);
const sound = new Sound(document.getElementById('soundBtn') as HTMLButtonElement);
const music = new Music(document.getElementById('musicBtn') as HTMLButtonElement);
const toasts = new Toasts(document.getElementById('toasts')!, () => achievementsModal.open(), (rank) => sound.chime(rank));
// Anything reached before load (a save from before achievements, a rebuild) is granted now: a few one by one, many as a summary.
const already = checkAchievements(s);
if (already.length > 3) toasts.summary(`You've already earned ${already.length} achievements!`);
else for (const { id, tier } of already) toasts.achievement(id, tier);
const tutorial = new Tutorial(document.getElementById('tutorial')!, () => world, ui, (x, y) => cam.glideTo(x, y), !loaded);

// A road stroke lays road on open ground, or lifts it if it starts on a road. Right-click ends road mode instead.
let lifting = false;
let lastRoadTile = -1;
attachInput(canvas, cam, {
  hover: (x, y) => (ui.hover = { x, y }),
  leave: () => (ui.hover = null),
  brush: () => ui.paving,
  stroke(wx, wy, start, alt) {
    ui.hover = { x: wx, y: wy };
    // Right-click is handled by the contextmenu listener below; the rest of a drag that used the last road does nothing.
    if (alt || !ui.paving) return;
    const i = inBounds(s, wx, wy) ? tileAt(s, wx, wy) : -1;
    if (start) {
      lifting = i >= 0 && s.tiles[i] === Tile.Road;
      lastRoadTile = -1;
    }
    if (i < 0 || i === lastRoadTile) return;
    lastRoadTile = i;
    const noneLeft = `No roads left. Each house adds ${CONFIG.roads.perHouse} more.`;
    if (lifting) removeRoad(world, i);
    else if (placeRoad(world, i)) {
      if (roadsBuilt(s) >= roadStock(s)) {
        ui.paving = false; // that was the last road: road mode ends
        hud.message(noneLeft);
      }
    } else if (s.tiles[i] === Tile.Grass && roadsBuilt(s) >= roadStock(s)) hud.message(noneLeft);
  },
  tap(wx, wy, alt) {
    ui.hover = { x: wx, y: wy };
    if (ui.movingRoad && ui.road !== null) {
      const to = inBounds(s, wx, wy) ? tileAt(s, wx, wy) : -1;
      if (moveRoad(world, ui.road, to)) {
        ui.road = to;
        ui.movingRoad = false;
      } else hud.message('Cannot move there. Choose cleared land.');
      return;
    }
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
      if (alt) return; // right click cancels placing (contextmenu listener below)
      const { x, y } = placementAt(ui.placing, wx, wy);
      if (placeBuilding(world, ui.placing, x, y)) ui.placing = null;
      else hud.message("Can't build there");
      return;
    }
    if (!inBounds(s, wx, wy)) return;
    const i = tileAt(s, wx, wy);
    ui.selected = s.tiles[i] === Tile.Building ? (buildingAt(s, i) ?? null) : null;
    ui.road = s.tiles[i] === Tile.Road ? i : null;
    if (s.tiles[i] === Tile.Relic) {
      if (!collectRelic(world, i)) hud.message('Clear a path to the relic first');
      return;
    }
    if (s.tiles[i] !== Tile.Tree) return;
    if (alt) toggleMark(world, i);
    else chopTree(world, i);
  },
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  if (ui.moving) ui.moving = null;
  else if (ui.movingRoad) ui.movingRoad = false;
  else if (ui.paving) ui.paving = false;
  else ui.placing = ui.selected = ui.road = null;
});
// Right click anywhere (map or sidebar, even after a right-drag) cancels placing a building or ends road mode.
addEventListener('contextmenu', (e) => {
  if (!(ui.placing || ui.paving) || e.button !== 2) return;
  e.preventDefault();
  ui.placing = null;
  ui.paving = false;
});

function catchUp(seconds: number): void {
  const t = Math.min(seconds, maxOfflineSeconds);
  const before = { ...s.resources };
  simulate(world, t, catchUpDt);
  const earned = world.fx.filter((fx) => fx.kind === 'achievement').length;
  world.fx.length = 0; // effects from time away are summed up below, not replayed
  if (earned) toasts.summary(`${earned} earned while you were away`);
  const change = (r: 'wood' | 'food' | 'gold') => {
    const d = s.resources[r] - before[r];
    return `${d < 0 ? '−' : '+'}${fmt(Math.abs(d))} ${r}`;
  };
  const gold = s.resources.gold !== before.gold ? `, ${change('gold')}` : '';
  const found = panToNewRelic();
  if (t >= 60) hud.message(`Away ${duration(t)}: ${change('wood')}, ${change('food')}${gold}${found ? `. ${NEW_RELIC}` : ''}`, 8000);
  else if (found) hud.message(NEW_RELIC);
}

const NEW_RELIC = 'New relic discovered!';
let relicsSeen = s.relicsSpawned; // the camera glides to each relic spawned after this
/** Glide to the newest relic if one has spawned since the last check; returns whether one had. */
function panToNewRelic(): boolean {
  if (s.relicsSpawned === relicsSeen) return false;
  relicsSeen = s.relicsSpawned;
  const r = s.relics.at(-1);
  if (r === undefined) return false;
  cam.glideTo((r % s.w) + 0.5, ((r / s.w) | 0) + 0.5);
  return true;
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
  if (panToNewRelic()) hud.message(NEW_RELIC);
  let wool = 0;
  for (const fx of world.fx.splice(0)) {
    if (fx.kind === 'festival') hud.message(`Harvest Festival! Farms and orchards bring in ${fmt(fx.n)} food.`, 6000);
    else if (fx.kind === 'fair') hud.message('The Midsummer Fair is open! No market commission and Trading Posts pay more all summer.', 6000);
    else if (fx.kind === 'achievement') toasts.achievement(fx.id!, fx.n);
    else if (fx.kind === 'caravan') hud.message('A merchant caravan has come to the Market. Take one deal before spring.', 6000);
    else renderer.addFx(fx, now);
    if (fx.kind === 'shearing') wool += fx.n;
  }
  if (wool) hud.message(`Shearing Day! Sheep Farms bring in ${fmt(wool)} cloth.`, 6000);
  cam.step(elapsed * 1000);
  renderer.draw(world, ui);
  hud.update();
  panel.update();
  tutorial.update(); // after the panel, so its highlight lands on the buttons just drawn
  skillModal.update();
  legacyModal.update();
  achievementsModal.update();
  music.setSeason(SEASONS[seasonOf(s.time)]);
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

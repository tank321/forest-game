import { CONFIG } from '../config';
import { BUILDINGS, type BuildingKind } from '../core/buildings';
import { canPlace } from '../core/commands';
import { isCollectable } from '../core/grid';
import type { VillagerState } from '../core/types';
import { Tile } from '../core/types';
import type { World } from '../core/world';
import { placementAt } from '../ui/placement';
import type { UiState } from '../ui/state';
import type { Camera } from './camera';

// Placeholder palette: everything is a colored rectangle at this stage.
const GRASS = [0x6f, 0x9e, 0x4f];
const TREE_LIGHT = [0x8c, 0xb8, 0x5a]; // nearly chopped
const TREE_DARK = [0x2a, 0x6b, 0x2c]; // full
const VOID = [0x07, 0x0a, 0x07]; // fog beyond the visible radius
const FOG_LIGHT = [1, 1, 0.75, 0.5]; // brightness by fog distance 0..R
const BUILDING_COLOR: Record<BuildingKind, string> = {
  townCenter: '#8b5a2b',
  house: '#d8b47a',
  lumberCamp: '#a0522d',
  barn: '#8e3b2e',
  farm: '#cdb14e',
};
const VILLAGER_COLOR: Record<VillagerState, string> = {
  idle: '#9aa0a6',
  toTree: '#f2f2f2',
  chop: '#ffd54a',
  toHome: '#ff8a3d', // lumberjacks carrying wood; farmers carrying food use FARMER_HOME
  toWork: '#b3e5fc',
  work: '#29b6f6',
};
const FARMER_HOME = '#f48fb1';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement; // 1 px per tile, scaled up by the camera
  private tctx: CanvasRenderingContext2D;
  private img: ImageData;

  constructor(
    private canvas: HTMLCanvasElement,
    private cam: Camera,
    w: number,
    h: number,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.terrain = document.createElement('canvas');
    this.terrain.width = w;
    this.terrain.height = h;
    this.tctx = this.terrain.getContext('2d')!;
    this.img = this.tctx.createImageData(w, h);
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize(): void {
    const dpr = devicePixelRatio;
    const { clientWidth: cw, clientHeight: ch } = this.canvas;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cam.resize(cw, ch);
  }

  draw(world: World, ui: UiState): void {
    const s = world.state;
    const { ctx, cam } = this;
    const k = cam.zoom;
    const rect = (x: number, y: number, w: number, h: number) => {
      const [sx, sy] = cam.toScreen(x, y);
      ctx.fillRect(sx, sy, w * k, h * k);
    };

    this.drawTerrain(world);
    ctx.fillStyle = `rgb(${VOID})`;
    ctx.fillRect(0, 0, cam.vw, cam.vh);
    ctx.imageSmoothingEnabled = false;
    const [ox, oy] = cam.toScreen(0, 0);
    ctx.drawImage(this.terrain, ox, oy, s.w * k, s.h * k);

    ctx.fillStyle = '#e53935';
    for (const i of s.marked) rect((i % s.w) + 0.35, ((i / s.w) | 0) + 0.1, 0.3, 0.3);

    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 250);
    for (const i of s.relics) {
      if (world.fog[i] > CONFIG.fogRadius) continue;
      ctx.fillStyle = isCollectable(s, i) ? `rgba(255,215,64,${pulse})` : '#b8962e';
      rect((i % s.w) + 0.2, ((i / s.w) | 0) + 0.2, 0.6, 0.6);
    }

    for (const b of s.buildings) {
      const d = BUILDINGS[b.kind];
      ctx.fillStyle = BUILDING_COLOR[b.kind];
      rect(b.x + 0.05, b.y + 0.05, d.w - 0.1, d.h - 0.1);
      if (s.paused.includes(b.id)) {
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        rect(b.x + 0.05, b.y + 0.05, d.w - 0.1, d.h - 0.1);
      }
    }

    const vs = 0.35;
    for (const v of s.villagers) {
      ctx.fillStyle = v.job === 'farm' && v.state === 'toHome' ? FARMER_HOME : VILLAGER_COLOR[v.state];
      rect(v.x - vs / 2, v.y - vs / 2, vs, vs);
    }

    if (ui.selected) {
      const d = BUILDINGS[ui.selected.kind];
      const [sx, sy] = cam.toScreen(ui.selected.x, ui.selected.y);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, d.w * k, d.h * k);
    }

    if (ui.placing && ui.hover) {
      const { x, y } = placementAt(ui.placing, ui.hover.x, ui.hover.y);
      const d = BUILDINGS[ui.placing];
      ctx.fillStyle = canPlace(world, ui.placing, x, y) ? 'rgba(80,220,100,.55)' : 'rgba(230,60,60,.55)';
      rect(x, y, d.w, d.h);
    }
  }

  /** Rewrites the per-tile image (w*h pixels; negligible even at 100×100). */
  private drawTerrain(world: World): void {
    const s = world.state;
    const d = this.img.data;
    const R = CONFIG.fogRadius;
    for (let i = 0; i < s.tiles.length; i++) {
      const tree = s.tiles[i] === Tile.Tree || s.tiles[i] === Tile.Relic; // relic sits in a clearing-less thicket
      const fog = world.fog[i];
      const p = i * 4;
      d[p + 3] = 255;
      if (fog > R) {
        d[p] = VOID[0];
        d[p + 1] = VOID[1];
        d[p + 2] = VOID[2];
        continue;
      }
      const f = s.tiles[i] === Tile.Tree ? s.wood[i] / world.maxWood[i] : 1;
      const light = FOG_LIGHT[fog] * (tree && (i + ((i / s.w) | 0)) & 1 ? 0.9 : 1); // checker
      for (let j = 0; j < 3; j++) {
        d[p + j] = (tree ? TREE_LIGHT[j] + (TREE_DARK[j] - TREE_LIGHT[j]) * f : GRASS[j]) * light;
      }
    }
    this.tctx.putImageData(this.img, 0, 0);
  }
}

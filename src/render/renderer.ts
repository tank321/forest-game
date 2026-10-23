import { CONFIG } from '../config';
import { BUILDINGS, type BuildingKind, buildingAt } from '../core/buildings';
import { canPlace } from '../core/commands';
import { inBounds, isChoppable, isCollectable, tileAt } from '../core/grid';
import type { Building, GameState, Job, Villager } from '../core/types';
import { Tile } from '../core/types';
import type { World } from '../core/world';
import { placementAt } from '../ui/placement';
import type { UiState } from '../ui/state';
import { fmt } from '../ui/text';
import { bake } from './bake';
import type { Camera } from './camera';
import {
  BUILDING_PALETTE,
  BUILDING_SPRITES,
  composeVillager,
  FLAG,
  FLAG_CLOTH,
  FLAG_PALETTE,
  GRASS,
  GROUND_PALETTE,
  type GroundTile,
  OVERHANG_PX,
  RELIC,
  RELIC_GLOW,
  RELIC_PALETTE,
  SPRITE_W,
  STUMP,
  TREE_PALETTE,
  TREE_SPECIES,
  TREES,
  VILLAGER_CLOTH,
  VILLAGER_FEET,
  VILLAGER_FRAMES,
  VILLAGER_H,
  VILLAGER_PALETTE,
  VILLAGER_W,
  type VillagerFrame,
} from './sprites';

// Everything is a sprite except buildings that have none yet (colored rectangles).
const VOID = [0x07, 0x0a, 0x07]; // fog beyond the visible radius
const VOID_KEY = -2; // terrain cache key for a fogged-out cell
const FOG_LIGHT = [1, 1, 0.75, 0.5]; // brightness by fog distance 0..R
const STAGE_AT = [0.7, 0.4, 0.15]; // wood fraction above which each growth stage shows; below → stump
const OVERHANG = OVERHANG_PX / SPRITE_W; // tiles a sprite reaches into the tile above
const BUILDING_COLOR: Record<BuildingKind, string> = {
  townCenter: '#8b5a2b',
  house: '#d8b47a',
  lumberCamp: '#a0522d',
  barn: '#8e3b2e',
  farm: '#cdb14e',
  quarry: '#78909c',
  well: '#4fc3f7',
};
/** Health bar over a chopped tree, in art pixels from the tile's top-left (outline included). */
const BAR = { x: 2, y: 3, w: 12, h: 4 };
const BAR_COLOR = { outline: '#1b1a10', health: '#3fae4a', lost: '#8e2a2a' };
const HOVER_FONT = 'bold 16px Silkscreen, monospace';
const WALK_MS = 140; // per walk frame
const SWING_MS = 260; // per tool-swing frame

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement; // SPRITE_W px per tile, scaled by the camera
  private tctx: CanvasRenderingContext2D;
  /** Ground key last drawn per cell into `terrain` (-1 = never), so only changed cells redraw. */
  private drawn: Int16Array;
  /** Fixed grass variant per cell (index into GRASS), under trees and cleared land alike. */
  private grassAt: Uint8Array;
  /** Baked grass tiles: [fog][variant]. */
  private ground = FOG_LIGHT.map((light) => GRASS.map((t) => bake(t.grid, GROUND_PALETTE, light)));
  /** Baked building sprites (buildings sit in territory, so never fogged). */
  private buildingSprites = Object.fromEntries(
    Object.entries(BUILDING_SPRITES).map(([kind, grid]) => [kind, bake(grid, BUILDING_PALETTE, 1)]),
  ) as Partial<Record<BuildingKind, HTMLCanvasElement>>;
  /** Baked relic stone per fog level, and its glow (only drawn in territory, so never fogged). */
  private relics = FOG_LIGHT.map((light) => bake(RELIC, RELIC_PALETTE, light));
  private relicGlow = bake(RELIC_GLOW, RELIC_PALETTE, 1);
  /** Baked mark flags: red where villagers can reach the tree, yellow until then. */
  private flags = {
    reachable: bake(FLAG, { ...FLAG_PALETTE, ...FLAG_CLOTH.reachable }, 1),
    unreachable: bake(FLAG, { ...FLAG_PALETTE, ...FLAG_CLOTH.unreachable }, 1),
  };
  /** Baked tree sprites: [fog][species][stage], the last stage being the stump. */
  private trees = FOG_LIGHT.map((light) =>
    TREE_SPECIES.map((sp) => [...TREES[sp], STUMP].map((grid) => bake(grid, TREE_PALETTE, light))),
  );
  /** Baked villager frames: [job][frame] = [facing right, facing left]. */
  private villagers = Object.fromEntries(
    (Object.keys(VILLAGER_CLOTH) as Job[]).map((job) => {
      const palette = { ...VILLAGER_PALETTE, ...VILLAGER_CLOTH[job] };
      const frames = VILLAGER_FRAMES.map((f) => {
        const grid = composeVillager(job, f);
        const mirrored = grid.map((r) => [...r].reverse().join(''));
        return [f, [bake(grid, palette, 1), bake(mirrored, palette, 1)]];
      });
      return [job, Object.fromEntries(frames)];
    }),
  ) as Record<Job, Record<VillagerFrame, [HTMLCanvasElement, HTMLCanvasElement]>>;
  /** Last horizontal facing per villager id (true = left), kept while walking straight up/down. */
  private facing = new Map<number, boolean>();

  constructor(
    private canvas: HTMLCanvasElement,
    private cam: Camera,
    w: number,
    h: number,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.terrain = document.createElement('canvas');
    this.terrain.width = w * SPRITE_W;
    this.terrain.height = h * SPRITE_W;
    this.tctx = this.terrain.getContext('2d')!;
    this.drawn = new Int16Array(w * h).fill(-1);
    this.grassAt = pickVariants(w * h, GRASS);
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
    ctx.imageSmoothingEnabled = k < SPRITE_W; // crisp pixels when magnified, averaged when shrunk
    const [ox, oy] = cam.toScreen(0, 0);
    ctx.drawImage(this.terrain, ox, oy, s.w * k, s.h * k);
    this.drawScene(world);
    this.drawTreeHealth(world, ui);

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

  /** Redraws the ground of cells whose fog level changed since the last frame. */
  private drawTerrain(world: World): void {
    const s = world.state;
    const { tctx } = this;
    for (let i = 0; i < s.tiles.length; i++) {
      const fog = world.fog[i];
      const v = this.grassAt[i];
      const key = fog > CONFIG.fogRadius ? VOID_KEY : v * FOG_LIGHT.length + fog;
      if (this.drawn[i] === key) continue;
      this.drawn[i] = key;
      const x = (i % s.w) * SPRITE_W;
      const y = ((i / s.w) | 0) * SPRITE_W;
      if (key === VOID_KEY) {
        tctx.fillStyle = `rgb(${VOID})`;
        tctx.fillRect(x, y, SPRITE_W, SPRITE_W);
      } else tctx.drawImage(this.ground[fog][v], x, y);
    }
  }

  /** Faces the next waypoint, the tree being chopped or the workplace; else keeps the last facing. */
  private faceLeft(world: World, v: Villager): boolean {
    const s = world.state;
    let tx: number | undefined;
    if (v.state === 'chop' && v.target >= 0) tx = (v.target % s.w) + 0.5;
    else if (v.state === 'work') {
      const b = s.buildings.find((b) => b.id === v.workplace);
      if (b) tx = b.x + BUILDINGS[b.kind].w / 2;
    } else if (v.pathI < v.path.length) tx = (v.path[v.pathI] % s.w) + 0.5;
    if (tx !== undefined && Math.abs(tx - v.x) > 0.05) this.facing.set(v.id, tx < v.x);
    return this.facing.get(v.id) ?? false;
  }

  /**
   * Everything standing on the ground, back to front by where it meets the ground: trees (with
   * their flags) and relics by tile row, buildings by their bottom edge, villagers by their feet.
   * Whatever is lower on screen is drawn later, so it overlaps sprites reaching up behind it.
   */
  private drawScene(world: World): void {
    const s = world.state;
    const { ctx, cam } = this;
    const k = cam.zoom;
    const now = performance.now();
    const props: { depth: number; draw: () => void }[] = [];
    for (const b of s.buildings) props.push({ depth: b.y + BUILDINGS[b.kind].h, draw: () => this.drawBuilding(s, b) });
    for (const v of s.villagers) props.push({ depth: villagerDepth(s, v), draw: () => this.drawVillager(world, v, now) });
    props.sort((a, b) => a.depth - b.depth);

    const { x0, x1, y0, y1 } = this.visibleTiles(s);
    const marked = new Set(s.marked);
    const glow = 0.6 + 0.4 * Math.sin(now / 250);
    let p = 0;
    for (let y = y0; y <= y1; y++) {
      while (p < props.length && props[p].depth < y + 1) props[p++].draw(); // trees in row y meet the ground at y + 1
      for (let x = x0; x <= x1; x++) {
        const i = y * s.w + x;
        const tile = s.tiles[i];
        if ((tile !== Tile.Tree && tile !== Tile.Relic) || world.fog[i] > CONFIG.fogRadius) continue;
        const [sx, sy] = cam.toScreen(x, y - OVERHANG);
        const w = k;
        const h = k * (1 + OVERHANG);
        if (tile === Tile.Relic) {
          ctx.drawImage(this.relics[world.fog[i]], sx, sy, w, h);
          if (isCollectable(s, i)) {
            ctx.globalAlpha = glow;
            ctx.drawImage(this.relicGlow, sx, sy, w, h);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        const f = s.wood[i] / world.maxWood[i];
        let stage = 0;
        while (stage < STAGE_AT.length && f <= STAGE_AT[stage]) stage++;
        const species = (Math.imul(i, 0x9e3779b1) >>> 16) % TREE_SPECIES.length; // fixed per tile
        ctx.drawImage(this.trees[world.fog[i]][species][stage], sx, sy, w, h);
        if (marked.has(i)) ctx.drawImage(isChoppable(s, i) ? this.flags.reachable : this.flags.unreachable, sx, sy, w, h);
      }
    }
    while (p < props.length) props[p++].draw();
  }

  /** Tile range on screen, including the row whose sprites overhang into the bottom edge. */
  private visibleTiles(s: GameState): { x0: number; x1: number; y0: number; y1: number } {
    const [wx0, wy0] = this.cam.toWorld(0, 0);
    const [wx1, wy1] = this.cam.toWorld(this.cam.vw, this.cam.vh);
    return {
      x0: Math.max(0, Math.floor(wx0)),
      x1: Math.min(s.w - 1, Math.floor(wx1)),
      y0: Math.max(0, Math.floor(wy0)),
      y1: Math.min(s.h - 1, Math.floor(wy1 + OVERHANG)),
    };
  }

  /**
   * Overlay above the scene: a health bar on every visible tree that has been chopped, and the
   * hovered tree's wood left / full-grown wood.
   */
  private drawTreeHealth(world: World, ui: UiState): void {
    const s = world.state;
    const { ctx, cam } = this;
    const px = cam.zoom / SPRITE_W; // screen px per art px
    const visible = (i: number) => s.tiles[i] === Tile.Tree && world.fog[i] <= CONFIG.fogRadius;
    const barTop = (x: number, y: number) => cam.toScreen(x + BAR.x / SPRITE_W, y + BAR.y / SPRITE_W);

    const { x0, x1, y0, y1 } = this.visibleTiles(s);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * s.w + x;
        if (!visible(i) || s.wood[i] >= world.maxWood[i]) continue;
        const [sx, sy] = barTop(x, y);
        // Whole screen pixels keep the bar crisp; the outline stays at least 1 px.
        const l = Math.round(sx);
        const t = Math.round(sy);
        const w = Math.round(BAR.w * px);
        const h = Math.max(3, Math.round(BAR.h * px));
        const o = Math.max(1, Math.round(px));
        const inner = w - 2 * o;
        const fill = Math.ceil(inner * (s.wood[i] / world.maxWood[i]));
        ctx.fillStyle = BAR_COLOR.outline;
        ctx.fillRect(l, t, w, h);
        ctx.fillStyle = BAR_COLOR.lost;
        ctx.fillRect(l + o + fill, t + o, inner - fill, h - 2 * o);
        ctx.fillStyle = BAR_COLOR.health;
        ctx.fillRect(l + o, t + o, fill, h - 2 * o);
      }
    }

    if (ui.placing || !ui.hover || !inBounds(s, ui.hover.x, ui.hover.y)) return;
    const i = tileAt(s, ui.hover.x, ui.hover.y);
    if (!visible(i)) return;
    const x = i % s.w;
    const [cx] = cam.toScreen(x + 0.5, 0);
    const [, ty] = barTop(x, (i / s.w) | 0);
    const label = `${fmt(Math.ceil(s.wood[i]))}/${fmt(world.maxWood[i])}`;
    ctx.font = HOVER_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(27,26,16,.85)';
    ctx.strokeText(label, cx, ty - 2);
    ctx.fillStyle = '#f6dca0';
    ctx.fillText(label, cx, ty - 2);
  }

  private drawBuilding(s: GameState, b: Building): void {
    const { ctx, cam } = this;
    const k = cam.zoom;
    const d = BUILDINGS[b.kind];
    const footprint = () => {
      const [sx, sy] = cam.toScreen(b.x + 0.05, b.y + 0.05);
      ctx.fillRect(sx, sy, (d.w - 0.1) * k, (d.h - 0.1) * k);
    };
    const sprite = this.buildingSprites[b.kind];
    if (sprite) {
      const [sx, sy] = cam.toScreen(b.x, b.y - OVERHANG);
      ctx.drawImage(sprite, sx, sy, d.w * k, (d.h + OVERHANG) * k);
    } else {
      ctx.fillStyle = BUILDING_COLOR[b.kind];
      footprint();
    }
    if (s.paused.includes(b.id)) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      footprint();
    }
  }

  private drawVillager(world: World, v: Villager, now: number): void {
    const { ctx, cam } = this;
    const k = cam.zoom;
    const sprite = this.villagers[v.job][villagerFrame(v, now)][this.faceLeft(world, v) ? 1 : 0];
    const [sx, sy] = cam.toScreen(v.x - VILLAGER_FEET.x / SPRITE_W, v.y - VILLAGER_FEET.y / SPRITE_W);
    ctx.drawImage(sprite, sx, sy, (VILLAGER_W / SPRITE_W) * k, (VILLAGER_H / SPRITE_W) * k);
  }
}

/**
 * A villager's ground line is its feet, except on a building's tiles (a farmer in the field, a
 * miner in the pit, a delivery in the yard), where it is drawn over that building.
 */
function villagerDepth(s: GameState, v: Villager): number {
  const i = tileAt(s, v.x, v.y);
  const b = s.tiles[i] === Tile.Building ? buildingAt(s, i) : undefined;
  return b ? b.y + BUILDINGS[b.kind].h + 0.01 : v.y;
}

/** Animation frame from state and wall-clock time; the id offsets each villager's cycle. */
function villagerFrame(v: Villager, now: number): VillagerFrame {
  if (v.state === 'idle') return 'stand';
  const working = v.state === 'chop' || v.state === 'work';
  const odd = Math.floor(now / (working ? SWING_MS : WALK_MS) + v.id * 0.37) % 2 === 1;
  if (working) return odd ? 'work2' : 'work1';
  if (v.state === 'toHome' && v.carry > 0) return odd ? 'carry2' : 'carry1';
  return odd ? 'walk2' : 'walk1';
}

/** A fixed weighted variant per cell, from a hash of its index. */
function pickVariants(n: number, tiles: readonly GroundTile[]): Uint8Array {
  const total = tiles.reduce((t, g) => t + g.weight, 0);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let r = (hash(i) / 2 ** 32) * total;
    let v = 0;
    while (r >= tiles[v].weight) r -= tiles[v++].weight;
    out[i] = v;
  }
  return out;
}

/** murmur3 finalizer: well-mixed 32 bits from consecutive integers. */
function hash(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return (n ^ (n >>> 16)) >>> 0;
}

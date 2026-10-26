import { CONFIG } from '../config';
import { border, BUILDINGS, type BuildingKind, buildingAt, buildingGap } from '../core/buildings';
import { canMoveBuilding, canMoveDecor, canPlace, canPlaceDecor, canPlaceRoad } from '../core/commands';
import { DECOR, DECOR_KINDS, decorAt, type DecorKind, type DecorLayer } from '../core/decor';
import { inBounds, isChoppable, isCollectable, tileAt } from '../core/grid';
import { linkedBuildings, roadNetwork, wouldLink } from '../core/roads';
import { SEASONS, seasonLeft, seasonOf, WINTER } from '../core/seasons';
import { getStats, wellFarms, wellReach } from '../core/stats';
import { carried } from '../core/systems/workplace';
import type { Building, Decor, GameState, Job, Mule, ResourceKey, Villager, Walker } from '../core/types';
import { RESOURCES, Tile } from '../core/types';
import { visionRadius, type Fx, type World } from '../core/world';
import { paints, placementAt } from '../ui/placement';
import type { UiState } from '../ui/state';
import { fmt } from '../ui/text';
import { bake, halo } from './bake';
import type { Camera } from './camera';
import { CRITTER_MIN_ZOOM, critterFrame, Critters, hopLift, TRACK_LIFE, type Critter } from './critters';
import { farmJoins } from './farms';
import {
  BUILDING_ENTRANCES,
  BUILDING_SPRITES,
  CHIMNEYS,
  composeCritter,
  composeMule,
  CRITTER_PALETTE,
  CRITTER_VARIANTS,
  CRITTERS,
  type CritterSprite,
  composeRoad,
  composeVillager,
  FLAG,
  FLAG_CLOTH,
  FLAG_PALETTE,
  GRASS,
  GROUND_PALETTE,
  GROUND_TINTS,
  HOUSE_LIGHTS,
  joinFarm,
  LIGHTS_PALETTE,
  type GroundTile,
  MULE_FEET,
  MULE_FRAMES,
  MULE_H,
  MULE_PALETTE,
  MULE_W,
  type MuleFrame,
  OVERHANG_PX,
  RELIC,
  RELIC_GLOW,
  RELIC_PALETTE,
  RELIC_TINTS,
  ROAD_PALETTE,
  ROAD_TINTS,
  seasonalBuilding,
  seasonalDecor,
  SPRITE_W,
  STONE_HOUSE,
  STONE_HOUSE_TINT,
  STUMP,
  TREE_PALETTE,
  TREE_SPECIES,
  TREE_TINTS,
  TREES,
  UI_ICON_W,
  UI_ICONS,
  UI_PALETTE,
  VILLAGER_CLOTH,
  VILLAGER_FEET,
  VILLAGER_FRAMES,
  VILLAGER_H,
  VILLAGER_PALETTE,
  VILLAGER_W,
  type VillagerFrame,
  WINTER_RELIC,
  WINTER_STUMP,
  WINTER_TREES,
} from './sprites';

// Everything is a sprite except buildings that have none yet (colored rectangles).
const VOID = [0x07, 0x0a, 0x07]; // fog beyond the visible radius
const VOID_KEY = -2; // terrain cache key for a fogged-out cell
const ROAD_KEY = 10_000; // terrain cache keys from here up are road cells
const ISOLATED_ROAD_LIGHT = 0.7; // roads not (yet) joined to the Town Center are drawn darker
const FOG_LIGHT = [1, 1, 0.75, 0.5, 0.4, 0.3]; // brightness by fog distance 0..MAX_FOG (Keen Eyes sees the last rings)
const FX_MS = 1100; // how long a floating skill effect rises and fades
const FX_RISE = 0.6; // tiles it rises
const FX_FONT = '800 15px system-ui, "Segoe UI", sans-serif';
/** Each effect's floating text, from its formatted and raw amount. The festival shows as a toast instead. */
const FX_TEXT: Record<Fx['kind'], (n: string, raw: number) => string> = {
  combo: (_, raw) => `×${raw.toFixed(1)}`,
  heartwood: (n) => `+${n}!`,
  timber: (n) => `Timber! +${n}`,
  festival: (n) => `+${n} food`,
  shearing: (n) => `Shearing! +${n} cloth`,
  fleece: (n) => `Golden Fleece! +${n}`,
  geode: (n) => `Gem! +${n} gold`,
  grazed: (n) => `Grazed! +${n}`,
  blast: (n) => (n === '0' ? 'BOOM!' : `BOOM! +${n} stone`),
  fair: () => 'Midsummer Fair!', // shown as toasts
  caravan: () => 'Caravan!',
  birth: (n, raw) => `+${n} villager${raw === 1 ? '' : 's'}`,
  springBirths: () => 'Spring Births!', // shown as a toast
  achievement: () => '',
};
const FX_COLOR: Partial<Record<Fx['kind'], string>> = { combo: '#bfe6ff', blast: '#ff9a4a', shearing: '#f2efe6', birth: '#ffc8dc' };
const WINTER_FADE = 10; // s the winter tint takes to fade in or out
const SEASON_STAGGER = 15; // s over which tiles turn to a new season, each at its own moment
const STAGE_AT = [0.7, 0.4, 0.15]; // wood fraction above which each growth stage shows; below → stump
const OVERHANG = OVERHANG_PX / SPRITE_W; // tiles a sprite reaches into the tile above
const TWINKLE_MS = 650; // ms per frame of a house's Christmas lights
const SMOKE_PUFFS = 4; // puffs rising from a chimney at once
const SMOKE_MS = 3200; // ms a puff takes to rise and fade
const SMOKE_RISE = 14; // art px a puff rises
const SMOKE_DRIFT = 6; // art px the wind carries it sideways
const MULE_SPREAD = [[0, 0], [-0.3, 0.15], [0.3, 0.15], [-0.15, -0.2], [0.15, -0.2]] as const; // tiles each of a post's mules is drawn off its spot
// Every relic in sight glows faintly, so it stands out in the forest: a soft halo and a slow pulse of its outline glow.
// One your land touches glows at full strength, quickly, to say it can be collected.
const RELIC_HALO = { radius: 1.2, alpha: [0.22, 0.38], outline: [0.15, 0.35], ms: 1400 }; // radius in tiles; alpha low–high
const BUILDING_COLOR: Record<BuildingKind, string> = {
  townCenter: '#8b5a2b',
  outpost: '#9a6a34',
  house: '#d8b47a',
  lumberCamp: '#a0522d',
  barn: '#8e3b2e',
  farm: '#cdb14e',
  orchard: '#5f8f3e',
  quarry: '#78909c',
  sheepFarm: '#9ccc65',
  cottonPlantation: '#e8e2d0',
  tailor: '#a5689b',
  well: '#4fc3f7',
  market: '#b23b2e',
  taxOffice: '#9aa3ac',
  tradingPost: '#8f7149',
  masonsYard: '#a9a196',
};
/** Health bar over a chopped tree, in art pixels from the tile's top-left (outline included). */
const BAR = { x: 2, y: 3, w: 12, h: 4 };
const BAR_COLOR = { outline: '#1b1a10', health: '#3fae4a', lost: '#8e2a2a' };
const HOVER_FONT = '600 16px system-ui, "Segoe UI", sans-serif';
/** Tag over a villager's head showing what it carries, in CSS px. */
const TAG = { font: '700 12px system-ui, "Segoe UI", sans-serif', pad: 2, gap: 3, lift: 2, bg: 'rgba(20,16,10,.85)', text: '#f6dca0' };
const WALK_MS = 140; // per walk frame
const SWING_MS = 260; // per tool-swing frame

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement; // SPRITE_W px per tile, scaled by the camera
  private tctx: CanvasRenderingContext2D;
  /** Ground key last drawn per cell into `terrain` (-1 = never), so only changed cells redraw. */
  private drawn: Int16Array;
  /** Skill effects still rising, with the wall-clock time each appeared. */
  private floaters: { fx: Fx; born: number }[] = [];
  /** Fixed grass variant per cell (index into GRASS), under trees and cleared land alike. */
  private grassAt: Uint8Array;
  /** Seconds into each season before a cell shows it, so the map turns gradually. */
  private turnAt: Float32Array;
  /** Baked grass tiles: [season][fog][variant]. */
  private ground = SEASONS.map((season) => {
    const palette = { ...GROUND_PALETTE, ...GROUND_TINTS[season] };
    return FOG_LIGHT.map((light) => GRASS.map((t) => bake(t.grid, palette, light)));
  });
  /** Baked road tiles: [season][connected 0, isolated 1][mask of joined neighbors]. */
  private roads = SEASONS.map((season) => {
    const palette = { ...ROAD_PALETTE, ...ROAD_TINTS[season] };
    return [1, ISOLATED_ROAD_LIGHT].map((light) => Array.from({ length: 16 }, (_, mask) => bake(composeRoad(mask), palette, light)));
  });
  /** Baked building sprites per season (buildings sit in territory, so never fogged). */
  private buildingSprites = SEASONS.map((season) => {
    const kinds = Object.keys(BUILDING_SPRITES) as BuildingKind[];
    return Object.fromEntries(
      kinds.map((kind) => {
        const { grid, palette } = seasonalBuilding(kind, season)!;
        return [kind, bake(grid, palette, 1)];
      }),
    ) as Partial<Record<BuildingKind, HTMLCanvasElement>>;
  });
  /** Baked house sprite per season for a house rebuilt in stone. */
  private stoneHouseSprites = SEASONS.map((season) => {
    const { grid, palette } = seasonalBuilding('house', season, false, STONE_HOUSE)!;
    return bake(grid, { ...palette, ...STONE_HOUSE_TINT }, 1);
  });
  /** Baked farm sprites by season, Well (irrigated fields) and `farmJoins` mask, baked when first drawn. */
  private farmSprites = new Map<string, HTMLCanvasElement>();
  /** Baked decorations: [season][kind][join mask] (only joining kinds have more than one). Like buildings, never fogged. */
  private decorSprites = SEASONS.map((season) =>
    Object.fromEntries(DECOR_KINDS.map((kind) => [kind, Array.from({ length: DECOR[kind].joins ? 16 : 1 }, (_, mask) => {
      const { grid, palette } = seasonalDecor(kind, season, mask);
      return bake(grid, palette, 1);
    })])) as Record<DecorKind, HTMLCanvasElement[]>,
  );
  /** Baked Christmas lights for winter houses, one per twinkle frame. */
  private lights = HOUSE_LIGHTS.map((g) => bake(g, LIGHTS_PALETTE, 1));
  /** Baked relic stone: [season][fog]; its outline glow and the halo behind it (lights, so never fogged). */
  private relics = SEASONS.map((season) => {
    const palette = { ...RELIC_PALETTE, ...RELIC_TINTS[season] };
    return FOG_LIGHT.map((light) => bake(season === 'winter' ? WINTER_RELIC : RELIC, palette, light));
  });
  private relicGlow = bake(RELIC_GLOW, RELIC_PALETTE, 1);
  private relicHalo = halo(RELIC_PALETTE.Y);
  /** Baked resource icons for carry tags. */
  private resourceIcons = Object.fromEntries(RESOURCES.map((r) => [r, bake(UI_ICONS[r], UI_PALETTE, 1)])) as Record<ResourceKey, HTMLCanvasElement>;
  /** Baked mark flags: red where villagers can reach the tree, yellow until then. */
  private flags = {
    reachable: bake(FLAG, { ...FLAG_PALETTE, ...FLAG_CLOTH.reachable }, 1),
    unreachable: bake(FLAG, { ...FLAG_PALETTE, ...FLAG_CLOTH.unreachable }, 1),
  };
  /** Baked tree sprites: [season][fog][species][stage], the last stage being the stump. */
  private trees = SEASONS.map((season) =>
    FOG_LIGHT.map((light) =>
      TREE_SPECIES.map((sp) => {
        const palette = { ...TREE_PALETTE, ...TREE_TINTS[season][sp] };
        const grids = season === 'winter' ? [...WINTER_TREES[sp], WINTER_STUMP] : [...TREES[sp], STUMP];
        return grids.map((grid) => bake(grid, palette, light));
      }),
    ),
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
  /** Baked pack mule frames: [frame][empty, loaded] = [facing right, facing left]. */
  private mules = Object.fromEntries(
    MULE_FRAMES.map((f) => [f, [false, true].map((loaded) => {
      const grid = composeMule(f, loaded);
      const mirrored = grid.map((r) => [...r].reverse().join(''));
      return [bake(grid, MULE_PALETTE, 1), bake(mirrored, MULE_PALETTE, 1)];
    })]),
  ) as Record<MuleFrame, [HTMLCanvasElement, HTMLCanvasElement][]>;
  /** Baked forest creature frames: [sprite][palette variant][frame] = [facing right, facing left]. */
  private critterSprites = Object.fromEntries(
    (Object.keys(CRITTERS) as CritterSprite[]).map((sprite) => [sprite, (CRITTER_VARIANTS[sprite] ?? [{}]).map((variant) => {
      const palette = { ...CRITTER_PALETTE, ...variant };
      return Object.fromEntries(Object.keys(CRITTERS[sprite]).map((f) => {
        const grid = composeCritter(sprite, f);
        const mirrored = grid.map((r) => [...r].reverse().join(''));
        return [f, [bake(grid, palette, 1), bake(mirrored, palette, 1)]];
      }));
    })]),
  ) as Record<CritterSprite, Record<string, [HTMLCanvasElement, HTMLCanvasElement]>[]>;
  /** Forest creatures: ambience only, kept here and never in the game state. */
  private critters = new Critters();
  private lastDraw = performance.now(); // wall-clock ms of the last frame, to step the creatures
  /** Last horizontal facing per villager or mule id (true = left), kept while walking straight up/down. */
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
    this.turnAt = Float32Array.from({ length: w * h }, (_, i) => (hash(i ^ 0x5bd1e995) / 2 ** 32) * SEASON_STAGGER);
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
    /** A building's reach of `r` tiles around its footprint at (x, y): a dashed square. */
    const reachSquare = (kind: BuildingKind, x: number, y: number, r: number, color: string) => {
      const [sx, sy] = cam.toScreen(x - r, y - r);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx, sy, (BUILDINGS[kind].w + 2 * r) * k, (BUILDINGS[kind].h + 2 * r) * k);
      ctx.setLineDash([]);
    };
    /** A Well's reach in water blue; with Camp Crews, a Lumber Camp's faster-chopping reach in sawdust gold. */
    const reach = (kind: BuildingKind, x: number, y: number) => {
      if (kind === 'well') reachSquare(kind, x, y, wellReach(s), 'rgb(110,190,255)');
      if (kind === 'lumberCamp') {
        const st = getStats(s);
        if (st.campBonus > 1) reachSquare(kind, x, y, st.campRadius, 'rgb(240,190,90)');
      }
    };

    const net = roadNetwork(s);
    this.drawTerrain(world, net);
    const now = performance.now();
    // Creatures step on wall-clock time (capped, so a hidden tab doesn't teleport them) and only while big enough to see.
    if (k >= CRITTER_MIN_ZOOM) this.critters.step(world, this.visibleTiles(s), Math.min(0.1, (now - this.lastDraw) / 1000));
    else this.critters.clear();
    this.lastDraw = now;
    ctx.fillStyle = `rgb(${VOID})`;
    ctx.fillRect(0, 0, cam.vw, cam.vh);
    ctx.imageSmoothingEnabled = k < SPRITE_W; // crisp pixels when magnified, averaged when shrunk
    const [ox, oy] = cam.toScreen(0, 0);
    ctx.drawImage(this.terrain, ox, oy, s.w * k, s.h * k);
    this.drawGroundDecor(s);
    this.drawTracks();
    const links = linkedBuildings(s, net);
    this.drawScene(world, links);
    this.drawFlyers(now);
    this.drawWinter(s.time);
    this.drawTreeHealth(world, ui);
    this.drawCarryTags(s);
    this.drawFx(s);

    if (ui.selected) {
      const d = BUILDINGS[ui.selected.kind];
      const [sx, sy] = cam.toScreen(ui.selected.x, ui.selected.y);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, d.w * k, d.h * k);
      reach(ui.selected.kind, ui.selected.x, ui.selected.y);
    }
    if (ui.decorSel) {
      const [sx, sy] = cam.toScreen(ui.decorSel.x, ui.decorSel.y);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, DECOR[ui.decorSel.kind].w * k, DECOR[ui.decorSel.kind].h * k);
    }
    if (ui.road !== null) {
      const [sx, sy] = cam.toScreen(ui.road % s.w, (ui.road / s.w) | 0);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, k, k);
    }

    const placing = ui.moving?.kind ?? ui.placing;
    if (placing && ui.hover) {
      const { x, y } = placementAt(placing, ui.hover.x, ui.hover.y);
      const d = BUILDINGS[placing];
      const valid = ui.moving ? canMoveBuilding(world, ui.moving.id, x, y) : canPlace(world, placing, x, y);
      // Yellow: it can stand there but would be isolated until a road reaches it.
      const linked = wouldLink(s, { kind: placing, x, y }, net, links, ui.moving?.id);
      ctx.fillStyle = !valid ? 'rgba(230,60,60,.55)' : linked ? 'rgba(80,220,100,.55)' : 'rgba(240,200,60,.55)';
      rect(x, y, d.w, d.h);
      reach(placing, x, y);
      // Outline in water blue the connected farms a Well here would boost.
      if (placing === 'well' && valid) {
        const reach = wellReach(s);
        for (const f of s.buildings) {
          if (f.kind !== 'farm' || !links.has(f.id) || buildingGap(f, { kind: 'well', x, y }) > reach) continue;
          const [sx, sy] = cam.toScreen(f.x, f.y);
          ctx.strokeRect(sx, sy, BUILDINGS.farm.w * k, BUILDINGS.farm.h * k);
        }
      }
    }

    if (ui.paving && ui.hover && inBounds(s, ui.hover.x, ui.hover.y)) {
      const i = tileAt(s, ui.hover.x, ui.hover.y);
      // Orange: a road to lift; green: road can be laid; red: neither.
      ctx.fillStyle = s.tiles[i] === Tile.Road ? 'rgba(240,150,60,.55)' : canPlaceRoad(world, i) ? 'rgba(80,220,100,.55)' : 'rgba(230,60,60,.55)';
      rect(i % s.w, (i / s.w) | 0, 1, 1);
    }

    // A decoration aimed (moved, or a bigger one placed): green where it fits, red where not.
    const d = ui.decorSel;
    const decorAim = ui.movingDecor && d ? d.kind : ui.decor && !paints(ui.decor) ? ui.decor : null;
    if (decorAim && ui.hover) {
      const { x, y } = placementAt(decorAim, ui.hover.x, ui.hover.y);
      const valid = ui.movingDecor && d ? canMoveDecor(world, d.y * s.w + d.x, DECOR[d.kind].layer, x, y) : canPlaceDecor(world, decorAim, x, y);
      ctx.fillStyle = valid ? 'rgba(80,220,100,.55)' : 'rgba(230,60,60,.55)';
      rect(x, y, DECOR[decorAim].w, DECOR[decorAim].h);
    }

    // The decoration brush: orange where it would lift one of its kind, green where it would lay one, red where neither.
    if (ui.decor && paints(ui.decor) && ui.hover && inBounds(s, ui.hover.x, ui.hover.y)) {
      const i = tileAt(s, ui.hover.x, ui.hover.y);
      const lift = decorAt(s, i, DECOR[ui.decor].layer)?.kind === ui.decor;
      ctx.fillStyle = lift ? 'rgba(240,150,60,.55)' : canPlaceDecor(world, ui.decor, i % s.w, (i / s.w) | 0) ? 'rgba(80,220,100,.55)' : 'rgba(230,60,60,.55)';
      rect(i % s.w, (i / s.w) | 0, 1, 1);
    }

    if (ui.movingRoad && ui.hover && inBounds(s, ui.hover.x, ui.hover.y)) {
      const i = tileAt(s, ui.hover.x, ui.hover.y);
      ctx.fillStyle = s.tiles[i] === Tile.Grass ? 'rgba(80,220,100,.55)' : 'rgba(230,60,60,.55)';
      rect(i % s.w, (i / s.w) | 0, 1, 1);
    }
  }

  /** Flat decorations (flower beds, paving, ponds): over the ground, under everything standing on it. */
  private drawGroundDecor(s: GameState): void {
    const { ctx, cam } = this;
    const k = cam.zoom;
    const { x0, x1, y0, y1 } = this.visibleTiles(s);
    const joined = joinedDecor(s, 'ground');
    for (const d of s.decor) {
      const { w, h, layer } = DECOR[d.kind];
      if (layer !== 'ground' || d.x > x1 || d.x + w <= x0 || d.y > y1 || d.y + h <= y0) continue;
      const [sx, sy] = cam.toScreen(d.x, d.y);
      ctx.drawImage(this.decorSprites[this.seasonAt(s.time, d.y * s.w + d.x)][d.kind][joinMask(s, d, joined)], sx, sy, w * k, h * k);
    }
  }

  /** A standing decoration; a fence, hedge or wall joins the pieces of its kind beside it (`joined`: their kind by tile). */
  private drawDecor(s: GameState, d: Decor, joined: ReadonlyMap<number, DecorKind>): void {
    const { w, h } = DECOR[d.kind];
    const [sx, sy] = this.cam.toScreen(d.x, d.y - OVERHANG);
    this.ctx.drawImage(this.decorSprites[this.seasonAt(s.time, d.y * s.w + d.x)][d.kind][joinMask(s, d, joined)], sx, sy, w * this.cam.zoom, (h + OVERHANG) * this.cam.zoom);
  }

  /** Snowy tint over the map in winter, fading in and out at the season's edges. */
  private drawWinter(time: number): void {
    if (seasonOf(time) !== WINTER) return;
    const left = seasonLeft(time);
    const fade = Math.min(1, left / WINTER_FADE, (CONFIG.seasons.length - left) / WINTER_FADE);
    this.ctx.fillStyle = `rgba(225,238,255,${(0.22 * fade).toFixed(3)})`;
    this.ctx.fillRect(0, 0, this.cam.vw, this.cam.vh);
  }

  /** Season shown at cell `i`, which turns `turnAt[i]` seconds after the season starts. */
  private seasonAt(time: number, i: number): number {
    return seasonOf(Math.max(0, time - this.turnAt[i]));
  }

  /**
   * Redraws the ground of cells whose fog level or shown season changed since the last frame, and
   * road cells whose joins or connection changed. `net` marks the connected roads.
   */
  private drawTerrain(world: World, net: Uint8Array): void {
    const s = world.state;
    const { tctx } = this;
    const entrances = roadEntrances(s, net);
    const vision = visionRadius(s);
    for (let i = 0; i < s.tiles.length; i++) {
      const fog = world.fog[i];
      const v = this.grassAt[i];
      const season = this.seasonAt(s.time, i);
      const road = s.tiles[i] === Tile.Road ? roadMask(s, i, entrances) : -1;
      const key = fog > vision ? VOID_KEY
        : road >= 0 ? ROAD_KEY + (season * 2 + 1 - net[i]) * 16 + road
        : (season * FOG_LIGHT.length + fog) * GRASS.length + v;
      if (this.drawn[i] === key) continue;
      this.drawn[i] = key;
      const x = (i % s.w) * SPRITE_W;
      const y = ((i / s.w) | 0) * SPRITE_W;
      if (key === VOID_KEY) {
        tctx.fillStyle = `rgb(${VOID})`;
        tctx.fillRect(x, y, SPRITE_W, SPRITE_W);
        continue;
      }
      tctx.drawImage(this.ground[season][fog][v], x, y);
      if (road >= 0) tctx.drawImage(this.roads[season][1 - net[i]][road], x, y);
    }
  }

  /** Faces the next waypoint, the tree being chopped or the workplace; else keeps the last facing. */
  private faceLeft(world: World, v: Villager | Mule): boolean {
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
  private drawScene(world: World, linked: ReadonlySet<number>): void {
    const s = world.state;
    const { ctx, cam } = this;
    const k = cam.zoom;
    const now = performance.now();
    const vision = visionRadius(s);
    const props: { depth: number; draw: () => void }[] = [];
    const wellFed = wellFarms(s, linked);
    const joins = farmJoins(s);
    for (const b of s.buildings) {
      props.push({ depth: b.y + BUILDINGS[b.kind].h, draw: () => this.drawBuilding(s, b, !linked.has(b.id), wellFed.has(b.id), joins.get(b.id) ?? 0, now) });
    }
    const view = this.visibleTiles(s);
    const joined = joinedDecor(s, 'prop');
    for (const d of s.decor) {
      const { w, h, layer } = DECOR[d.kind];
      if (layer !== 'prop' || d.x > view.x1 || d.x + w <= view.x0 || d.y > view.y1 || d.y + h <= view.y0) continue;
      props.push({ depth: d.y + h, draw: () => this.drawDecor(s, d, joined) });
    }
    for (const v of s.villagers) props.push({ depth: villagerDepth(s, v), draw: () => this.drawVillager(world, v, now) });
    for (const m of s.mules) props.push({ depth: villagerDepth(s, m), draw: () => this.drawMule(world, m, now) });
    for (const c of this.critters.list) if (onGround(c)) props.push({ depth: c.y, draw: () => this.drawCritter(c, now) });
    props.sort((a, b) => a.depth - b.depth);

    const { x0, x1, y0, y1 } = view;
    const marked = new Set(s.marked);
    const glow = 0.6 + 0.4 * Math.sin(now / 250);
    const faint = 0.5 + 0.5 * Math.sin(now / RELIC_HALO.ms);
    const [hLo, hHi] = RELIC_HALO.alpha;
    const [oLo, oHi] = RELIC_HALO.outline;
    const r = RELIC_HALO.radius * k;
    let p = 0;
    for (let y = y0; y <= y1; y++) {
      while (p < props.length && props[p].depth < y + 1) props[p++].draw(); // trees in row y meet the ground at y + 1
      for (let x = x0; x <= x1; x++) {
        const i = y * s.w + x;
        const tile = s.tiles[i];
        if ((tile !== Tile.Tree && tile !== Tile.Relic) || world.fog[i] > vision) continue;
        const [sx, sy] = cam.toScreen(x, y - OVERHANG);
        const w = k;
        const h = k * (1 + OVERHANG);
        if (tile === Tile.Relic) {
          ctx.drawImage(this.relics[this.seasonAt(s.time, i)][world.fog[i]], sx, sy, w, h);
          ctx.globalAlpha = isCollectable(s, i) ? glow : oLo + (oHi - oLo) * faint;
          ctx.drawImage(this.relicGlow, sx, sy, w, h);
          ctx.globalAlpha = 1;
          continue;
        }
        const f = s.wood[i] / world.maxWood[i];
        let stage = 0;
        while (stage < STAGE_AT.length && f <= STAGE_AT[stage]) stage++;
        const species = (Math.imul(i, 0x9e3779b1) >>> 16) % TREE_SPECIES.length; // fixed per tile
        ctx.drawImage(this.trees[this.seasonAt(s.time, i)][world.fog[i]][species][stage], sx, sy, w, h);
        if (marked.has(i)) ctx.drawImage(isChoppable(s, i) ? this.flags.reachable : this.flags.unreachable, sx, sy, w, h);
      }
    }
    while (p < props.length) props[p++].draw();
    // Relic halos go over the whole scene, like light, so trees on every side are lit alike.
    for (const i of s.relics) {
      const x = i % s.w;
      const y = (i / s.w) | 0;
      if (x < x0 || x > x1 || y < y0 || y > y1 || world.fog[i] > vision) continue;
      const [cx, cy] = cam.toScreen(x + 0.5, y + 0.45);
      ctx.globalAlpha = isCollectable(s, i) ? hHi : hLo + (hHi - hLo) * faint;
      ctx.drawImage(this.relicHalo, cx - r, cy - r, 2 * r, 2 * r);
    }
    ctx.globalAlpha = 1;
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
    const vision = visionRadius(s);
    const visible = (i: number) => s.tiles[i] === Tile.Tree && world.fog[i] <= vision;
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

    if (ui.placing || ui.moving || ui.paving || ui.decor || ui.movingDecor || !ui.hover || !inBounds(s, ui.hover.x, ui.hover.y)) return;
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

  /** Shows a skill effect (combo, Heartwood, Timber!, jackpots, grazing, blasts) as text rising from its tile. */
  addFx(fx: Fx, now: number): void {
    this.floaters.push({ fx, born: now });
  }

  private drawFx(s: GameState): void {
    const { ctx, cam } = this;
    const now = performance.now();
    this.floaters = this.floaters.filter((f) => now - f.born < FX_MS);
    if (!this.floaters.length) return;
    ctx.font = FX_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    for (const { fx, born } of this.floaters) {
      const t = (now - born) / FX_MS;
      const [x, y] = cam.toScreen((fx.i % s.w) + 0.5, ((fx.i / s.w) | 0) - FX_RISE * t);
      const text = FX_TEXT[fx.kind](fmt(fx.n), fx.n);
      ctx.globalAlpha = 1 - t * t;
      ctx.strokeStyle = 'rgba(27,26,16,.9)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = FX_COLOR[fx.kind] ?? '#ffd75e';
      ctx.fillText(text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  /** Zoomed in: a tag over each villager's (and mule's) head with the resource it carries and how much. Empty hands show none. */
  private drawCarryTags(s: GameState): void {
    const { ctx, cam } = this;
    if (cam.zoom < CONFIG.camera.carryZoom) return;
    ctx.font = TAG.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const h = UI_ICON_W + 2 * TAG.pad;
    const st = getStats(s);
    const carriers = [
      ...s.villagers.map((v) => ({ v, top: VILLAGER_FEET.y, load: () => carried(st, v) })),
      ...s.mules.map((v) => ({ v, top: MULE_FEET.y, load: () => [{ res: 'gold' as ResourceKey, n: v.carry }] })),
    ];
    for (const { v, top, load } of carriers) {
      if (v.carry < 1) continue;
      const [cx, head] = cam.toScreen(v.x, v.y - top / SPRITE_W);
      if (cx < -cam.zoom || cx > cam.vw + cam.zoom || head < 0 || head > cam.vh + cam.zoom) continue;
      // One icon and count per resource the load delivers (a herder's cloth and food).
      const items = load()
        .map(({ res, n }) => ({ res, label: fmt(Math.floor(n)), n }))
        .filter(({ n }) => n >= 1)
        .map((it) => ({ ...it, w: UI_ICON_W + TAG.gap + Math.ceil(ctx.measureText(it.label).width) }));
      const w = 2 * TAG.pad + items.reduce((sum, it) => sum + it.w, 0) + 2 * TAG.gap * (items.length - 1);
      // Whole screen pixels keep the icon crisp.
      const l = Math.round(cx - w / 2);
      const t = Math.round(head - TAG.lift - h);
      ctx.fillStyle = TAG.bg;
      ctx.fillRect(l, t, w, h);
      let x = l + TAG.pad;
      for (const it of items) {
        ctx.drawImage(this.resourceIcons[it.res], x, t + TAG.pad, UI_ICON_W, UI_ICON_W);
        ctx.fillStyle = TAG.text;
        ctx.fillText(it.label, x + UI_ICON_W + TAG.gap, t + h / 2 + 1);
        x += it.w + 2 * TAG.gap;
      }
    }
  }

  /**
   * `isolated`: not connected by road, so tinted grey until it is. `wellFed`: a farm a Well boosts, drawn irrigated;
   * `joins`: a farm's edge tiles touching other farms (`farmJoins`), where its fence opens.
   * In winter some houses hang Christmas lights, twinkling on wall-clock `now` (ms).
   */
  private drawBuilding(s: GameState, b: Building, isolated: boolean, wellFed: boolean, joins: number, now: number): void {
    const { ctx, cam } = this;
    const k = cam.zoom;
    const d = BUILDINGS[b.kind];
    const footprint = () => {
      const [sx, sy] = cam.toScreen(b.x + 0.05, b.y + 0.05);
      ctx.fillRect(sx, sy, (d.w - 0.1) * k, (d.h - 0.1) * k);
    };
    const season = this.seasonAt(s.time, b.y * s.w + b.x);
    const sprite = b.kind === 'farm' ? this.farmSprite(season, wellFed, joins) : b.stone ? this.stoneHouseSprites[season] : this.buildingSprites[season][b.kind];
    if (sprite) {
      const [sx, sy] = cam.toScreen(b.x, b.y - OVERHANG);
      ctx.drawImage(sprite, sx, sy, d.w * k, (d.h + OVERHANG) * k);
      const twinkle = b.kind === 'house' && season === WINTER ? houseLights(b) : null;
      if (twinkle !== null) {
        const frame = this.lights[Math.floor(now / TWINKLE_MS + twinkle) % this.lights.length];
        ctx.drawImage(frame, sx, sy, d.w * k, (d.h + OVERHANG) * k);
      }
      const chimney = CHIMNEYS[b.kind];
      if (chimney && season === WINTER) this.drawSmoke(b, chimney, sx, sy, now);
    } else {
      ctx.fillStyle = BUILDING_COLOR[b.kind];
      footprint();
    }
    if (s.paused.includes(b.id)) {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      footprint();
    }
    if (isolated) {
      ctx.fillStyle = 'rgba(150,150,150,.5)';
      footprint();
    }
  }

  /** A farm's sprite in a season, irrigated if a Well boosts it, its fence opened where other farms touch it (`joins`). */
  private farmSprite(season: number, wellFed: boolean, joins: number): HTMLCanvasElement {
    const key = `${season}:${wellFed ? 1 : 0}:${joins}`;
    let sprite = this.farmSprites.get(key);
    if (!sprite) {
      const { grid, palette } = seasonalBuilding('farm', SEASONS[season], wellFed)!;
      this.farmSprites.set(key, (sprite = bake(joinFarm(grid, joins), palette, 1)));
    }
    return sprite;
  }

  /**
   * Smoke from a chimney at art px `[cx, cy]` of a sprite drawn at screen (sx, sy): puffs on wall-clock `now` (ms)
   * that rise, swell and drift with the wind as they fade, snapped to art pixels.
   */
  private drawSmoke(b: Building, [cx, cy]: readonly [number, number], sx: number, sy: number, now: number): void {
    const { ctx } = this;
    const px = this.cam.zoom / SPRITE_W;
    const offset = (hash(b.id) % 1000) / 1000; // each chimney puffs out of step with its neighbors
    for (let n = 0; n < SMOKE_PUFFS; n++) {
      const u = (now / SMOKE_MS + n / SMOKE_PUFFS + offset) % 1; // the puff's age, 0–1
      const size = Math.round(2 + 3 * u);
      const x = Math.round(cx + SMOKE_DRIFT * u * u + Math.sin(u * 7 + n) * 0.8 - size / 2);
      const y = Math.round(cy - 1 - SMOKE_RISE * u - size / 2);
      const alpha = 0.55 * (1 - u) * Math.min(1, u * 6); // in quickly, out slowly
      ctx.fillStyle = `rgba(226,230,236,${alpha.toFixed(3)})`;
      // A square with its corners cut once it is big enough, as three rects that don't overlap.
      const corner = size >= 3 ? 1 : 0;
      ctx.fillRect(sx + (x + corner) * px, sy + y * px, (size - 2 * corner) * px, px);
      ctx.fillRect(sx + x * px, sy + (y + 1) * px, size * px, (size - 2) * px);
      ctx.fillRect(sx + (x + corner) * px, sy + (y + size - 1) * px, (size - 2 * corner) * px, px);
    }
  }

  private drawVillager(world: World, v: Villager, now: number): void {
    const { ctx, cam } = this;
    const k = cam.zoom;
    const sprite = this.villagers[v.job][villagerFrame(v, now)][this.faceLeft(world, v) ? 1 : 0];
    const [sx, sy] = cam.toScreen(v.x - VILLAGER_FEET.x / SPRITE_W, v.y - VILLAGER_FEET.y / SPRITE_W);
    ctx.drawImage(sprite, sx, sy, (VILLAGER_W / SPRITE_W) * k, (VILLAGER_H / SPRITE_W) * k);
  }

  /** A creature standing on (x, y) or `z` tiles above it, faded by its alpha. */
  private drawCritter(c: Critter, now: number): void {
    const { ctx, cam } = this;
    const frames = this.critterSprites[c.sprite as CritterSprite];
    const img = frames[Math.min(c.variant, frames.length - 1)][critterFrame(c, now)][c.left ? 1 : 0];
    const px = cam.zoom / SPRITE_W; // screen px per art px
    const flutter = c.sprite === 'butterfly' ? Math.sin(now / 180 + c.phase) * 0.08 : 0;
    const lift = hopLift(c, now);
    const [sx, sy] = cam.toScreen(c.x, c.y - c.z + flutter - lift);
    ctx.globalAlpha = Math.max(0, c.alpha * c.shown);
    if (lift > 0) {
      // A shadow left on the ground under a hop.
      const [gx, gy] = cam.toScreen(c.x, c.y);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, px * 2.5, px, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Feet on the bottom row inside the outline.
    ctx.drawImage(img, sx - (img.width * px) / 2, sy - (img.height - 1) * px, img.width * px, img.height * px);
    ctx.globalAlpha = 1;
  }

  /** Flying creatures, over the scene: birds in flight, butterflies and geese with a shadow on the ground, and fireflies glowing. */
  private drawFlyers(now: number): void {
    const { ctx, cam } = this;
    const px = cam.zoom / SPRITE_W;
    for (const c of this.critters.list) {
      if (onGround(c)) continue;
      const a = Math.max(0, c.alpha * c.shown);
      if (c.sprite === 'firefly') {
        const glow = (0.5 + 0.5 * Math.sin(now / 300 + c.phase * 7)) * a;
        const [sx, sy] = cam.toScreen(c.x + Math.sin(now / 900 + c.phase) * 0.1, c.y - c.z);
        ctx.fillStyle = `rgba(255,236,120,${(0.3 * glow).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, px * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,200,${glow.toFixed(3)})`;
        ctx.fillRect(sx - px / 2, sy - px / 2, px, px);
        continue;
      }
      const [gx, gy] = cam.toScreen(c.x, c.y);
      ctx.fillStyle = `rgba(0,0,0,${(0.18 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(gx, gy, px * 2.5, px, 0, 0, Math.PI * 2);
      ctx.fill();
      this.drawCritter(c, now);
    }
  }

  /** Footprints in the snow, fading. */
  private drawTracks(): void {
    const { ctx, cam } = this;
    const px = cam.zoom / SPRITE_W;
    for (const t of this.critters.tracks) {
      const [sx, sy] = cam.toScreen(t.x, t.y);
      ctx.fillStyle = `rgba(110,128,158,${(0.55 * (1 - t.age / TRACK_LIFE)).toFixed(3)})`;
      const ahead = t.left ? -px : px;
      ctx.fillRect(sx - px, sy - px, px, px);
      ctx.fillRect(sx + ahead * 0.5, sy - px * 2, px, px);
    }
  }

  private drawMule(world: World, m: Mule, now: number): void {
    const { ctx, cam } = this;
    const k = cam.zoom;
    const walking = (m.state === 'toMarket' || m.state === 'toPost') && m.pathI < m.path.length;
    const frame: MuleFrame = !walking ? 'stand' : Math.floor(now / WALK_MS + m.id * 0.37) % 2 === 1 ? 'walk2' : 'walk1';
    const sprite = this.mules[frame][m.carry > 0 ? 1 : 0][this.faceLeft(world, m) ? 1 : 0];
    // A post's mules can walk in step (they set off together after a pause), so each after its first keeps a spot of its own.
    const [dx, dy] = MULE_SPREAD[world.state.mules.filter((o) => o.post === m.post).indexOf(m) % MULE_SPREAD.length];
    const [sx, sy] = cam.toScreen(m.x + dx - MULE_FEET.x / SPRITE_W, m.y + dy - MULE_FEET.y / SPRITE_W);
    ctx.drawImage(sprite, sx, sy, (MULE_W / SPRITE_W) * k, (MULE_H / SPRITE_W) * k);
  }
}

/** Whether a house hangs Christmas lights in winter, by a hash of its id (about half do): its twinkle offset in frames, or null. */
/** Joining decorations of one layer by tile, so a path under a wall never joins it. */
function joinedDecor(s: GameState, layer: DecorLayer): Map<number, DecorKind> {
  const joined = new Map<number, DecorKind>();
  for (const d of s.decor) if (DECOR[d.kind].joins && DECOR[d.kind].layer === layer) joined.set(d.y * s.w + d.x, d.kind);
  return joined;
}

/** Bits for the neighbors a joining decoration joins (1 north, 2 east, 4 south, 8 west); 0 for other kinds. */
function joinMask(s: GameState, d: Decor, joined: ReadonlyMap<number, DecorKind>): number {
  if (!DECOR[d.kind].joins) return 0;
  const i = d.y * s.w + d.x;
  const same = (j: number) => joined.get(j) === d.kind;
  return (d.y > 0 && same(i - s.w) ? 1 : 0) | (d.x < s.w - 1 && same(i + 1) ? 2 : 0) | (d.y < s.h - 1 && same(i + s.w) ? 4 : 0) | (d.x > 0 && same(i - 1) ? 8 : 0);
}

function houseLights(b: Building): number | null {
  const h = hash(b.id + 1);
  return h % 2 ? null : ((h >>> 1) % 8) / 8;
}

/** Walking or resting on the ground (sorted with everything else standing there), rather than flying over it. */
const onGround = (c: Critter) => c.z === 0 && c.sprite !== 'butterfly' && c.sprite !== 'firefly';

/**
 * A villager's (or mule's) ground line is its feet, except on a building's tiles (a farmer in the field, a
 * miner in the pit, a delivery in the yard), where it is drawn over that building.
 */
function villagerDepth(s: GameState, v: Walker): number {
  const i = tileAt(s, v.x, v.y);
  const b = s.tiles[i] === Tile.Building ? buildingAt(s, i) : undefined;
  return b ? b.y + BUILDINGS[b.kind].h + 0.01 : v.y;
}

/**
 * Bits for the road's neighbors it joins: 1 north, 2 east, 4 south, 8 west. Roads join every road
 * beside them; a building is joined only by its one entrance (`entrances`).
 */
function roadMask(s: GameState, i: number, entrances: ReadonlyMap<number, number>): number {
  const road = (j: number) => s.tiles[j] === Tile.Road;
  const x = i % s.w;
  return ((i >= s.w && road(i - s.w) ? 1 : 0) | (x < s.w - 1 && road(i + 1) ? 2 : 0)
    | (i < s.w * (s.h - 1) && road(i + s.w) ? 4 : 0) | (x > 0 && road(i - 1) ? 8 : 0)) | (entrances.get(i) ?? 0);
}

/**
 * Each building's entrance: the road just below its door or fence gap (`BUILDING_ENTRANCES`) if there
 * is one, else the first road beside it (a connected one if any), mapped to the arm bit pointing into
 * the building. So a building ringed by road shows one way in, not many.
 */
function roadEntrances(s: GameState, net: Uint8Array): Map<number, number> {
  const out = new Map<number, number>();
  for (const b of s.buildings) {
    const roads = border(s, b).filter((i) => s.tiles[i] === Tile.Road);
    const col = BUILDING_ENTRANCES[b.kind];
    const below = col === undefined ? -1 : (b.y + BUILDINGS[b.kind].h) * s.w + b.x + col;
    const door = roads.includes(below) ? below : (roads.find((i) => net[i]) ?? roads[0]);
    if (door === undefined) continue;
    const x = door % s.w;
    const y = (door / s.w) | 0;
    const bit = y < b.y ? 4 : y >= b.y + BUILDINGS[b.kind].h ? 1 : x < b.x ? 2 : 8;
    out.set(door, (out.get(door) ?? 0) | bit);
  }
  return out;
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

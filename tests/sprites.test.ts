import { describe, expect, it } from 'vitest';
import { BUILDINGS, type BuildingKind } from '../src/core/buildings';
import {
  BUILDING_ENTRANCES,
  BUILDING_PALETTE,
  BUILDING_SEASONS,
  BUILDING_SPRITES,
  CHIMNEYS,
  FLAG,
  FLAG_CLOTH,
  FLAG_PALETTE,
  GRASS,
  GROUND_PALETTE,
  GROUND_TINTS,
  HOUSE_LIGHTS,
  joinFarm,
  LIGHTS_PALETTE,
  MULE_FRAMES,
  MULE_H,
  MULE_PALETTE,
  MULE_W,
  OVERHANG_PX,
  RELIC,
  RELIC_GLOW,
  RELIC_PALETTE,
  RELIC_TINTS,
  ROOFS,
  SPRITE_W,
  STONE_HOUSE,
  STONE_HOUSE_TINT,
  STUMP,
  TREE_H,
  TREE_PALETTE,
  TREE_SPECIES,
  TREE_TINTS,
  TREES,
  UI_CHEST,
  composeCritter,
  CRITTER_PALETTE,
  CRITTER_VARIANTS,
  CRITTERS,
  type CritterSprite,
  UI_FRAME_H,
  UI_FRAME_SLICE,
  UI_FRAME_W,
  UI_FRAMES,
  UI_ICON_NAMES,
  UI_ICON_W,
  UI_ICONS,
  UI_LIP,
  UI_PALETTE,
  UI_WOOD,
  type UiFrame,
  VILLAGER_CLOTH,
  VILLAGER_FRAMES,
  VILLAGER_H,
  VILLAGER_PALETTE,
  VILLAGER_W,
  WINTER_RELIC,
  WINTER_STUMP,
  WELL_FARM_TINTS,
  WINTER_TREES,
  composeDecor,
  composeFrame,
  DECOR_ARMS,
  DECOR_PALETTE,
  DECOR_SEASONS,
  DECOR_SPRITES,
  seasonalDecor,
  composeMule,
  composeVillager,
  seasonalBuilding,
} from '../src/render/sprites';
import { DECOR, DECOR_KINDS } from '../src/core/decor';
import { SEASONS } from '../src/core/seasons';
import type { Job } from '../src/core/types';

describe('sprites', () => {
  const trees = [...TREE_SPECIES.flatMap((sp) => [...TREES[sp], ...WINTER_TREES[sp]]), STUMP, WINTER_STUMP];
  const ground = GRASS;

  it('tree grids are SPRITE_W × TREE_H', () => {
    for (const g of trees) {
      expect(g).toHaveLength(TREE_H);
      for (const row of g) expect(row).toHaveLength(SPRITE_W);
    }
  });

  it('ground grids are SPRITE_W square and opaque', () => {
    for (const { grid } of ground) {
      expect(grid).toHaveLength(SPRITE_W);
      for (const row of grid) expect(row).toMatch(new RegExp(`^[^.]{${SPRITE_W}}$`));
    }
  });

  it('every char is transparent or in its palette', () => {
    for (const g of trees) for (const ch of g.join('')) expect(ch === '.' || ch in TREE_PALETTE).toBe(true);
    for (const { grid } of ground) for (const ch of grid.join('')) expect(ch in GROUND_PALETTE).toBe(true);
  });

  it('every species has the same number of growth stages', () => {
    for (const sp of TREE_SPECIES) {
      expect(TREES[sp]).toHaveLength(TREES.oak.length);
      expect(WINTER_TREES[sp]).toHaveLength(TREES.oak.length);
    }
  });

  it('ground tints only recolor ground palette chars', () => {
    for (const tints of Object.values(GROUND_TINTS)) for (const ch of Object.keys(tints)) expect(ch in GROUND_PALETTE).toBe(true);
  });

  it('seasonal tints only recolor chars their species uses', () => {
    for (const tints of Object.values(TREE_TINTS))
      for (const sp of TREE_SPECIES) {
        const used = new Set(TREES[sp].join(''));
        for (const ch of Object.keys(tints[sp] ?? {})) expect(used.has(ch) && ch in TREE_PALETTE).toBe(true);
      }
  });

  it('building sprites match their footprint plus overhang and use their palette', () => {
    for (const [kind, grid] of Object.entries(BUILDING_SPRITES)) {
      const d = BUILDINGS[kind as BuildingKind];
      expect(grid).toHaveLength(d.h * SPRITE_W + OVERHANG_PX);
      for (const row of grid) expect(row).toHaveLength(d.w * SPRITE_W);
      for (const ch of grid.join('')) expect(ch === '.' || ch in BUILDING_PALETTE).toBe(true);
    }
  });

  it('the stone house matches the house: its size, palette, roof and door, with stone walls', () => {
    const house = BUILDING_SPRITES.house!;
    expect(STONE_HOUSE).toHaveLength(house.length);
    for (const row of STONE_HOUSE) expect(row).toHaveLength(house[0].length);
    for (const ch of STONE_HOUSE.join('')) expect(ch === '.' || ch in BUILDING_PALETTE).toBe(true);
    expect(STONE_HOUSE.slice(0, 11)).toEqual(house.slice(0, 11)); // the same roof, so snow and lights fit
    expect(STONE_HOUSE.join('')).not.toMatch(/[wW]/); // no plaster left
    expect(STONE_HOUSE.join('').split('D').length).toBe(house.join('').split('D').length); // the door where it was
    for (const ch of Object.keys(STONE_HOUSE_TINT)) expect(STONE_HOUSE.slice(0, 11).join('')).toContain(ch); // the slate is on the roof
  });

  it('every season keeps each building sprite its size and in its palette', () => {
    for (const season of SEASONS)
      for (const [kind, art] of Object.entries(BUILDING_SPRITES)) {
        const { grid, palette } = seasonalBuilding(kind as BuildingKind, season)!;
        expect(grid).toHaveLength(art.length);
        for (const row of grid) expect(row).toHaveLength(art[0].length);
        for (const ch of grid.join('')) expect(ch === '.' || ch in palette).toBe(true);
        for (const ch of Object.keys(BUILDING_SEASONS[season][kind as BuildingKind]?.tint ?? {})) expect(ch in BUILDING_PALETTE).toBe(true);
      }
  });

  it('well-fed farm tints recolor farm chars in every season', () => {
    const farm = new Set(BUILDING_SPRITES.farm!.join(''));
    for (const season of SEASONS) {
      for (const ch of Object.keys(WELL_FARM_TINTS[season])) expect(farm.has(ch)).toBe(true);
      expect(seasonalBuilding('farm', season, true)!.palette).not.toEqual(seasonalBuilding('farm', season)!.palette);
    }
  });

  describe('joinFarm', () => {
    const farm = BUILDING_SPRITES.farm!;
    const NORTH = 0b111, EAST = 0b111 << 3, SOUTH = 0b111 << 6, WEST = 0b111 << 9;
    const fence = /[Llj]/;
    // The cells a joined side can change: the fence rows and columns and the bare soil beside them, corners included.
    const edge = (x: number, y: number) => y <= 8 || y >= 45 || x <= 5 || x >= 43;

    it('leaves a lone farm as drawn, and keeps every join the same size in farm chars', () => {
      expect(joinFarm(farm, 0)).toEqual(farm);
      const bad: string[] = [];
      for (let mask = 0; mask < 1 << 12; mask++) {
        const g = joinFarm(farm, mask);
        if (g.length !== farm.length || g.some((r, y) => r.length !== farm[y].length)) bad.push(`${mask}: size`);
        for (let y = 0; y < g.length; y++) {
          for (let x = 0; x < g[y].length; x++) {
            if (g[y][x] !== '.' && !(g[y][x] in BUILDING_PALETTE)) bad.push(`${mask}: ${g[y][x]} at ${x},${y}`);
            if (!edge(x, y) && g[y][x] !== farm[y][x]) bad.push(`${mask}: field changed at ${x},${y}`); // the field inside never changes
          }
        }
      }
      expect(bad.slice(0, 5)).toEqual([]);
    });

    it('opens the whole fence of a farm joined on every side', () => {
      const g = joinFarm(farm, NORTH | EAST | SOUTH | WEST);
      for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (edge(x, y)) expect(g[y][x]).not.toMatch(fence);
    });

    it('lines the crops up across the seam with a farm in line', () => {
      // Stacked: the lower farm's overhang covers the upper farm's last rows with the same pixels.
      const upper = joinFarm(farm, SOUTH);
      const lower = joinFarm(farm, NORTH);
      for (let y = 0; y < 4; y++) expect(lower[y]).toBe(upper[48 + y]);
      // Side by side: the opened columns repeat the field's 4 px crop rows.
      const west = joinFarm(farm, EAST);
      const east = joinFarm(farm, WEST);
      for (let y = 21; y <= 44; y++) {
        expect(west[y].slice(46)).toBe(west[y].slice(42, 44));
        expect(east[y].slice(0, 2)).toBe(east[y].slice(4, 6));
      }
    });

    it('keeps the fence where only part of a side is joined', () => {
      const g = joinFarm(farm, 0b001); // only the north-west tile
      expect(g[4].slice(20, 46)).toBe(farm[4].slice(20, 46)); // the rest of the rail stands
      expect(g[4].slice(14, 16)).toBe('lL'); // and turns along the neighbor's fence
      expect(g[4].slice(0, 2)).toBe('Ll'); // the west fence runs on north
    });
  });

  it('building entrances sit on the bottom row of a building with a sprite', () => {
    for (const [kind, col] of Object.entries(BUILDING_ENTRANCES)) {
      expect(BUILDING_SPRITES[kind as BuildingKind]).toBeDefined();
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(BUILDINGS[kind as BuildingKind].w);
    }
  });

  it('winter snow lands on every roof section', () => {
    for (const [kind, sections] of Object.entries(ROOFS)) {
      const winter = seasonalBuilding(kind as BuildingKind, 'winter')!.grid;
      for (const { rows } of sections) expect(winter.slice(rows[0], rows[1] + 1).join('')).toMatch(/[zA]/);
    }
  });

  it('relic tints recolor relic palette chars', () => {
    for (const tints of Object.values(RELIC_TINTS)) for (const ch of Object.keys(tints)) expect(ch in RELIC_PALETTE).toBe(true);
  });

  it('relic sprites are tree-sized and use their palette', () => {
    for (const grid of [RELIC, RELIC_GLOW, WINTER_RELIC]) {
      expect(grid).toHaveLength(TREE_H);
      for (const row of grid) expect(row).toHaveLength(SPRITE_W);
      for (const ch of grid.join('')) expect(ch === '.' || ch in RELIC_PALETTE).toBe(true);
    }
  });

  it('the mark flag is tree-sized and uses its palette in both cloths', () => {
    expect(FLAG).toHaveLength(TREE_H);
    for (const row of FLAG) expect(row).toHaveLength(SPRITE_W);
    for (const cloth of Object.values(FLAG_CLOTH)) {
      const palette = { ...FLAG_PALETTE, ...cloth };
      for (const ch of FLAG.join('')) expect(ch === '.' || ch in palette).toBe(true);
    }
  });

  it('every villager frame composes to VILLAGER_W × VILLAGER_H in its palette', () => {
    for (const job of Object.keys(VILLAGER_CLOTH) as Job[]) {
      const palette = { ...VILLAGER_PALETTE, ...VILLAGER_CLOTH[job] };
      for (const frame of VILLAGER_FRAMES) {
        const grid = composeVillager(job, frame);
        expect(grid).toHaveLength(VILLAGER_H);
        for (const row of grid) expect(row).toHaveLength(VILLAGER_W);
        for (const ch of grid.join('')) expect(ch === '.' || ch in palette).toBe(true);
      }
    }
  });

  it('every pack mule frame, loaded or not, composes to MULE_W × MULE_H in its palette', () => {
    for (const frame of MULE_FRAMES) {
      for (const loaded of [false, true]) {
        const grid = composeMule(frame, loaded);
        expect(grid).toHaveLength(MULE_H);
        for (const row of grid) expect(row).toHaveLength(MULE_W);
        for (const ch of grid.join('')) expect(ch === '.' || ch in MULE_PALETTE).toBe(true);
      }
    }
  });

  it('ground variants have positive weights', () => {
    for (const { weight } of ground) expect(weight).toBeGreaterThan(0);
  });

  it('UI frames are 9-sliceable and compose raised and pressed at the same size', () => {
    const inPalette = (g: readonly string[]) => g.join('').split('').every((ch) => ch === '.' || ch in UI_PALETTE);
    for (const frame of Object.keys(UI_FRAMES) as UiFrame[]) {
      const { face, lip } = UI_FRAMES[frame];
      expect(face).toHaveLength(UI_FRAME_H);
      for (const row of face) expect(row).toHaveLength(UI_FRAME_W);
      expect(lip in UI_PALETTE).toBe(true);
      // the stretched center is one solid color
      const center = new Set(face.slice(UI_FRAME_SLICE, -UI_FRAME_SLICE).map((r) => r.slice(UI_FRAME_SLICE, -UI_FRAME_SLICE)).join(''));
      expect(center.size).toBe(1);
      for (const pressed of [false, true]) {
        const g = composeFrame(frame, pressed);
        expect(g).toHaveLength(UI_FRAME_H + UI_LIP);
        expect(inPalette(g)).toBe(true);
      }
    }
  });

  it('UI icons are UI_ICON_W square and the wood tile is regular, all in the UI palette', () => {
    for (const name of UI_ICON_NAMES) {
      const g = UI_ICONS[name];
      expect(g).toHaveLength(UI_ICON_W);
      for (const row of g) expect(row).toHaveLength(UI_ICON_W);
      for (const ch of g.join('')) expect(ch === '.' || ch in UI_PALETTE).toBe(true);
    }
    for (const row of UI_WOOD) expect(row).toMatch(new RegExp(`^[^.]{${UI_WOOD[0].length}}$`));
    for (const ch of UI_WOOD.join('')) expect(ch in UI_PALETTE).toBe(true);
  });

  it('forest creature frames share a size per creature, stay small, and use the creature palette', () => {
    for (const sprite of Object.keys(CRITTERS) as CritterSprite[]) {
      const frames = Object.keys(CRITTERS[sprite]).map((f) => composeCritter(sprite, f));
      const [w, h] = [frames[0][0].length, frames[0].length];
      expect(w).toBeLessThanOrEqual(12);
      expect(h).toBeLessThanOrEqual(12);
      for (const g of frames) {
        expect(g).toHaveLength(h);
        for (const row of g) expect(row).toHaveLength(w);
        for (const ch of g.join('')) expect(ch === '.' || ch in CRITTER_PALETTE).toBe(true);
      }
      for (const v of CRITTER_VARIANTS[sprite] ?? []) for (const ch of Object.keys(v)) expect(ch in CRITTER_PALETTE).toBe(true);
    }
  });

  it('Christmas lights match the house sprite, use their palette, and twinkle', () => {
    const house = BUILDING_SPRITES.house!;
    expect(HOUSE_LIGHTS.length).toBeGreaterThan(1);
    for (const g of HOUSE_LIGHTS) {
      expect(g).toHaveLength(house.length);
      for (const row of g) expect(row).toHaveLength(house[0].length);
      for (const ch of g.join('')) expect(ch === '.' || ch in LIGHTS_PALETTE).toBe(true);
    }
    expect(new Set(HOUSE_LIGHTS.map((g) => g.join(''))).size).toBe(HOUSE_LIGHTS.length);
  });

  it('chimney smoke starts at the top of a chimney drawn in the building sprite', () => {
    for (const [kind, [x, y]] of Object.entries(CHIMNEYS) as [BuildingKind, readonly [number, number]][]) {
      const art = BUILDING_SPRITES[kind]!;
      expect(art[y][x - 1]).not.toBe('.');
      expect(art[y][x]).not.toBe('.');
      expect(art[y - 1]?.[x] ?? '.').toBe('.');
    }
  });

  it('the Lucky Chest lid and base share a width and use the UI palette', () => {
    const w = UI_CHEST.base[0].length;
    for (const row of [...UI_CHEST.lid, ...UI_CHEST.base]) {
      expect(row).toHaveLength(w);
      for (const ch of row) expect(ch === '.' || ch in UI_PALETTE).toBe(true);
    }
  });

  it('decoration sprites fit their footprint (props with the overhang) in every season and every join', () => {
    for (const kind of DECOR_KINDS) {
      const d = DECOR[kind];
      const h = d.h * SPRITE_W + (d.layer === 'prop' ? OVERHANG_PX : 0);
      expect(DECOR_SPRITES[kind]).toHaveLength(h);
      for (const arm of DECOR_ARMS[kind] ?? []) expect(arm.length === 0 || arm.length === h).toBe(true);
      expect(!!DECOR_ARMS[kind]).toBe(!!d.joins);
      for (const season of SEASONS)
        for (let mask = 0; mask < (d.joins ? 16 : 1); mask++) {
          const { grid, palette } = seasonalDecor(kind, season, mask);
          expect(grid).toHaveLength(h);
          for (const row of grid) expect(row).toHaveLength(d.w * SPRITE_W);
          for (const ch of grid.join('')) expect(ch === '.' || ch in palette).toBe(true);
        }
    }
  });

  it('decoration tints recolor chars their art uses', () => {
    for (const season of SEASONS)
      for (const [kind, look] of Object.entries(DECOR_SEASONS[season])) {
        const art = new Set([...(look.grid ?? DECOR_SPRITES[kind as keyof typeof DECOR_SPRITES]), ...(DECOR_ARMS[kind as keyof typeof DECOR_ARMS] ?? []).flat()].join(''));
        for (const ch of Object.keys(look.tint ?? {})) expect(ch in DECOR_PALETTE && art.has(ch), `${season} ${kind} ${ch}`).toBe(true);
      }
  });

  it('a lone joining decoration is its plain sprite', () => {
    expect(composeDecor('fence', 0)).toEqual(DECOR_SPRITES.fence);
    expect(composeDecor('hedge', 2 | 8)).not.toEqual(DECOR_SPRITES.hedge);
  });

  it('benches side by side join into one seat; benches above or below stay apart', () => {
    expect(composeDecor('bench', 1 | 4)).toEqual(DECOR_SPRITES.bench);
    const [west, east] = [composeDecor('bench', 2), composeDecor('bench', 8)];
    for (const y of [8, 9, 11, 12, 14, 15]) expect(west[y].slice(-3) + east[y].slice(0, 3), `row ${y}`).toMatch(/^[hBb]{6}$/);
    for (const y of [7, 10, 13, 16]) expect(west[y].at(-1) + east[y][0], `row ${y}`).toBe('oo');
  });
});

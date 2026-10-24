import { describe, expect, it } from 'vitest';
import { BUILDINGS, type BuildingKind } from '../src/core/buildings';
import {
  BUILDING_ENTRANCES,
  BUILDING_PALETTE,
  BUILDING_SEASONS,
  BUILDING_SPRITES,
  FLAG,
  FLAG_CLOTH,
  FLAG_PALETTE,
  GRASS,
  GROUND_PALETTE,
  GROUND_TINTS,
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
  STUMP,
  TREE_H,
  TREE_PALETTE,
  TREE_SPECIES,
  TREE_TINTS,
  TREES,
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
  composeFrame,
  composeMule,
  composeVillager,
  seasonalBuilding,
} from '../src/render/sprites';
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
});

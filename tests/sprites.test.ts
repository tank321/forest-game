import { describe, expect, it } from 'vitest';
import { BUILDINGS, type BuildingKind } from '../src/core/buildings';
import {
  BUILDING_PALETTE,
  BUILDING_SPRITES,
  FLAG,
  FLAG_CLOTH,
  FLAG_PALETTE,
  GRASS,
  GROUND_PALETTE,
  OVERHANG_PX,
  RELIC,
  RELIC_GLOW,
  RELIC_PALETTE,
  SPRITE_W,
  STUMP,
  TREE_H,
  TREE_PALETTE,
  TREE_SPECIES,
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
  composeFrame,
  composeVillager,
} from '../src/render/sprites';
import type { Job } from '../src/core/types';

describe('sprites', () => {
  const trees = [...TREE_SPECIES.flatMap((sp) => TREES[sp]), STUMP];
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
    for (const sp of TREE_SPECIES) expect(TREES[sp]).toHaveLength(TREES.oak.length);
  });

  it('building sprites match their footprint plus overhang and use their palette', () => {
    for (const [kind, grid] of Object.entries(BUILDING_SPRITES)) {
      const d = BUILDINGS[kind as BuildingKind];
      expect(grid).toHaveLength(d.h * SPRITE_W + OVERHANG_PX);
      for (const row of grid) expect(row).toHaveLength(d.w * SPRITE_W);
      for (const ch of grid.join('')) expect(ch === '.' || ch in BUILDING_PALETTE).toBe(true);
    }
  });

  it('relic sprites are tree-sized and use their palette', () => {
    for (const grid of [RELIC, RELIC_GLOW]) {
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

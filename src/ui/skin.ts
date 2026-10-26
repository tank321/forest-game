import { DECOR, DECOR_KINDS } from '../core/decor';
import { bake } from '../render/bake';
import {
  BUILDING_PALETTE,
  BUILDING_SPRITES,
  composeFrame,
  seasonalDecor,
  composeRoad,
  GRASS,
  GROUND_PALETTE,
  ROAD_PALETTE,
  type Rgba,
  UI_CHEST,
  UI_FRAMES,
  UI_ICON_NAMES,
  UI_ICONS,
  UI_PALETTE,
  UI_WOOD,
  type UiFrame,
} from '../render/sprites';

const THUMB = 48; // CSS px box for building thumbnails

const url = (grid: readonly string[], palette: Record<string, Rgba> = UI_PALETTE) =>
  `url(${bake(grid, palette, 1).toDataURL()})`;

/**
 * Bakes the UI sprites once and hands them to CSS: `--frame-<name>` and `--frame-<name>-down`
 * (raised and pressed), `--wood`, the Lucky Chest's `--chest`, `--chest-lid` and `--chest-base`, and `.ico-<name>` / `.thumb-<kind>` / `.thumb-road` /
 * `.thumb-decor-<kind>` background images.
 */
export function applySkin(): void {
  const vars = [`--wood:${url(UI_WOOD)}`];
  for (const f of Object.keys(UI_FRAMES) as UiFrame[]) {
    vars.push(`--frame-${f}:${url(composeFrame(f, false))}`, `--frame-${f}-down:${url(composeFrame(f, true))}`);
  }
  // Lucky Chest: lid and base apart (they come apart when it opens), and closed for the map button.
  vars.push(`--chest-lid:${url(UI_CHEST.lid)}`, `--chest-base:${url(UI_CHEST.base)}`, `--chest:${url([...UI_CHEST.lid, ...UI_CHEST.base])}`);
  const rules = [`:root{${vars.join(';')}}`];
  for (const name of UI_ICON_NAMES) rules.push(`.ico-${name}{background-image:${url(UI_ICONS[name])}}`);
  const thumb = (name: string, grid: readonly string[], palette: Record<string, Rgba>) => {
    const [w, h] = [grid[0].length, grid.length];
    const big = Math.max(w, h);
    // whole-pixel magnification when it fits, else shrink smoothly to the box
    const k = big <= THUMB ? Math.floor(THUMB / big) : THUMB / big;
    const smooth = k < 1 ? ';image-rendering:auto' : '';
    rules.push(`.thumb-${name}{background-image:${url(grid, palette)};background-size:${w * k}px ${h * k}px${smooth}}`);
  };
  for (const [kind, grid] of Object.entries(BUILDING_SPRITES)) thumb(kind, grid, BUILDING_PALETTE);
  // Decorations in their summer look; a fence or hedge as a short run, a bench whole.
  for (const kind of DECOR_KINDS) {
    const { grid, palette } = seasonalDecor(kind, 'summer', DECOR[kind].joins && kind !== 'bench' ? 2 | 8 : 0);
    thumb(`decor-${kind}`, grid, palette);
  }
  // Road card: a straight east-west road over plain grass.
  const road = composeRoad(2 | 8).map((r, y) => [...r].map((c, x) => (c === '.' ? GRASS[0].grid[y][x] : c)).join(''));
  const k = Math.floor(THUMB / road.length);
  rules.push(`.thumb-road{background-image:${url(road, { ...GROUND_PALETTE, ...ROAD_PALETTE })};background-size:${road.length * k}px ${road.length * k}px}`);
  const style = document.createElement('style');
  style.textContent = rules.join('\n');
  document.head.append(style);
}

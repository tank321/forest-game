import { CONFIG } from '../config';
import { BUILDINGS, type BuildingKind } from '../core/buildings';
import { DECOR, type DecorKind } from '../core/decor';
import type { UiState } from './state';

/** What a placement mode aims: a building or decoration kind (their names never clash), or a road. */
export type Aim = BuildingKind | DecorKind | 'road';

/** Footprint size of what is aimed. */
export const aimSize = (aim: Aim): { w: number; h: number } =>
  aim === 'road' ? { w: 1, h: 1 } : aim in BUILDINGS ? BUILDINGS[aim as BuildingKind] : DECOR[aim as DecorKind];

/** 1×1 decorations are painted with a brush, like roads; bigger ones are aimed like buildings. */
export const paints = (kind: DecorKind) => DECOR[kind].w === 1 && DECOR[kind].h === 1;

/** Top-left tile for a footprint centered under the given world point. */
export function placementAt(kind: Aim, wx: number, wy: number) {
  const d = aimSize(kind);
  return { x: Math.floor(wx - d.w / 2 + 0.5), y: Math.floor(wy - d.h / 2 + 0.5) };
}

/** What a placement mode aims at `ui.hover`: a building placed or moved, a decoration (not painted) placed or moved, a road moved, or nothing. */
export function aiming(ui: UiState): Aim | null {
  if (ui.moving) return ui.moving.kind;
  if (ui.placing) return ui.placing;
  if (ui.movingDecor && ui.decorSel) return ui.decorSel.kind;
  if (ui.decor && !paints(ui.decor)) return ui.decor;
  return ui.movingRoad && ui.road !== null ? 'road' : null;
}

/** Whether (wx, wy) is on the aimed footprint, with `pad` tiles of slack around it for a finger. */
export function onFootprint(ui: UiState, wx: number, wy: number, pad: number = CONFIG.camera.grabPad): boolean {
  const kind = aiming(ui);
  if (!kind || !ui.hover) return false;
  const { x, y } = kind === 'road' ? { x: Math.floor(ui.hover.x), y: Math.floor(ui.hover.y) } : placementAt(kind, ui.hover.x, ui.hover.y);
  const { w, h } = aimSize(kind);
  return wx >= x - pad && wx < x + w + pad && wy >= y - pad && wy < y + h + pad;
}

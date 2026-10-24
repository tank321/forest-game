import { CONFIG } from '../config';
import { BUILDINGS, type BuildingKind } from '../core/buildings';
import type { UiState } from './state';

/** Top-left tile for a building centered under the given world point. */
export function placementAt(kind: BuildingKind, wx: number, wy: number) {
  const d = BUILDINGS[kind];
  return { x: Math.floor(wx - d.w / 2 + 0.5), y: Math.floor(wy - d.h / 2 + 0.5) };
}

/** What a placement mode aims at `ui.hover`: a building placed or moved, a road moved, or nothing. */
export function aiming(ui: UiState): BuildingKind | 'road' | null {
  return ui.moving?.kind ?? ui.placing ?? (ui.movingRoad && ui.road !== null ? 'road' : null);
}

/** Whether (wx, wy) is on the aimed footprint, with `pad` tiles of slack around it for a finger. */
export function onFootprint(ui: UiState, wx: number, wy: number, pad: number = CONFIG.camera.grabPad): boolean {
  const kind = aiming(ui);
  if (!kind || !ui.hover) return false;
  const { x, y } = kind === 'road' ? { x: Math.floor(ui.hover.x), y: Math.floor(ui.hover.y) } : placementAt(kind, ui.hover.x, ui.hover.y);
  const { w, h } = kind === 'road' ? { w: 1, h: 1 } : BUILDINGS[kind];
  return wx >= x - pad && wx < x + w + pad && wy >= y - pad && wy < y + h + pad;
}

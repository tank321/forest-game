import { BUILDINGS, type BuildingKind } from '../core/buildings';

/** Top-left tile for a building centered under the given world point. */
export function placementAt(kind: BuildingKind, wx: number, wy: number) {
  const d = BUILDINGS[kind];
  return { x: Math.floor(wx - d.w / 2 + 0.5), y: Math.floor(wy - d.h / 2 + 0.5) };
}

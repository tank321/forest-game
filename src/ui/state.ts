import type { BuildingKind } from '../core/buildings';
import type { Building } from '../core/types';

/** Transient UI state (never saved). */
export interface UiState {
  tool: 'chop' | 'mark';
  view: 'build' | 'skills'; // what the panel shows when nothing is selected/being placed
  placing: BuildingKind | null;
  selected: Building | null;
  hover: { x: number; y: number } | null; // world coords under the cursor
}

export const createUiState = (): UiState => ({ tool: 'chop', view: 'build', placing: null, selected: null, hover: null });

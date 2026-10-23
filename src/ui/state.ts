import type { BuildingKind } from '../core/buildings';
import type { Building } from '../core/types';

/** Transient UI state (never saved). */
export interface UiState {
  tool: 'chop' | 'mark';
  placing: BuildingKind | null;
  moving: Building | null;
  removing: number | null; // selected building awaiting removal confirmation
  selected: Building | null;
  hover: { x: number; y: number } | null; // world coords under the cursor
}

export const createUiState = (): UiState => ({
  tool: 'chop',
  placing: null,
  moving: null,
  removing: null,
  selected: null,
  hover: null,
});

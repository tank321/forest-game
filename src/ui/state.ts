import type { BuildingKind } from '../core/buildings';
import type { TradeResource } from '../core/economy';
import type { Building } from '../core/types';

/** Transient UI state (never saved). */
export interface UiState {
  tool: 'chop' | 'mark';
  placing: BuildingKind | null;
  moving: Building | null;
  paving: boolean; // laying or lifting roads
  removing: number | null; // selected building awaiting removal confirmation
  selected: Building | null;
  road: number | null; // selected road tile
  movingRoad: boolean; // the selected road awaits its new tile
  hover: { x: number; y: number } | null; // world coords under the cursor
  marketRes: TradeResource; // resource picked in the Market panel
}

export const createUiState = (): UiState => ({
  tool: 'chop',
  placing: null,
  moving: null,
  paving: false,
  removing: null,
  selected: null,
  road: null,
  movingRoad: false,
  hover: null,
  marketRes: 'wood',
});

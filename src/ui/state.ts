import type { BuildingKind } from '../core/buildings';
import type { DecorKind } from '../core/decor';
import type { TradeResource } from '../core/economy';
import type { Building, Decor } from '../core/types';

/** Transient UI state (never saved). */
export interface UiState {
  placing: BuildingKind | null;
  moving: Building | null;
  paving: boolean; // laying or lifting roads
  selected: Building | null;
  road: number | null; // selected road tile
  movingRoad: boolean; // the selected road awaits its new tile
  decorating: boolean; // the decoration palette is open in place of the build menu
  trophies: boolean; // the palette shows the trophies rather than the town decorations
  decor: DecorKind | null; // the decoration being placed (a 1×1 kind is painted like road)
  decorSel: Decor | null; // selected decoration
  movingDecor: boolean; // the selected decoration awaits its new spot
  hover: { x: number; y: number } | null; // world coords under the cursor
  marketRes: TradeResource; // resource picked in the Market panel
}

export const createUiState = (): UiState => ({
  placing: null,
  moving: null,
  paving: false,
  selected: null,
  road: null,
  movingRoad: false,
  decorating: false,
  trophies: false,
  decor: null,
  decorSel: null,
  movingDecor: false,
  hover: null,
  marketRes: 'wood',
});

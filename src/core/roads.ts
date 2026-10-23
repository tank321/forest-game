import { CONFIG } from '../config';
import { BUILDINGS, border, countOf, distToBuilding, HUB_KINDS } from './buildings';
import { neighbors4 } from './grid';
import { lvl } from './skills';
import type { Building, GameState } from './types';
import { Tile } from './types';

const hubs = (s: GameState) => s.buildings.filter((b) => HUB_KINDS.includes(b.kind));

/**
 * Road tiles the town can use (1 = connected): roads joined edge to edge to a road touching a hub
 * (the Town Center or the Outpost). Derived on demand, never saved.
 */
export function roadNetwork(s: GameState): Uint8Array {
  const net = new Uint8Array(s.w * s.h);
  const stack = hubs(s).flatMap((b) => border(s, b)).filter((i) => s.tiles[i] === Tile.Road);
  for (const i of stack) net[i] = 1;
  while (stack.length) {
    for (const n of neighbors4(s, stack.pop()!)) {
      if (s.tiles[n] !== Tile.Road || net[n]) continue;
      net[n] = 1;
      stack.push(n);
    }
  }
  return net;
}

/** A footprint at this spot touches (edge to edge) a connected road or a hub. */
export function touchesNetwork(s: GameState, b: Pick<Building, 'kind' | 'x' | 'y'>, net: Uint8Array): boolean {
  const hs = hubs(s);
  return border(s, b).some((i) => net[i] === 1 || hs.some((h) => distToBuilding(h, i % s.w, (i / s.w) | 0) === 0));
}

/**
 * Ids of the buildings that work: those needing no road (hubs, Wells), and every other one
 * touching a connected road or a hub. The rest are isolated and count for nothing.
 */
export function linkedBuildings(s: GameState, net = roadNetwork(s)): Set<number> {
  const out = new Set<number>();
  for (const b of s.buildings) if (!BUILDINGS[b.kind].road || touchesNetwork(s, b, net)) out.add(b.id);
  return out;
}

/** Road tiles the town may lay in all; each house and each rebuild adds to the stock. */
export const roadStock = (s: GameState) =>
  CONFIG.roads.base + (CONFIG.roads.perHouse + CONFIG.skills.surveyors * lvl(s, 'surveyors')) * countOf(s, 'house') +
  CONFIG.legacy.roadsPerRun * s.legacy.runs;

/** Road tiles laid. */
export const roadsBuilt = (s: GameState) => s.tiles.reduce((n, t) => n + (t === Tile.Road ? 1 : 0), 0);

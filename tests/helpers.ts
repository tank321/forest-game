import { border, BUILDINGS, type BuildingKind } from '../src/core/buildings';
import { chopTree, hireVillager } from '../src/core/commands';
import { neighbors4 } from '../src/core/grid';
import { linkedBuildings, roadNetwork } from '../src/core/roads';
import { createInitialState } from '../src/core/state';
import { Tile } from '../src/core/types';
import { createWorld, onBuildingsChanged, type World } from '../src/core/world';

/** Small world (size×size, 6×6 clearing) with `villagers` hired for free. */
export function smallWorld(size = 20, villagers = 0, seed = 1): World {
  const w = createWorld(createInitialState(seed, size, 6));
  for (let k = 0; k < villagers; k++) {
    w.state.resources.wood += 1e9;
    hireVillager(w);
    w.state.resources.wood -= 1e9;
  }
  w.state.resources.wood = Math.max(0, w.state.resources.wood);
  return w;
}

/** Learns every building-unlock skill, so any building can be placed. */
export function unlockBuildings(w: World): World {
  for (const kind of Object.keys(BUILDINGS) as BuildingKind[]) {
    const skill = BUILDINGS[kind].unlock;
    if (skill) w.state.skills[skill] = 1;
  }
  return w;
}

export const totalWood = (w: World) =>
  w.state.resources.wood +
  w.state.wood.reduce((a, b) => a + b, 0) +
  w.state.villagers.reduce((a, v) => a + (v.job === 'lumber' ? v.carry : 0), 0);

/** Fells every tree in the rectangle (inclusive), working inward from territory. */
export function clearArea(w: World, x0: number, y0: number, x1: number, y1: number): void {
  const s = w.state;
  const mult = w.dev.manualMult;
  w.dev.manualMult = 1e9;
  const inRect = (i: number) => {
    const x = i % s.w;
    const y = (i / s.w) | 0;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  };
  for (let progress = true; progress; ) {
    progress = false;
    for (let i = 0; i < s.tiles.length; i++) if (inRect(i) && chopTree(w, i)) progress = true;
  }
  w.dev.manualMult = mult;
}

/** Lays free roads (outside the stock) on the given tiles, for setups longer than the stock allows. */
export function freeRoads(w: World, tiles: number[]): World {
  for (const i of tiles) w.state.tiles[i] = Tile.Road;
  onBuildingsChanged(w);
  return w;
}

/**
 * Lays free roads (outside the stock) from every isolated building to the Town Center or a connected
 * road, by the shortest edge-to-edge route over open ground, so production tests need not lay them.
 */
export function pave(w: World): World {
  const s = w.state;
  const tc = s.buildings.find((b) => b.kind === 'townCenter')!;
  const open = (i: number) => s.tiles[i] === Tile.Grass || s.tiles[i] === Tile.Road;
  for (const b of s.buildings) {
    if (linkedBuildings(s).has(b.id)) continue;
    const net = roadNetwork(s);
    const atTown = new Set(border(s, tc));
    const start = border(s, b).filter(open);
    const prev = new Map<number, number>(start.map((i) => [i, -1]));
    let goal = -1;
    for (let q = 0, queue = start; q < queue.length; q++) {
      const u = queue[q];
      if (atTown.has(u) || net[u] || neighbors4(s, u).some((n) => net[n])) { goal = u; break; }
      for (const n of neighbors4(s, u)) if (open(n) && !prev.has(n)) { prev.set(n, u); queue.push(n); }
    }
    if (goal === -1) throw new Error(`no open ground from building ${b.id} to the Town Center`);
    for (let i = goal; i !== -1; i = prev.get(i)!) s.tiles[i] = Tile.Road;
  }
  onBuildingsChanged(w);
  return w;
}

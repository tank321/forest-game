import { BUILDINGS, type BuildingKind } from '../src/core/buildings';
import { chopTree, hireVillager } from '../src/core/commands';
import { createInitialState } from '../src/core/state';
import { createWorld, type World } from '../src/core/world';

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

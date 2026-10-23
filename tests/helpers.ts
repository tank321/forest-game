import { hireVillager } from '../src/core/commands';
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

export const totalWood = (w: World) =>
  w.state.resources.wood +
  w.state.wood.reduce((a, b) => a + b, 0) +
  w.state.villagers.reduce((a, v) => a + v.carry, 0);

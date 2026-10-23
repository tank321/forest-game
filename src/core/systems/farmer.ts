import { buildingById, footprint, isActive } from '../buildings';
import { gain } from '../economy';
import { tileAt } from '../grid';
import { pathToAny } from '../pathing';
import type { Stats } from '../stats';
import type { Villager } from '../types';
import type { World } from '../world';
import { arrived, goHome, returnToWork, walk } from './movement';

/**
 * Farmer: idle -> toWork -> work -> toHome (food drop-off) -> (deposit) -> toWork ...
 * Farms never run out. If the farm is paused the farmer delivers what it carries and goes idle,
 * where the job system hands it back to lumberjacking. dt-independent like the lumberjack.
 */
export function updateFarmer(w: World, v: Villager, dt: number, st: Stats): void {
  const s = w.state;
  const farm = buildingById(s, v.workplace);
  const active = isActive(s, farm);
  let t = dt;
  while (t > 0) {
    switch (v.state) {
      case 'idle': {
        if (!active) {
          if (v.carry > 0) goHome(w, v, 'food');
          else return;
          break;
        }
        const path = pathToAny(s, tileAt(s, v.x, v.y), new Set(footprint(s, farm)));
        if (!path) return;
        v.path = path;
        v.pathI = 0;
        v.state = 'toWork';
        break;
      }
      case 'toWork':
        if (!active) {
          v.state = 'idle';
          break;
        }
        t = walk(w, v, t, st.speed);
        if (!arrived(v)) return;
        v.state = 'work';
        break;
      case 'work': {
        if (!active) {
          v.state = 'idle';
          break;
        }
        const need = (st.farmCarry - v.carry) / st.farmRate;
        if (need > t) {
          v.carry += st.farmRate * t;
          return;
        }
        t -= need;
        v.carry = st.farmCarry;
        goHome(w, v, 'food');
        break;
      }
      case 'toHome':
        t = walk(w, v, t, st.speed);
        if (!arrived(v)) return;
        gain(s, 'food', v.carry);
        v.carry = 0;
        if (active) returnToWork(v, 'toWork');
        else v.state = 'idle';
        break;
      default: // a state from another job (just reassigned)
        v.state = 'idle';
    }
  }
}

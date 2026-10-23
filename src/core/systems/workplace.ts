import { buildingById, footprint, isActive } from '../buildings';
import { gain } from '../economy';
import { tileAt } from '../grid';
import { pathToAny } from '../pathing';
import type { Stats } from '../stats';
import type { Job, ResourceKey, Villager } from '../types';
import type { World } from '../world';
import { arrived, goHome, returnToWork, walk } from './movement';

export type WorkplaceJob = Exclude<Job, 'lumber'>;

type NumericStat = { [K in keyof Stats]: Stats[K] extends number ? K : never }[keyof Stats];

/** What each workplace job produces, and which stats drive it. */
const WORK: Record<WorkplaceJob, { res: ResourceKey; rate: NumericStat; carry: NumericStat }> = {
  farm: { res: 'food', rate: 'farmRate', carry: 'farmCarry' },
  mine: { res: 'stone', rate: 'mineRate', carry: 'mineCarry' },
};

/**
 * Workplace worker (farmer, miner): idle -> toWork -> work -> toHome (drop-off) -> (deposit) -> toWork ...
 * Workplaces never run out. If the workplace is paused the worker delivers what it carries and goes
 * idle, where the job system hands it back to lumberjacking. dt-independent like the lumberjack.
 */
export function updateWorker(w: World, v: Villager, dt: number, st: Stats): void {
  const s = w.state;
  const { res, rate: rateKey, carry: carryKey } = WORK[v.job as WorkplaceJob];
  const place = buildingById(s, v.workplace);
  const well = place !== undefined && st.wellFarms.has(place.id);
  const rate = st[rateKey] * (well ? st.wellHarvest : 1);
  const carry = st[carryKey] * (well ? st.wellCarry : 1);
  const active = isActive(s, place);
  let t = dt;
  while (t > 0) {
    switch (v.state) {
      case 'idle': {
        if (!active) {
          if (v.carry > 0) goHome(w, v, res);
          else return;
          break;
        }
        const path = pathToAny(s, tileAt(s, v.x, v.y), new Set(footprint(s, place)));
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
        const need = (carry - v.carry) / rate;
        if (need > t) {
          v.carry += rate * t;
          return;
        }
        t -= need;
        v.carry = carry;
        goHome(w, v, res);
        break;
      }
      case 'toHome':
        t = walk(w, v, t, st.speed);
        if (!arrived(v)) return;
        gain(s, res, v.carry);
        v.carry = 0;
        if (active) returnToWork(v, 'toWork');
        else v.state = 'idle';
        break;
      default: // a state from another job (just reassigned)
        v.state = 'idle';
    }
  }
}

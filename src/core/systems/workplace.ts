import { CONFIG } from '../../config';
import { buildingById, isActive } from '../buildings';
import type { Stats } from '../stats';
import type { Building, Job, ResourceKey, Villager } from '../types';
import type { World } from '../world';
import { arrived, deliver, goHome, pathToWork, returnToWork, walk } from './movement';

export type WorkplaceJob = Exclude<Job, 'lumber'>;

type NumericStat = { [K in keyof Stats]: Stats[K] extends number ? K : never }[keyof Stats];

interface Work {
  res: ResourceKey;
  output: (st: Stats, place: Building) => { rate: number; carry: number }; // gather rate and load at this workplace
  also?: { res: ResourceKey; per: NumericStat }; // delivered on top, per unit of `res`
  speed?: NumericStat; // walk speed, if not the villagers' usual one
}

/** What each workplace job produces, and how fast and how much at a given workplace. */
const WORK: Record<WorkplaceJob, Work> = {
  farm: {
    res: 'food',
    output: (st, b) => st.wellFarms.has(b.id)
      ? { rate: st.farmRate * st.wellHarvest, carry: st.farmCarry * st.wellCarry }
      : { rate: st.farmRate, carry: st.farmCarry },
  },
  orchard: { res: 'food', output: (st) => ({ rate: st.orchardRate, carry: st.orchardCarry }), speed: 'orchardSpeed' },
  mine: { res: 'stone', output: (st) => ({ rate: st.mineRate, carry: st.mineCarry }) },
  herd: { res: 'cloth', output: (st) => ({ rate: st.herdRate, carry: st.herdCarry }), also: { res: 'food', per: 'herdFood' } },
  cotton: { res: 'cloth', output: (st) => ({ rate: st.cottonRate, carry: st.cottonCarry }) },
  // Loading takes the same time on every route, so a longer route also pays more per second.
  trade: {
    res: 'gold',
    output: (st, b) => {
      const load = st.tradeLoads.get(b.id) ?? 0;
      return { rate: load / CONFIG.trade.loadTime, carry: load };
    },
  },
};

/** Resource a villager with this job carries. */
export const jobResource = (job: Job): ResourceKey => (job === 'lumber' ? 'wood' : WORK[job].res);

/** What a villager's load delivers, by resource: the load itself, plus any resource delivered alongside it (herders' food). */
export function carried(st: Stats, v: Villager): { res: ResourceKey; n: number }[] {
  const out = [{ res: jobResource(v.job), n: v.carry }];
  const also = v.job === 'lumber' ? undefined : WORK[v.job].also;
  if (also && st[also.per] > 0) out.push({ res: also.res, n: v.carry * st[also.per] });
  return out;
}

/**
 * Workplace worker (farmer, orchardist, miner, herder, picker, trader): idle -> toWork -> work -> toHome (drop-off) -> (deposit) -> toWork ...
 * Workplaces never run out. If the workplace is paused or cut off from the roads the worker delivers what it carries and goes
 * idle, where the job system hands it back to lumberjacking. dt-independent like the lumberjack.
 */
export function updateWorker(w: World, v: Villager, dt: number, st: Stats): void {
  const s = w.state;
  const { res, output, also, speed: speedKey } = WORK[v.job as WorkplaceJob];
  const speed = speedKey ? st[speedKey] : st.speed;
  const place = buildingById(s, v.workplace);
  const active = isActive(s, place, st.linked);
  // Only read in states that require an active (so existing) workplace.
  const { rate, carry } = place ? output(st, place) : { rate: 0, carry: 0 };
  let t = dt;
  while (t > 0) {
    switch (v.state) {
      case 'idle': {
        if (!active) {
          if (v.carry > 0) goHome(w, v, res);
          else return;
          break;
        }
        const path = pathToWork(s, v, place);
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
        t = walk(w, v, t, speed);
        if (!arrived(v)) return;
        v.state = 'work';
        break;
      case 'work': {
        if (!active) {
          v.state = 'idle';
          break;
        }
        // Moving/removing a Well can reduce capacity below an already gathered load.
        if (v.carry >= carry) { goHome(w, v, res); break; }
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
        t = walk(w, v, t, speed);
        if (!arrived(v)) return;
        // A removed workplace's last load still counts for the drop-off.
        deliver(w, v, res, v.carry, place);
        if (also && st[also.per] > 0) deliver(w, v, also.res, v.carry * st[also.per], place);
        v.carry = 0;
        if (active) returnToWork(w, v);
        else v.state = 'idle';
        break;
      default: // a state from another job (just reassigned)
        v.state = 'idle';
    }
  }
}

import { CONFIG } from '../../config';
import { count } from '../achievements';
import { buildingById, isActive } from '../buildings';
import { tileAt } from '../grid';
import { rand } from '../rng';
import { lvl, type SkillId } from '../skills';
import type { Stats } from '../stats';
import type { Building, EventKey, Job, ResourceKey, Villager } from '../types';
import { gainBonus, type Fx, type World } from '../world';
import { quitJob } from './jobs';
import { arrived, deliver, goHome, pathToWork, returnToWork, walk } from './movement';

/** Jobs at a workplace from the WORK table: every job but lumberjacking and tax collecting (collector.ts). */
export type WorkplaceJob = Exclude<Job, 'lumber' | 'tax'>;

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
    output: (st, b) => {
      const well = st.wellFarms.has(b.id);
      return {
        rate: st.farmRate * (well ? st.wellHarvest : 1) * (st.cropBonus.get(b.id) ?? 1),
        carry: st.farmCarry * (well ? st.wellCarry : 1),
      };
    },
  },
  orchard: { res: 'food', output: (st) => ({ rate: st.orchardRate, carry: st.orchardCarry }), speed: 'orchardSpeed' },
  mine: { res: 'stone', output: (st, b) => ({ rate: st.mineRate * (st.veinBonus.get(b.id) ?? 1), carry: st.mineCarry }) },
  herd: {
    res: 'cloth',
    output: (st, b) => ({ rate: st.herdRate * (st.pastureBonus.get(b.id) ?? 1), carry: st.herdCarry }),
    also: { res: 'food', per: 'herdFood' },
  },
  cotton: { res: 'cloth', output: (st) => ({ rate: st.cottonRate, carry: st.cottonCarry }) },
};

/**
 * What `seconds` of work by every working villager in `jobs` gathers at current rates, by workplace id
 * (Harvest Festival, Shearing Day).
 */
export function burst(w: World, st: Stats, jobs: readonly WorkplaceJob[], seconds: number): Map<number, number> {
  const s = w.state;
  const out = new Map<number, number>();
  for (const v of s.villagers) {
    if (!(jobs as readonly Job[]).includes(v.job)) continue;
    const place = buildingById(s, v.workplace);
    if (isActive(s, place, st.linked)) out.set(place.id, (out.get(place.id) ?? 0) + WORK[v.job as WorkplaceJob].output(st, place).rate * seconds);
  }
  return out;
}

/** Golden Fleece and Geodes: a herder's or miner's delivery may bring a jackpot on top. */
const JACKPOTS: Partial<Record<WorkplaceJob, { skill: SkillId; res: ResourceKey; chance: number; n: (load: number) => number; fx: Fx['kind']; count: EventKey }>> = {
  herd: {
    skill: 'goldenFleece', res: 'cloth', chance: CONFIG.skills.goldenFleece.chance, fx: 'fleece', count: 'fleece',
    n: (load) => load * (CONFIG.skills.goldenFleece.mult - 1),
  },
  mine: {
    skill: 'geodes', res: 'gold', chance: CONFIG.skills.geodes.chance, fx: 'geode', count: 'geodes',
    n: (load) => load * CONFIG.skills.geodes.goldPerStone,
  },
};

function jackpot(w: World, v: Villager): void {
  const s = w.state;
  const j = JACKPOTS[v.job as WorkplaceJob];
  const level = j ? lvl(s, j.skill) : 0;
  if (!j || !level || v.carry <= 0 || rand(s) >= j.chance * level) return;
  const n = j.n(v.carry);
  gainBonus(w, j.res, n);
  w.fx.push({ kind: j.fx, i: tileAt(s, v.x, v.y), n });
  count(s, j.count);
}

/** Resource a villager with this job carries. */
export const jobResource = (job: Job): ResourceKey => (job === 'lumber' ? 'wood' : job === 'tax' ? 'gold' : WORK[job].res);

/** What a villager's load delivers, by resource: the load itself, plus any resource delivered alongside it (herders' food). */
export function carried(st: Stats, v: Villager): { res: ResourceKey; n: number }[] {
  const out = [{ res: jobResource(v.job), n: v.carry }];
  const also = v.job === 'lumber' || v.job === 'tax' ? undefined : WORK[v.job].also;
  if (also && st[also.per] > 0) out.push({ res: also.res, n: v.carry * st[also.per] });
  return out;
}

/**
 * Workplace worker (farmer, orchardist, miner, herder, picker): idle -> toWork -> work -> toHome (drop-off) -> (deposit) -> toWork ...
 * Workplaces never run out. If the workplace is paused or cut off from the roads the worker delivers what it carries and goes
 * idle, where the job system hands it back to lumberjacking; one that can't walk to it at all goes back at once.
 * dt-independent like the lumberjack.
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
        if (!path) return quitJob(v); // cut off from it (a building placed in the way): someone who can reach it takes over
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
        t = walk(w, v, t, speed, st);
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
        t = walk(w, v, t, speed, st);
        if (!arrived(v)) return;
        // A removed workplace's last load still counts for the drop-off.
        deliver(w, v, res, v.carry, place);
        if (also && st[also.per] > 0) deliver(w, v, also.res, v.carry * st[also.per], place);
        jackpot(w, v);
        v.carry = 0;
        if (active) returnToWork(w, v);
        else v.state = 'idle';
        break;
      default: // a state from another job (just reassigned)
        v.state = 'idle';
    }
  }
}

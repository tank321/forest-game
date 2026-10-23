import { CONFIG } from '../config';
import { distToBuilding } from './buildings';
import { lvl } from './skills';
import type { GameState } from './types';

export interface Stats {
  speed: number; // villager tiles/s
  chopRate: number; // villager wood/s
  carry: number;
  manualChop: number; // wood per tap
  campBonus: number; // chop multiplier near a Lumber Camp
  campRadius: number;
  perTree: number; // villagers allowed on one tree
  farmRate: number; // farmer food/s
  farmCarry: number;
  mineRate: number; // miner stone/s
  mineCarry: number;
  wellRadius: number; // Chebyshev reach of a Well
  wellFarms: ReadonlySet<number>; // ids of farms boosted by a Well
  wellHarvest: number; // farm rate multiplier from a Well
  wellCarry: number; // farm carry multiplier from a Well
}

/** Effective gameplay values: base config × upgrades × skills (later: × legacy). */
export function getStats(s: GameState): Stats {
  const { axe, farm, pick } = s.upgrades;
  const f = CONFIG.farm;
  const p = CONFIG.pick;
  const wellRadius = CONFIG.well.radius + lvl(s, 'deepWells');
  const { speed, chopRate, carry } = CONFIG.villager;
  const a = CONFIG.axe;
  return {
    speed: speed * (1 + 0.1 * lvl(s, 'swiftFeet')),
    chopRate: chopRate * a.speedGrowth ** axe * (1 + 0.2 * lvl(s, 'sharpAxes')),
    carry: (carry + a.carryPerLevel * axe + 2 * lvl(s, 'bigBaskets')) * a.carryGrowth ** axe,
    manualChop: CONFIG.manualChop * 5 ** lvl(s, 'powerSwing'),
    campBonus: lvl(s, 'campCrews') ? 1.5 : 1,
    campRadius: 3,
    perTree: lvl(s, 'teamwork') ? 2 : 1,
    farmRate: f.harvestRate * f.speedGrowth ** farm * (1 + 0.2 * lvl(s, 'greenThumbs')),
    farmCarry: (carry + f.carryPerLevel * farm + 2 * lvl(s, 'bigBaskets')) * f.carryGrowth ** farm,
    mineRate: p.mineRate * p.speedGrowth ** pick * (1 + 0.2 * lvl(s, 'stonecutters')),
    mineCarry: (carry + p.carryPerLevel * pick + 2 * lvl(s, 'bigBaskets')) * p.carryGrowth ** pick,
    wellRadius,
    wellFarms: wellFarms(s, wellRadius),
    wellHarvest: CONFIG.well.harvestMult,
    wellCarry: CONFIG.well.carryMult,
  };
}

/** Farms with any tile within `r` of a Well. Recomputed on demand: wells × farms is small. */
function wellFarms(s: GameState, r: number): Set<number> {
  const wells = s.buildings.filter((b) => b.kind === 'well');
  const out = new Set<number>();
  if (!wells.length) return out;
  for (const f of s.buildings) {
    if (f.kind === 'farm' && wells.some((wl) => distToBuilding(f, wl.x, wl.y) <= r)) out.add(f.id);
  }
  return out;
}

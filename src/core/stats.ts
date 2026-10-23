import { CONFIG } from '../config';
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
}

/** Effective gameplay values: base config × upgrades × skills (later: × legacy). */
export function getStats(s: GameState): Stats {
  const { axe, farm } = s.upgrades;
  const f = CONFIG.farm;
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
  };
}

import { CONFIG } from '../config';
import { unlocks } from '../core/buildings';
import { commission } from '../core/economy';
import { lvl, prerequisite, SKILLS, type SkillId } from '../core/skills';
import type { GameState } from '../core/types';
import { BUILDING_TEXT } from './text';

export type SkillStatus = 'Unlearned' | 'Learned' | 'Locked' | 'Maxed';

/** A learned skill is never Locked, even if an older save learned it out of track order. */
export function skillStatus(s: GameState, id: SkillId): SkillStatus {
  const level = lvl(s, id);
  if (level === SKILLS[id].max) return 'Maxed';
  if (level > 0) return 'Learned';
  const req = prerequisite(id);
  return req && !lvl(s, req) ? 'Locked' : 'Unlearned';
}

/** Total contribution of this skill, before other upgrades and skills. */
export function skillBonus(id: SkillId, level: number): string {
  const discount = `${Number(((1 - 0.85 ** level) * 100).toFixed(1))}%`;
  switch (id) {
    case 'sharpAxes': return `+${20 * level}% villager chop speed`;
    case 'bigBaskets': return `+${2 * level} carry capacity before upgrade multipliers`;
    case 'swiftFeet': return `+${10 * level}% villager walk speed`;
    case 'powerSwing': return `×${5 ** level} wood per tap`;
    case 'roomyHouses': return `+${level} population per house`;
    case 'recruiters': return `${discount} lower villager costs`;
    case 'masterBuilders': return `${level ? 20 : 0}% lower building costs`;
    case 'campCrews': return `×${level ? 1.5 : 1} chop speed within 3 tiles of a Lumber Camp`;
    case 'teamwork': return `${level ? 2 : 1} villager${level ? 's' : ''} per tree`;
    case 'greenThumbs': return `+${20 * level}% farm harvest speed`;
    case 'stonecutters': return `+${20 * level}% mining speed`;
    case 'masons': return `${discount} lower stone costs`;
    case 'quarryCrews': return `+${level} miner${level === 1 ? '' : 's'} per quarry`;
    case 'fertileHerding': return level ? 'Herders deliver 1 food per cloth' : 'Herders deliver cloth only';
    case 'taxCollectors': return `+${20 * level}% tax`;
    case 'packMules': return `+${25 * level}% gold per trade trip`;
    case 'shrewdTraders': return `${Math.round(100 * commission({ skills: { shrewdTraders: level } }))}% market commission`;
    case 'quarrying': case 'wells': case 'orchards': case 'sheepFarms': case 'cottonFields':
    case 'markets': case 'taxOffices': case 'tradingPosts':
      return `${BUILDING_TEXT[unlocks(id)!].name} ${level ? 'unlocked' : 'not yet buildable'}`;
    case 'deepWells': return `Wells reach farms within ${CONFIG.well.radius + level} tile${CONFIG.well.radius + level === 1 ? '' : 's'}`;
  }
}

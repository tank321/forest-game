import { CONFIG } from '../config';
import { commission } from '../core/economy';
import { lvl, SKILLS, type SkillDef, type SkillId } from '../core/skills';
import type { GameState } from '../core/types';

export type SkillGroup = 'Gathering' | 'Village' | 'Building';
export type SkillStatus = 'Unlearned' | 'Learned' | 'Locked' | 'Maxed';

export const SKILL_GROUP: Record<SkillId, SkillGroup> = {
  sharpAxes: 'Gathering', bigBaskets: 'Gathering', swiftFeet: 'Gathering',
  powerSwing: 'Gathering', campCrews: 'Gathering', teamwork: 'Gathering',
  greenThumbs: 'Gathering', stonecutters: 'Gathering', fertileHerding: 'Gathering',
  roomyHouses: 'Village', recruiters: 'Village', quarryCrews: 'Village',
  taxCollectors: 'Village', packMules: 'Village', shrewdTraders: 'Village',
  masterBuilders: 'Building', masons: 'Building', deepWells: 'Building',
};

export const prerequisite = (id: SkillId) => (SKILLS[id] as SkillDef).requires as SkillId | undefined;

export function skillStatus(s: GameState, id: SkillId): SkillStatus {
  const req = prerequisite(id);
  if (req && !lvl(s, req)) return 'Locked';
  const level = lvl(s, id);
  return level === SKILLS[id].max ? 'Maxed' : level > 0 ? 'Learned' : 'Unlearned';
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
    case 'fertileHerding': return level ? 'Herders deliver 1 food per leather' : 'Herders deliver leather only';
    case 'taxCollectors': return `+${20 * level}% tax`;
    case 'packMules': return `+${25 * level}% gold per trade trip`;
    case 'shrewdTraders': return `${Math.round(100 * commission({ skills: { shrewdTraders: level } }))}% market commission`;
    case 'deepWells': return `Wells reach farms within ${CONFIG.well.radius + level} tile${CONFIG.well.radius + level === 1 ? '' : 's'}`;
  }
}

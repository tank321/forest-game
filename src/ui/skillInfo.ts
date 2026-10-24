import { CONFIG } from '../config';
import { unlocks } from '../core/buildings';
import { commission } from '../core/economy';
import { newLegacy } from '../core/legacy';
import { levelsNeeded, lvl, prerequisite, requirementMet, SKILLS, trackLevels, trackOf, type SkillId } from '../core/skills';
import type { GameState } from '../core/types';
import { BUILDING_TEXT, SKILL_TEXT, TRACK_TEXT } from './text';

export type SkillStatus = 'Unlearned' | 'Learned' | 'Locked' | 'Maxed';

/** A learned skill is never Locked, even if an older save learned it out of track order. */
export function skillStatus(s: GameState, id: SkillId): SkillStatus {
  const level = lvl(s, id);
  if (level === SKILLS[id].max) return 'Maxed';
  if (level > 0) return 'Learned';
  return requirementMet(s, id) ? 'Unlearned' : 'Locked';
}

/** What a Locked skill is waiting for. */
export function lockReason(s: GameState, id: SkillId): string {
  const req = prerequisite(id);
  const t = trackOf(id);
  const need = levelsNeeded(id);
  const levels = need ? `${need} levels in ${TRACK_TEXT[t].name} (${Math.min(trackLevels(s, t), need)}/${need})` : '';
  return `Requires ${[req && SKILL_TEXT[req].name, levels].filter(Boolean).join(' and ')}`;
}

/** Total contribution of this skill, before other upgrades and skills. */
export function skillBonus(id: SkillId, level: number): string {
  const discount = `${Number(((1 - 0.85 ** level) * 100).toFixed(1))}%`;
  const k = CONFIG.skills;
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
    case 'fellingCrews': return `${level ? 3 : 2} villagers per flagged tree`;
    case 'greenThumbs': return `+${20 * level}% farm harvest speed`;
    case 'stonecutters': return `+${20 * level}% mining speed`;
    case 'masons': return `Buildings and upgrades need ${discount} less stone`;
    case 'quarryCrews': return `+${level} miner${level === 1 ? '' : 's'} per quarry`;
    case 'fertileHerding': return level ? 'Herders deliver 1 food per cloth' : 'Herders deliver cloth only';
    case 'taxCollectors': return `+${20 * level}% tax`;
    case 'packMules': return `+${25 * level}% gold per trade trip`;
    case 'shrewdTraders': return `${Math.round(100 * commission({ skills: { shrewdTraders: level }, legacy: newLegacy(), time: 0 }))}% market commission`;
    case 'quarrying': case 'wells': case 'orchards': case 'sheepFarms': case 'tailoring': case 'cottonFields':
    case 'markets': case 'taxOffices': case 'tradingPosts':
      return `${BUILDING_TEXT[unlocks(id)!].name} ${level ? 'unlocked' : 'not yet buildable'}`;
    case 'sweepingStrike': return level ? `Taps also hit the trees around for ${CONFIG.skills.sweep * 100}%` : 'Taps hit one tree';
    case 'momentum': return `Combo up to +${Math.round(CONFIG.skills.combo.capPerLevel * 100 * level)}%`;
    case 'keenEyes': return `See ${CONFIG.fogRadius + CONFIG.skills.keenEyes.vision * level} rings into the forest; relics ${Math.round(CONFIG.skills.keenEyes.relicGap * 100 * level)}% sooner`;
    case 'heartwood': return `${Math.round(CONFIG.skills.heartwood.chance * 100 * level)}% chance per felled tree of +${CONFIG.skills.heartwood.bonus * 100}% wood`;
    case 'timber': return level ? `Felled trees topple onto a neighbour for ${CONFIG.skills.timber * 100}% of their wood` : 'Felled trees fall harmlessly';
    case 'cropRotation': return level ? `+${CONFIG.skills.cropRotation.perFarm * 100}% harvest per touching farm` : 'No bonus from touching farms';
    case 'farmhands': return `+${level} farmer${level === 1 ? '' : 's'} per farm`;
    case 'rootCellars': return `Villagers eat ${discount} less food`;
    case 'greenhouses': return `Winter harvest ×${level ? CONFIG.skills.greenhouse : CONFIG.seasons.farm[3]}`;
    case 'harvestFestival': return level ? `${CONFIG.skills.festival.seconds} s of harvest as winter begins; walk ×${CONFIG.skills.festival.winterWalk} in winter` : 'No festival';
    case 'openPastures': return `+${Math.round(k.openPastures.perTile * 100 * level)}% wool per open tile near a Sheep Farm`;
    case 'shearingDay': return level ? `${k.shearing} s of wool as spring begins` : 'No shearing day';
    case 'goldenFleece': return `${Math.round(k.goldenFleece.chance * 100 * level)}% chance per delivery of ×${k.goldenFleece.mult} cloth`;
    case 'weavers': return `+${Math.round(k.weavers * 100 * level)}% cloth per Tailor upgrade level`;
    case 'grazingFlocks': return level ? `Sheep Farms graze trees within ${k.grazing.radius} tiles like ${k.grazing.crews} lumberjacks` : 'Sheep stay in their pens';
    case 'richVeins': return `+${Math.round(k.richVeins.perTile * 100 * level)}% stone per tile from the Town Center`;
    case 'geodes': return `${Math.round(k.geodes.chance * 100 * level)}% chance per delivery of ${k.geodes.goldPerStone} gold per stone`;
    case 'cobblestone': return `+${Math.round(k.cobblestone * 100 * level)}% walk speed along roads`;
    case 'deepShafts': return level ? `Mining ×${k.deepShafts} in winter, never slowed by cold` : 'Miners slow down in the cold';
    case 'dynamite': return level ? `Blast every ${k.dynamite.cooldown} s: ${k.dynamite.stoneSeconds} s of stone, trees hit like ${k.dynamite.taps} taps` : 'No blasting';
    case 'errandRunners': return `+${Math.round(k.errandRunners * 100 * level)}% walk speed when empty-handed`;
    case 'wellFed': return level ? `Gathering ×${k.wellFed.gather} with ${k.wellFed.perVillager} food per villager in stock` : 'No surplus bonus';
    case 'surveyors': return `+${k.surveyors * level} roads per house`;
    case 'frontierOutpost': return `${BUILDING_TEXT.outpost.name} ${level ? 'unlocked' : 'not yet buildable'}`;
    case 'tollRoads': return `${Number((k.toll * level).toFixed(2))} gold per road tile walked`;
    case 'guildContracts': return level ? `${k.contracts.board} contracts on the Market board` : 'No contracts';
    case 'midsummerFair': return level ? `Summer: no commission, Trading Posts ×${k.fair.tradeMult}` : 'No fair';
    case 'merchantCaravans': return level ? `A caravan with ${k.caravan.deals} deals each winter` : 'No caravans';
    case 'deepWells': return `Wells reach farms within ${CONFIG.well.radius + level} tile${CONFIG.well.radius + level === 1 ? '' : 's'}`;
  }
}

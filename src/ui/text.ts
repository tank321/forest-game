import type { BuildingKind } from '../core/buildings';
import type { SkillId } from '../core/skills';
import type { Cost, ResourceKey, Resources } from '../core/types';
import type { UiIcon } from '../render/sprites';

export const BUILDING_TEXT: Record<BuildingKind, { name: string; desc: string }> = {
  townCenter: { name: 'Town Center', desc: 'Hire villagers. Drop-off for everything.' },
  house: { name: 'House', desc: 'Raises the population cap. Must touch the Town Center or a house.' },
  lumberCamp: { name: 'Lumber Camp', desc: 'Stores wood. Upgrade all lumberjacks here.' },
  barn: { name: 'Barn', desc: 'Stores food. Upgrade all farms here.' },
  farm: { name: 'Farm', desc: 'Assigns a villager to grow food.' },
  quarry: { name: 'Quarry', desc: 'Miners gather stone and deliver it to the Town Center.' },
  well: { name: 'Well', desc: 'Nearby farms harvest ×3 and carry ×2.' },
};

export const SKILL_TEXT: Record<SkillId, { name: string; desc: string; icon: UiIcon }> = {
  sharpAxes: { name: 'Sharp Axes', desc: '+20% villager chop speed per level', icon: 'chop' },
  bigBaskets: { name: 'Big Baskets', desc: '+2 villager carry per level', icon: 'basket' },
  swiftFeet: { name: 'Swift Feet', desc: '+10% villager walk speed per level', icon: 'boot' },
  powerSwing: { name: 'Power Swing', desc: 'Your taps chop ×5 per level', icon: 'bolt' },
  roomyHouses: { name: 'Roomy Houses', desc: '+1 population per house per level', icon: 'house' },
  recruiters: { name: 'Recruiters', desc: 'Villagers cost 15% less per level', icon: 'pop' },
  masterBuilders: { name: 'Master Builders', desc: 'Buildings cost 20% less', icon: 'hammer' },
  campCrews: { name: 'Camp Crews', desc: 'Chop ×1.5 within 3 tiles of a Lumber Camp', icon: 'wood' },
  teamwork: { name: 'Teamwork', desc: 'Two villagers can work the same tree', icon: 'trees' },
  greenThumbs: { name: 'Green Thumbs', desc: '+20% farm harvest per level', icon: 'food' },
  stonecutters: { name: 'Stonecutters', desc: '+20% mining speed per level', icon: 'pick' },
  masons: { name: 'Masons', desc: 'Stone costs 15% less per level', icon: 'stone' },
  quarryCrews: { name: 'Quarry Crews', desc: '+1 miner per quarry per level', icon: 'pair' },
  deepWells: { name: 'Deep Wells', desc: 'Wells boost farms within 2 tiles', icon: 'drop' },
};

const UNITS = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi'];
/** 999 → "999", 12345 → "12.3k", 4.56e6 → "4.56M". */
export function fmt(n: number): string {
  if (n < 1000) return String(Math.floor(n));
  const e = Math.min(Math.floor(Math.log10(n) / 3), UNITS.length - 1);
  const v = n / 1000 ** e;
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)}${UNITS[e]}`;
}
export const icon = (name: UiIcon) => `<i class="ico ico-${name}"></i>`;

/** A cost as icon chips; chips the player can't afford yet are marked short. */
export const costHtml = (c: Cost, have: Resources) =>
  (Object.entries(c) as [ResourceKey, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `<span class="chip${have[k] < v ? ' short' : ''}" title="${k}">${icon(k)}${fmt(v)}</span>`)
    .join('');

export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}

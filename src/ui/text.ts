import { CONFIG } from '../config';
import { unlocks, type BuildingKind } from '../core/buildings';
import type { SkillId, Track } from '../core/skills';
import type { Cost, ResourceKey, Resources } from '../core/types';
import type { UiIcon } from '../render/sprites';

export const BUILDING_TEXT: Record<BuildingKind, { name: string; desc: string }> = {
  townCenter: { name: 'Town Center', desc: 'Hire villagers. Drop-off for everything.' },
  house: { name: 'House', desc: 'Raises the population cap. Must touch the Town Center or a city building.' },
  lumberCamp: { name: 'Lumber Camp', desc: 'Stores wood. Upgrade all lumberjacks here.' },
  barn: { name: 'Barn', desc: 'Stores food and cloth. Upgrade all farms, orchards, sheep farms and cotton plantations here.' },
  farm: { name: 'Farm', desc: 'Assigns a villager to grow food.' },
  orchard: {
    name: 'Fruit Orchard',
    desc: `Three orchardists walk ×${CONFIG.orchard.speedMult} as fast as a farmer, harvest ×${CONFIG.orchard.rateMult} and carry ×${CONFIG.orchard.carryMult}. Barn upgrades and seasons apply.`,
  },
  quarry: { name: 'Quarry', desc: 'Miners gather stone and deliver it to the Town Center.' },
  sheepFarm: { name: 'Sheep Farm', desc: 'A herder spins wool into cloth for the Town Center or the nearest Barn.' },
  cottonPlantation: {
    name: 'Cotton Plantation',
    desc: `Five pickers gather cloth ×${CONFIG.cotton.rateMult} as fast as a herder and carry ×${CONFIG.cotton.carryMult} as much. Barn upgrades apply.`,
  },
  well: { name: 'Well', desc: 'Nearby farms harvest ×3 and carry ×2.' },
  market: {
    name: 'Market',
    desc: 'Sell goods for gold or buy them with gold. Traders deliver gold here. Must touch the Town Center or a city building.',
  },
  taxOffice: {
    name: 'Tax Office',
    desc: `Houses within ${CONFIG.tax.radius} tiles pay gold. Must touch the Town Center or a city building.`,
  },
  tradingPost: {
    name: 'Trading Post',
    desc: 'A trader carries gold to the nearest Market. The farther apart they are, the more gold per trip.',
  },
};

export const TRACK_TEXT: Record<Track, { name: string; icon: UiIcon }> = {
  forestry: { name: 'Forestry', icon: 'trees' },
  villagers: { name: 'Villagers', icon: 'pop' },
  buildings: { name: 'Buildings', icon: 'hammer' },
  farming: { name: 'Farming', icon: 'food' },
  herding: { name: 'Herding', icon: 'cloth' },
  mining: { name: 'Mining', icon: 'pick' },
  trade: { name: 'Trade', icon: 'gold' },
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
  fertileHerding: { name: 'Fertile Herding', desc: 'Herders also bring back as much food as cloth', icon: 'food' },
  taxCollectors: { name: 'Tax Collectors', desc: '+20% tax per level', icon: 'gold' },
  packMules: { name: 'Pack Mules', desc: '+25% gold per trade trip per level', icon: 'basket' },
  shrewdTraders: { name: 'Shrewd Traders', desc: 'Market commission 5 points lower per level', icon: 'gold' },
  quarrying: { name: 'Quarrying', desc: 'Unlocks the Quarry', icon: 'stone' },
  wells: { name: 'Wells', desc: 'Unlocks the Well', icon: 'drop' },
  orchards: { name: 'Orchards', desc: 'Unlocks the Fruit Orchard', icon: 'food' },
  sheepFarms: { name: 'Sheep Farms', desc: 'Unlocks the Sheep Farm', icon: 'cloth' },
  cottonFields: { name: 'Cotton Fields', desc: 'Unlocks the Cotton Plantation', icon: 'cloth' },
  markets: { name: 'Markets', desc: 'Unlocks the Market', icon: 'gold' },
  taxOffices: { name: 'Tax Offices', desc: 'Unlocks the Tax Office', icon: 'gold' },
  tradingPosts: { name: 'Trading Posts', desc: 'Unlocks the Trading Post', icon: 'gold' },
};

/** A skill's icon; a skill that unlocks a building shows that building's thumbnail instead. */
export function skillIcon(id: SkillId): string {
  const kind = unlocks(id);
  return kind ? `<i class="ico skill-thumb thumb-${kind}"></i>` : icon(SKILL_TEXT[id].icon);
}

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

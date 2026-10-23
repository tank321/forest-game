import { CONFIG } from '../config';
import { SEASONS, WINTER } from '../core/seasons';
import type { Stats } from '../core/stats';

export const seasonName = (i: number) => SEASONS[i][0].toUpperCase() + SEASONS[i].slice(1);

/** What season `i` means for the town as it is now (upkeep scales with villagers and coats). */
export function seasonEffects(st: Stats, i: number): string[] {
  const farm = CONFIG.seasons.farm[i];
  const { freeVillagers, hungry, cold } = CONFIG.upkeep;
  const winter = i === WINTER;
  return [
    farm === 0 ? 'Farms lie fallow' : farm === 1 ? 'Farms harvest normally' : `Farms harvest ×${farm}`,
    st.eat ? `Villagers eat ${st.eat.toFixed(2)} food/s` : `No food upkeep yet (the first ${freeVillagers} villagers are free)`,
    !winter ? 'No firewood needed' : st.winterBurn ? `Fires burn ${st.winterBurn.toFixed(2)} wood/s` : 'No firewood needed yet',
    ...(st.eat ? [`Out of food: chopping and mining ×${hungry}`] : []),
    ...(winter && st.winterBurn ? [`Out of firewood: farming, mining and herding ×${cold}`] : []),
  ];
}

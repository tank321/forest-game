import { CONFIG } from '../config';
import { SEASONS, SPRING, SUMMER, WINTER } from '../core/seasons';
import { lvl } from '../core/skills';
import type { Stats } from '../core/stats';
import type { GameState } from '../core/types';
import { fmt } from './text';

export const seasonName = (i: number) => SEASONS[i][0].toUpperCase() + SEASONS[i].slice(1);

/**
 * What season `i` means for the town as it is now, in short phrases: the farm and orchard harvest, winter's firewood,
 * and the seasonal skills learned. Year-round food upkeep shows in the food rate and shortages on their own chip,
 * so they are left out.
 */
export function seasonEffects(s: GameState, st: Stats, i: number): string[] {
  const k = CONFIG.skills;
  const farm = st.farmSeason[i];
  const out = [farm === 0 ? 'No harvest' : farm === 1 ? 'Normal harvest' : `Harvest ×${farm}`];
  if (i === SPRING && lvl(s, 'shearingDay')) out.push(`Shearing Day: ${k.shearing} s of wool`);
  if (i === SPRING && st.springBirths) out.push(`Spring Births: up to +${st.springBirths} villagers`);
  if (i === SUMMER && lvl(s, 'midsummerFair')) out.push(`Fair: no commission, trade ×${k.fair.tradeMult}`);
  if (i === WINTER) {
    if (st.winterBurn) out.push(`Firewood ${fmt(60 * st.winterBurn)} wood/min`);
    if (lvl(s, 'harvestFestival')) out.push(`Festival: ${k.festival.seconds} s of harvest, walk ×${k.festival.winterWalk}`);
    if (lvl(s, 'deepShafts')) out.push(`Mining ×${k.deepShafts}`);
    if (lvl(s, 'merchantCaravans')) out.push(`Caravan: ${k.caravan.deals} deals`);
  }
  return out;
}

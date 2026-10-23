import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { prestige } from '../src/core/commands';
import { buildingCost, popCap, villagerCost } from '../src/core/economy';
import { availablePerks, canPrestige, legacyRequirement } from '../src/core/legacy';
import { roadStock } from '../src/core/roads';
import { createInitialState } from '../src/core/state';
import { getStats } from '../src/core/stats';
import { createWorld } from '../src/core/world';
import { smallWorld } from './helpers';

const L = CONFIG.legacy.perks;

describe('legacy', () => {
  it('rebuilds once enough skill levels are learned, following the perk tree', () => {
    const w = smallWorld(30, 2);
    const s = w.state;
    s.skills = { sharpAxes: 5, bigBaskets: 5, swiftFeet: 4 };
    expect(canPrestige(s)).toBe(false);
    expect(prestige(w, 'masterHarvest')).toBeNull();
    s.skills.swiftFeet = 5;
    expect(canPrestige(s)).toBe(true);
    expect(prestige(w, 'urbanCore')).toBeNull(); // not yet reachable

    const next = prestige(w, 'masterHarvest')!;
    expect(next.seed).not.toBe(s.seed);
    expect(next.legacy).toEqual({ runs: 1, perks: { masterHarvest: 1 } });
    expect(next.skills).toEqual({});
    expect(next.villagers).toHaveLength(0);
    expect(legacyRequirement(next)).toBe(CONFIG.legacy.base + CONFIG.legacy.step);
    expect(roadStock(next)).toBe(roadStock(s) + CONFIG.legacy.roadsPerRun);
    expect(availablePerks(next)).toEqual(['swiftAndStrong']);
  });

  it('multiplies gathering, walking and carrying', () => {
    const s = smallWorld(30, 3).state;
    const base = getStats(s);
    s.legacy.perks = { masterHarvest: 1, swiftAndStrong: 1, legacyX2: 2 };
    const st = getStats(s);
    const gather = L.masterHarvest.gather * L.legacyX2.gather ** 2;
    expect(st.chopRate).toBeCloseTo(base.chopRate * gather);
    expect(st.mineRate).toBeCloseTo(base.mineRate * gather);
    expect(st.speed).toBeCloseTo(base.speed * L.swiftAndStrong.speed);
    expect(st.carry).toBeCloseTo(base.carry * L.swiftAndStrong.carry);

    s.legacy.perks = { tradeGuilds: 1 }; // 3 lumberjacks
    const { chop, cap, taper } = L.tradeGuilds;
    expect(getStats(s).chopRate).toBeCloseTo(base.chopRate * chop * (1 + cap * (1 - taper ** 3)));
    expect(getStats(s).farmRate).toBeCloseTo(base.farmRate); // no farmers yet
  });

  it('starts a city run bigger and cheaper, its starting villagers free of upkeep', () => {
    const plain = createWorld(createInitialState(1, 30, 6)).state;
    const s = createWorld(createInitialState(1, 30, 6, { runs: 2, perks: { urbanCore: 1, prosperousCity: 1 } })).state;
    expect(s.villagers).toHaveLength(L.prosperousCity.villagers);
    expect(s.origin.w).toBe(L.urbanCore.start);
    expect(popCap(s)).toBe(L.urbanCore.basePop);
    expect(villagerCost(s).wood).toBe(Math.round(villagerCost(plain).wood! * L.urbanCore.hire));
    expect(buildingCost(s, 'house').wood).toBe(Math.round(buildingCost(plain, 'house').wood! * L.prosperousCity.build));
    expect(getStats(s).eat).toBe(0);
  });
});

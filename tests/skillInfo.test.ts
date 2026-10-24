import { describe, expect, it } from 'vitest';
import { villagerCost } from '../src/core/economy';
import { availableSkills, SKILL_IDS, SKILLS, TRACK_IDS, TRACKS } from '../src/core/skills';
import { getStats } from '../src/core/stats';
import { skillBonus, skillStatus } from '../src/ui/skillInfo';
import { skillIcon } from '../src/ui/text';
import { smallWorld } from './helpers';

describe('skill journal previews', () => {
  it('distinguishes prerequisites, unlearned, learned, and maxed skills consistently with eligibility', () => {
    const s = smallWorld().state;
    expect(skillStatus(s, 'bigBaskets')).toBe('Locked');
    expect(skillStatus(s, 'swiftFeet')).toBe('Unlearned');
    s.skills.swiftFeet = 1;
    expect(skillStatus(s, 'swiftFeet')).toBe('Learned');
    expect(skillStatus(s, 'bigBaskets')).toBe('Unlearned');
    s.skills.sharpAxes = 1;
    s.skills.powerSwing = SKILLS.powerSwing.max;
    expect(skillStatus(s, 'powerSwing')).toBe('Maxed');
    const eligible = availableSkills(s);
    for (const id of SKILL_IDS) {
      expect(eligible.includes(id)).toBe(['Unlearned', 'Learned'].includes(skillStatus(s, id)));
    }
  });

  it('never shows a skill learned out of track order as locked', () => {
    const s = smallWorld().state;
    s.skills = { recruiters: 1 }; // an older save, before tracks
    expect(skillStatus(s, 'recruiters')).toBe('Learned');
    expect(skillStatus(s, 'roomyHouses')).toBe('Locked');
  });

  it('shows exponential tap gains and additive production bonuses', () => {
    const s = smallWorld().state;
    s.skills = { powerSwing: 2, sharpAxes: 3 };
    const st = getStats(s);
    expect(skillBonus('powerSwing', 0)).toBe('×1 wood per tap');
    expect(skillBonus('powerSwing', 2)).toBe(`×${st.manualChop} wood per tap`);
    expect(skillBonus('sharpAxes', 3)).toBe('+60% villager chop speed');
    expect(st.chopRate / getStats({ ...s, skills: {} }).chopRate).toBeCloseTo(1.6);
  });

  it('previews compounding discounts rather than adding the percentages', () => {
    const s = smallWorld().state;
    s.hires.wood = 0;
    s.skills.recruiters = 2;
    expect(skillBonus('recruiters', 2)).toBe('27.8% lower villager costs');
    expect(skillBonus('masons', 3)).toBe('Buildings and upgrades need 38.6% less stone');
    expect(villagerCost(s).wood).toBe(7);
  });

  it('shows the base and upgraded well reach used by the simulation', () => {
    const s = smallWorld().state;
    expect(skillBonus('deepWells', 0)).toBe(`Wells reach farms within ${getStats(s).wellRadius} tile`);
    s.skills.deepWells = 1;
    expect(skillBonus('deepWells', 1)).toBe(`Wells reach farms within ${getStats(s).wellRadius} tiles`);
  });

  it('gives every skill in a track its own icon', () => {
    for (const t of TRACK_IDS) expect(new Set(TRACKS[t].map(skillIcon)).size).toBe(TRACKS[t].length);
  });
});

import { describe, expect, it } from 'vitest';
import { hireVillager, placeBuilding, placeRoad, upgrade } from '../src/core/commands';
import { nextStep, resumeStep, STEPS } from '../src/ui/tutorial';
import { clearArea, pave, smallWorld } from './helpers';

describe('tutorial', () => {
  it('steps finish in order as their goals are met, and the last waits for the player', () => {
    const w = smallWorld(20);
    const s = w.state;
    s.nextRelicAt = Infinity;
    expect(nextStep(w, 0)).toBe(0);
    s.resources.wood = 10;
    expect(nextStep(w, 0)).toBe(1); // can afford the first hire
    hireVillager(w);
    expect(nextStep(w, 1)).toBe(2);
    s.resources.wood = 1e6;
    for (let k = 0; k < 4; k++) hireVillager(w);
    expect(nextStep(w, 2)).toBe(3);

    clearArea(w, 2, 2, 17, 17);
    expect(placeBuilding(w, 'house', 12, 8)).toBe(true); // touches the Town Center
    expect(nextStep(w, 3)).toBe(4);
    expect(placeBuilding(w, 'farm', 14, 14)).toBe(true);
    expect(nextStep(w, 4)).toBe(4); // isolated: not done until it's connected
    expect(STEPS[4].text(w, {} as never)).toMatch(/isolated/);
    pave(w);
    // The pavement that joined the farm is a road joined to the Town Center, so the road step is already done.
    expect(nextStep(w, 4)).toBe(6);
    expect(placeBuilding(w, 'lumberCamp', 3, 3)).toBe(true);
    pave(w);
    expect(upgrade(w, 'axe')).toBe(true);
    expect(nextStep(w, 6)).toBe(7);
    expect(placeBuilding(w, 'barn', 14, 3)).toBe(true);
    expect(nextStep(w, 7)).toBe(7);
    pave(w);
    expect(upgrade(w, 'farm')).toBe(true);
    expect(nextStep(w, 7)).toBe(8);
    s.skills.sharpAxes = 1;
    expect(nextStep(w, 8)).toBe(9); // waits for the skill tree to be opened
    expect(nextStep(w, 8, { skillTree: true })).toBe(STEPS.length - 1);
  });

  it('the road step waits for a road joined to the Town Center', () => {
    const w = smallWorld(20);
    const s = w.state;
    s.nextRelicAt = Infinity;
    expect(nextStep(w, 5)).toBe(5);
    clearArea(w, 2, 2, 17, 17);
    expect(placeRoad(w, 3 * s.w + 3)).toBe(true); // far from the Town Center
    expect(nextStep(w, 5)).toBe(5);
    expect(placeBuilding(w, 'farm', 14, 14)).toBe(true);
    pave(w); // joins the farm by road
    expect(nextStep(w, 5)).toBe(6);
  });

  it('resumes stored progress, mapping the old 8-step tutorial onto the new steps', () => {
    expect(resumeStep('7', null)).toBe(7);
    expect(resumeStep('99', '2')).toBe(STEPS.length - 1);
    expect(resumeStep('done', '3')).toBe(-1);
    expect(resumeStep(null, null)).toBe(-1);
    expect(resumeStep(null, 'done')).toBe(-1);
    expect(STEPS[resumeStep(null, '5')].title).toBe('Sharpen the axes');
    expect(STEPS[resumeStep(null, '6')].title).toBe('Find a relic');
    expect(STEPS[resumeStep(null, '7')].title).toBe('Explore your skills');
  });
});

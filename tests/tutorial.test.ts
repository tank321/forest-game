import { describe, expect, it } from 'vitest';
import { hireVillager, placeBuilding, upgrade } from '../src/core/commands';
import { nextStep, STEPS } from '../src/ui/tutorial';
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
    expect(nextStep(w, 4)).toBe(5);
    expect(placeBuilding(w, 'lumberCamp', 3, 3)).toBe(true);
    pave(w);
    expect(upgrade(w, 'axe')).toBe(true);
    expect(nextStep(w, 5)).toBe(6);
    s.skills.sharpAxes = 1;
    expect(nextStep(w, 6)).toBe(STEPS.length - 1);
  });
});

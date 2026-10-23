import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { upgrade } from '../src/core/commands';
import { maxLevel, upgradeCost } from '../src/core/economy';
import { deserialize, serialize } from '../src/core/save';
import { getStats } from '../src/core/stats';
import { smallWorld } from './helpers';

describe('wheelbarrow', () => {
  it('speeds every walker and adds the same flat carry to every gatherer', () => {
    const w = smallWorld();
    const before = getStats(w.state);
    w.state.upgrades.barrow = 3;
    const after = getStats(w.state);
    const add = CONFIG.barrow.carryPerLevel * 3;
    expect(after.speed).toBeCloseTo(before.speed * CONFIG.barrow.speedGrowth ** 3);
    expect(after.orchardSpeed).toBeCloseTo(after.speed * CONFIG.orchard.speedMult);
    expect(after.carry).toBeCloseTo(before.carry + add);
    expect(after.farmCarry).toBeCloseTo(before.farmCarry + add);
    expect(after.mineCarry).toBeCloseTo(before.mineCarry + add);
    expect(after.herdCarry).toBeCloseTo(before.herdCarry + add);
    expect(after.orchardCarry).toBeCloseTo(before.orchardCarry + add);
    expect(after.cottonCarry).toBeCloseTo(before.cottonCarry + add);
    w.state.upgrades = { ...w.state.upgrades, axe: 5, farm: 5, pick: 5 }; // still flat on top of upgraded carry
    const upgraded = getStats(w.state);
    w.state.upgrades.barrow = 0;
    expect(upgraded.carry - getStats(w.state).carry).toBeCloseTo(add);
    expect(upgraded.farmCarry - getStats(w.state).farmCarry).toBeCloseTo(add);
  });

  it('costs more resources as it levels, and stops at max level', () => {
    const w = smallWorld();
    const s = w.state;
    expect(upgradeCost(s, 'barrow', 0)).toEqual({ wood: 150 });
    expect(upgradeCost(s, 'barrow', 2)).toEqual({ wood: 500, food: 100 });
    expect(upgradeCost(s, 'barrow', 9)).toEqual({ wood: 9000, food: 3000, stone: 1200, cloth: 400, gold: 400 });
    s.resources = { wood: 1e9, food: 1e9, stone: 1e9, cloth: 1e9, gold: 1e9 };
    for (let k = 0; k < maxLevel('barrow'); k++) expect(upgrade(w, 'barrow')).toBe(true);
    expect(upgrade(w, 'barrow')).toBe(false);
    expect(s.upgrades.barrow).toBe(10);
    expect(upgradeCost(s, 'barrow')).toBeNull();
  });

  it('migrates a v10 save to v11 with no wheelbarrow', () => {
    const w = smallWorld();
    w.state.upgrades.axe = 2;
    const old = JSON.parse(serialize(w.state, 1));
    old.version = 10;
    delete old.state.upgrades.barrow;
    expect(deserialize(JSON.stringify(old)).state.upgrades).toEqual({ axe: 2, farm: 0, pick: 0, coats: 0, barrow: 0 });
  });
});

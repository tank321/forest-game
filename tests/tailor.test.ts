import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { upgrade } from '../src/core/commands';
import { maxLevel, upgradeCost } from '../src/core/economy';
import { deserialize, serialize } from '../src/core/save';
import { getStats } from '../src/core/stats';
import { smallWorld } from './helpers';

describe('tailor', () => {
  it('shoes speed every walker and change no carry', () => {
    const w = smallWorld();
    const before = getStats(w.state);
    w.state.upgrades.shoes = 3;
    const after = getStats(w.state);
    expect(after.speed).toBeCloseTo(before.speed * CONFIG.shoes.speedGrowth ** 3);
    expect(after.orchardSpeed).toBeCloseTo(after.speed * CONFIG.orchard.speedMult);
    expect(after.carry).toBe(before.carry);
    expect(after.carryBonus).toBe(0);
  });

  it('backpacks add the same flat carry to every gatherer and change no speed', () => {
    const w = smallWorld();
    const before = getStats(w.state);
    w.state.upgrades.backpack = 3;
    const after = getStats(w.state);
    const add = CONFIG.backpack.carryPerLevel * 3;
    expect(after.speed).toBe(before.speed);
    expect(after.carry).toBeCloseTo(before.carry + add);
    expect(after.farmCarry).toBeCloseTo(before.farmCarry + add);
    expect(after.mineCarry).toBeCloseTo(before.mineCarry + add);
    expect(after.herdCarry).toBeCloseTo(before.herdCarry + add);
    expect(after.orchardCarry).toBeCloseTo(before.orchardCarry + add);
    expect(after.cottonCarry).toBeCloseTo(before.cottonCarry + add);
    w.state.upgrades = { ...w.state.upgrades, axe: 5, farm: 5, pick: 5 }; // still flat on top of upgraded carry
    const upgraded = getStats(w.state);
    w.state.upgrades.backpack = 0;
    expect(upgraded.carry - getStats(w.state).carry).toBeCloseTo(add);
    expect(upgraded.farmCarry - getStats(w.state).farmCarry).toBeCloseTo(add);
  });

  it('costs cloth from the first level, and goes on past its table: Shoes ×1.05 walk, Backpack ×1.15 bonus', () => {
    const w = smallWorld();
    const s = w.state;
    expect(upgradeCost(s, 'shoes', 0)).toEqual({ wood: 100, cloth: 10 });
    expect(upgradeCost(s, 'backpack', 2)).toEqual({ wood: 325, food: 65, cloth: 35 });
    expect(upgradeCost(s, 'shoes', 9)).toEqual({ wood: 5850, food: 1950, stone: 780, cloth: 650, gold: 260 });
    s.resources = { wood: 1e9, food: 1e9, stone: 1e9, cloth: 1e9, gold: 1e9 };
    for (let k = 0; k < 10; k++) expect(upgrade(w, 'backpack')).toBe(true);
    const bonus = getStats(s).carryBonus;
    expect(bonus).toBe(20);
    expect(upgradeCost(s, 'backpack')).toEqual({ wood: 7898, food: 2633, stone: 1053, cloth: 878, gold: 351 });
    expect(upgrade(w, 'backpack')).toBe(true);
    expect(getStats(s).carryBonus).toBeCloseTo(bonus * 1.15);
    expect(maxLevel('shoes')).toBe(Infinity);
    for (let k = 0; k < 10; k++) expect(upgrade(w, 'shoes')).toBe(true);
    const walk = getStats(s).speed;
    expect(upgrade(w, 'shoes')).toBe(true);
    expect(getStats(s).speed).toBeCloseTo(walk * 1.05);
  });

  it('migrates a v15 wheelbarrow into shoes and a backpack at its level', () => {
    const w = smallWorld();
    w.state.upgrades.axe = 2;
    const old = JSON.parse(serialize(w.state, 1));
    old.version = 15;
    const { shoes: _s, backpack: _b, ...rest } = old.state.upgrades;
    old.state.upgrades = { ...rest, barrow: 3 };
    expect(deserialize(JSON.stringify(old)).state.upgrades).toEqual({ axe: 2, farm: 0, pick: 0, coats: 0, shoes: 3, backpack: 3, satchel: 0 });
  });
});

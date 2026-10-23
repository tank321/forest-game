/** All gameplay tunables. Gameplay code reads villager values via getStats(), not directly. */
export const CONFIG = {
  map: { size: 100, start: 6 }, // square map; side of the initial clearing
  fogRadius: 3, // trees further than this (Chebyshev) from territory are hidden
  tree: { ringWood: [60, 80, 100], growthStart: 1.28, growthDecay: 0.003 },
  villager: { speed: 1.2, chopRate: 1, carry: 5 }, // tiles/s, wood/s, wood
  manualChop: 1, // wood per tap
  economy: {
    villagerCosts: [
      10, 20, 40, 80, 140, 350, 600, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000, 9000, 13000,
      17000, 25000, 33000, 49000, 65000, 97000, 130000, 195000, 260000,
    ],
    villagerCostGrowth: 1.5, // beyond the table
    hireOffset: { wood: 0, food: 1, leather: 2 }, // steps into the table each price track starts
    basePop: 5,
    popPerHouse: 3,
    buildingRefund: 0.5, // fraction of original construction cost returned on removal
  },
  axe: {
    // per-level cost by resource; every row has one entry per level (0 = not charged)
    costs: {
      wood: [100, 200, 350, 550, 850, 1300, 2000, 3000, 4500, 6500],
      food: [0, 0, 0, 0, 300, 500, 800, 1200, 1800, 2500],
      stone: [0, 0, 0, 0, 0, 0, 100, 200, 400, 800],
      leather: [0, 0, 0, 0, 0, 0, 0, 0, 50, 150],
    },
    speedGrowth: 1.05, // chop rate ×1.05^lvl
    carryPerLevel: 2, // carry (base + 2·lvl)·1.02^lvl
    carryGrowth: 1.02,
  },
  farm: {
    harvestRate: 1, // food/s per farmer
    costs: {
      wood: [200, 400, 700, 1100, 1700, 2600, 4000, 6000, 9000, 13000],
      food: [0, 0, 0, 0, 600, 1000, 1600, 2400, 3600, 5000],
      stone: [0, 0, 0, 0, 0, 0, 150, 300, 600, 1200],
      leather: [0, 0, 0, 0, 0, 0, 0, 0, 80, 200],
    },
    speedGrowth: 1.05,
    carryPerLevel: 2,
    carryGrowth: 1.02,
  },
  pick: {
    mineRate: 0.5, // stone/s per miner
    costs: {
      wood: [300, 500, 800, 1200, 1800, 2700, 4000, 6000, 9000, 13000],
      stone: [0, 50, 100, 200, 350, 550, 850, 1300, 2000, 3000],
      leather: [0, 0, 0, 0, 0, 0, 0, 0, 80, 200],
    },
    speedGrowth: 1.05,
    carryPerLevel: 2,
    carryGrowth: 1.02,
  },
  herd: { rate: 0.5, carry: 10 }, // herder leather/s and base carry
  well: { radius: 1, harvestMult: 3, carryMult: 2 }, // farms within radius (Chebyshev) of a Well
  seasons: { length: 180, farm: [1, 1, 1.5, 0] }, // s per season; farm multiplier: spring, summer, autumn, winter
  // food/wood per villager beyond freeVillagers per s (wood in winter only); work multipliers on shortage
  upkeep: { freeVillagers: 5, food: 0.1, wood: 0.1, hungry: 0.5, cold: 0.5 },
  coats: {
    costs: {
      wood: [300, 800, 2000],
      leather: [30, 100, 300],
    },
    burnCut: 0.25, // firewood −25% per level
  },
  sim: { dt: 1 / 30, catchUpDt: 1, maxFrameSeconds: 1, maxOfflineSeconds: 8 * 3600 },
  camera: { startZoom: 40, maxZoom: 72, tapSlop: 6 }, // zoom = CSS px per tile
  save: { key: 'forest-game-save', intervalMs: 10_000 },
} as const;

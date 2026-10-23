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
    foodHireOffset: 1, // food villagers start one step into the table
    basePop: 5,
    popPerHouse: 3,
  },
  axe: {
    // per-level cost by resource; every row has one entry per level (0 = not charged)
    costs: {
      wood: [100, 200, 350, 550, 850, 1300, 2000, 3000, 4500, 6500],
      food: [0, 0, 0, 0, 300, 500, 800, 1200, 1800, 2500],
      stone: [0, 0, 0, 0, 0, 0, 100, 200, 400, 800],
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
    },
    speedGrowth: 1.05,
    carryPerLevel: 2,
    carryGrowth: 1.02,
  },
  well: { radius: 1, harvestMult: 3, carryMult: 2 }, // farms within radius (Chebyshev) of a Well
  sim: { dt: 1 / 30, catchUpDt: 1, maxFrameSeconds: 1, maxOfflineSeconds: 8 * 3600 },
  camera: { startZoom: 40, maxZoom: 72, tapSlop: 6 }, // zoom = CSS px per tile
  save: { key: 'forest-game-save', intervalMs: 10_000 },
} as const;

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
    basePop: 5,
    popPerHouse: 3,
  },
  axe: {
    costs: [100, 200, 350, 550, 850, 1300, 2000, 3000, 4500, 6500],
    speedGrowth: 1.05, // chop rate ×1.05^lvl
    carryPerLevel: 2, // carry (base + 2·lvl)·1.02^lvl
    carryGrowth: 1.02,
  },
  sim: { dt: 1 / 30, catchUpDt: 1, maxFrameSeconds: 1, maxOfflineSeconds: 8 * 3600 },
  camera: { startZoom: 40, maxZoom: 72, tapSlop: 6 }, // zoom = CSS px per tile
  save: { key: 'forest-game-save', intervalMs: 10_000 },
} as const;

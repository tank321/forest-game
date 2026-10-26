/**
 * Upgrade levels past a track's cost table: each multiplies the track's effects by `mult` and costs `costGrowth` × the
 * one before, every resource of the table's last price. Income then grows about as (spent)^(ln mult / ln costGrowth)
 * ≈ its square root, so with trees ~1.2× bigger each ring, each ring takes ~1.1× longer than the last instead of ~1.25×.
 */
const BEYOND = { mult: 1.15, costGrowth: 1.35 };

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
    hireOffset: { wood: 0, food: 1, cloth: 2 }, // steps into the table each price track starts
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
      cloth: [0, 0, 0, 0, 0, 0, 0, 0, 50, 150],
    },
    speedGrowth: 1.05, // chop rate ×1.05^lvl
    carryPerLevel: 2, // carry (base + 2·lvl)·1.02^lvl
    carryGrowth: 1.02,
    beyond: BEYOND,
  },
  farm: {
    harvestRate: 1, // food/s per farmer
    costs: {
      wood: [200, 400, 700, 1100, 1700, 2600, 4000, 6000, 9000, 13000],
      food: [0, 0, 0, 0, 600, 1000, 1600, 2400, 3600, 5000],
      stone: [0, 0, 0, 0, 0, 0, 150, 300, 600, 1200],
      cloth: [0, 0, 0, 0, 0, 0, 0, 0, 80, 200],
    },
    speedGrowth: 1.05,
    carryPerLevel: 2,
    carryGrowth: 1.02,
    beyond: BEYOND,
  },
  pick: {
    mineRate: 0.5, // stone/s per miner
    costs: {
      wood: [300, 500, 800, 1200, 1800, 2700, 4000, 6000, 9000, 13000],
      stone: [0, 50, 100, 200, 350, 550, 850, 1300, 2000, 3000],
      cloth: [0, 0, 0, 0, 0, 0, 0, 0, 80, 200],
    },
    speedGrowth: 1.05,
    carryPerLevel: 2,
    carryGrowth: 1.02,
    beyond: BEYOND,
  },
  herd: { rate: 0.5, carry: 10 }, // herder cloth/s and base carry
  // orchardists: a farmer's walk speed, harvest (Barn upgrades and seasons included) and carry × these
  orchard: { speedMult: 2, rateMult: 2, carryMult: 5 },
  cotton: { rateMult: 3, carryMult: 3 }, // pickers: a herder's rate and carry (Barn upgrades included) × these
  well: { radius: 1, harvestMult: 3, carryMult: 2 }, // farms within radius (Chebyshev) of a Well
  seasons: { length: 180, farm: [1, 1, 1.5, 0] }, // s per season; farm multiplier: spring, summer, autumn, winter
  // food/wood per villager beyond freeVillagers per s (wood in winter only); work multipliers on shortage
  upkeep: { freeVillagers: 5, food: 0.1, wood: 0.1, hungry: 0.5, cold: 0.5 },
  // Tailor: Shoes speed up every villager, Backpacks give every gatherer the same flat carry
  shoes: {
    costs: {
      wood: [100, 200, 325, 525, 775, 1175, 1750, 2600, 3900, 5850],
      food: [0, 0, 65, 130, 230, 360, 550, 850, 1300, 1950],
      stone: [0, 0, 0, 0, 35, 65, 130, 260, 450, 780],
      cloth: [10, 20, 35, 55, 85, 130, 200, 300, 450, 650],
      gold: [0, 0, 0, 0, 0, 0, 0, 0, 100, 260],
    },
    speedGrowth: 1.05, // walk speed ×1.05^lvl
    beyond: { mult: 1.05, costGrowth: 1.35 }, // walking is most of a trip, so a gentler step
  },
  backpack: {
    costs: {
      wood: [100, 200, 325, 525, 775, 1175, 1750, 2600, 3900, 5850],
      food: [0, 0, 65, 130, 230, 360, 550, 850, 1300, 1950],
      stone: [0, 0, 0, 0, 35, 65, 130, 260, 450, 780],
      cloth: [10, 20, 35, 55, 85, 130, 200, 300, 450, 650],
      gold: [0, 0, 0, 0, 0, 0, 0, 0, 100, 260],
    },
    carryPerLevel: 2, // flat carry added after each job's own multipliers
    beyond: BEYOND, // past the table the bonus grows ×mult per level instead of +carryPerLevel
  },
  coats: {
    costs: {
      wood: [300, 800, 2000],
      cloth: [30, 100, 300],
    },
    burnCut: 0.25, // firewood −25% per level
  },
  // gold value of each resource; sales pay value × (1 − commission), purchases cost value × (1 + commission)
  market: {
    prices: { wood: 1, food: 5, stone: 20, cloth: 20 },
    commission: 0.2,
    lots: { wood: 100, food: 20, stone: 5, cloth: 5 }, // base trade lot, ×1/×10/×100 in the UI
  },
  // road stock = base + perHouse × houses; a step between connected road tiles costs pathCost × a step off-road
  roads: { base: 12, perHouse: 3, pathCost: 0.5 },
  tax: { perHouse: 0.2, hold: 60 }, // gold/s each connected house owes while a Tax Office stands; it holds at most `hold` s of it
  // Tax Office: houses a collector visits per round, by level
  satchel: {
    costs: {
      wood: [600, 1500, 4000],
      stone: [60, 200, 500],
      gold: [100, 400, 1200],
    },
    stops: [1, 2, 3, 5],
  },
  // gold per trip = goldAtRef × (gap / refGap)^exponent, gap = tiles between Trading Post and Market
  trade: { goldAtRef: 10, refGap: 10, exponent: 1.5, loadTime: 5 }, // loadTime: s to load a trip
  // Extra pack mules bought at a Trading Post: at most `max` per post (its first included); the k-th bought in the town
  // (counting every post's) costs `cost` × growth^k, a little less than each pays back as it grows
  mules: { max: 5, cost: { wood: 400, food: 150, gold: 100 }, growth: 1.6 },
  // Mason's Yard: roads for the stock, each costing ×growth the last; stone houses hold `pop` more villagers,
  // each costing ×growth the last (Masons discounts the stone in both)
  masonsYard: {
    road: { cost: { stone: 100 }, growth: 1.5 },
    stoneHouse: { pop: 2, cost: { wood: 200, stone: 150 }, growth: 1.35 },
  },
  // Prestige: rebuild once base skill levels are learned, `step` more for each of the first `steady` rebuilds and
  // `later` more for each one after (capped at every skill maxed)
  legacy: {
    base: 15,
    step: 5,
    steady: 2,
    later: 10,
    roadsPerRun: 10, // starting roads every rebuild adds
    cards: { base: 3, perRun: 1, max: 5 }, // skills a relic offers: base, +perRun every rebuild, up to max (Relic Hunters adds more)
    perks: {
      masterHarvest: { gather: 3 }, // chop, farm, mine and herd rate ×
      swiftAndStrong: { speed: 3, carry: 3 },
      urbanCore: { basePop: 20, start: 10, hire: 0.5 }, // start: side of the starting clearing; hire: villager price ×
      prosperousCity: { build: 0.5, villagers: 10 }, // build: building price ×; villagers start free of upkeep
      tradeGuilds: { chop: 2, cap: 3, taper: 0.85 }, // each profession's rate × 1 + cap·(1 − taper^workers)
      royalBank: { gold: 3, commission: 0.5 }, // tax and trade gold ×, market commission ×
      relicHunters: { gap: 0.5, cards: 1 }, // trees between relics ×, skill cards added to each pick (past the rebuild cap)
      legacyX2: { gather: 2 }, // every gather rate × per level
    },
  },
  skills: {
    masteryLevels: 8, // levels learned in a track before its Mastery is offered
    gates: { orchards: 4, cottonFields: 5, greenhouses: 4, teamwork: 4, taxOffices: 3, guildContracts: 5, growingFamilies: 4, masonsYard: 4 }, // levels learned in its track before this skill is offered
    // Per-level bonuses of the stat skills: few levels, each a big step
    sharpAxes: 0.5, // villager chop speed bonus per level
    bigBaskets: 5, // villager carry per level, before upgrade multipliers
    swiftFeet: 0.25, // walk speed bonus per level
    recruiters: 0.75, // villager price × this per level
    greenThumbs: 0.5, // farm harvest bonus per level
    stonecutters: 0.5, // mining speed bonus per level
    masons: 0.75, // stone costs × this per level
    taxCollectors: 0.5, // tax bonus per level
    sweep: 0.5, // Sweeping Strike: share of a tap dealt to each choppable neighbour
    combo: { window: 1, step: 0.1, capPerLevel: 0.5 }, // Momentum: s between chained taps, bonus per chained tap, max bonus per level
    keenEyes: { vision: 1, relicGap: 0.1 }, // per level: extra rings of forest in sight, trees between relics −10%
    heartwood: { chance: 0.1, bonus: 0.5 }, // per level chance a felled tree pays bonus × its full wood
    timber: 0.5, // share of a felled tree's full wood dealt to a neighbouring tree
    cropRotation: { perFarm: 0.25, max: 4 }, // harvest bonus per touching farm, up to max farms
    rootCellars: 0.75, // food upkeep × this per level
    greenhouse: 0.5, // winter farm and orchard harvest multiplier
    festival: { seconds: 60, winterWalk: 1.25 }, // seconds of farm and orchard harvest paid as winter starts; walk speed all winter
    openPastures: { radius: 2, perTile: 0.01 }, // wool bonus per level per open grass tile this close to a Sheep Farm
    shearing: 60, // seconds of herders' wool paid as spring starts
    goldenFleece: { chance: 0.03, mult: 10 }, // per level chance a herder's delivery is worth mult × its cloth
    weavers: 0.04, // cloth bonus per Tailor upgrade level owned
    grazing: { radius: 4, crews: 3 }, // Grazing Flocks: reach from a Sheep Farm; grazes as fast as this many lumberjacks
    richVeins: { perTile: 0.02, maxTiles: 30 }, // stone bonus per level per tile between a Quarry and the Town Center
    geodes: { chance: 0.02, goldPerStone: 25 }, // per level chance a miner's delivery brings a gem worth this gold per stone
    cobblestone: 0.2, // walk speed bonus per level along roads
    deepShafts: 1.5, // mining multiplier in winter (and cold never slows miners)
    dynamite: { stoneSeconds: 30, radius: 2, taps: 100, cooldown: 90 }, // stone burst, tree reach, damage in taps, s between blasts
    errandRunners: 0.25, // empty-handed walk speed bonus per level
    wellFed: { perVillager: 10, gather: 1.2 }, // food in stock per villager needed; gather multiplier while fed
    // Growing Families: with room and a food surplus (Well Fed's), a villager is born every `seconds` / (1 + perHouse ×
    // linked Houses); level 2 adds Spring Births, 1 villager per `springPerHouses` linked Houses (at least 1) as spring begins
    families: { seconds: 900, perHouse: 0.05, springPerHouses: 5 },
    surveyors: 1, // extra roads per house per level
    outpost: { wood: 20_000, stone: 2_000, gold: 500 },
    toll: 0.1, // gold per road tile walked, per level
    fair: { tradeMult: 1.5 }, // Midsummer Fair: Trading Post gold × this all summer (and no market commission)
    // Guild Contracts: sized as minutes of the lifetime average rate (at least `min`), paid as `rewardMult` × the goods' market value
    contracts: { board: 3, minutes: [3, 6], min: { gather: 50, fell: 10, grow: 2 }, rewardMult: 1, goldPerFell: 2 },
    // Merchant Caravans: deal size in seconds of the lifetime average rate; buy at buyMult × value, sell at sellMult × value
    caravan: { deals: 3, seconds: 600, min: 100, buyMult: 0.5, sellMult: 2 },
  },
  // Lucky Chest: stores one opening every cooldownMs of real time, up to `store`. `odds` are relative weights; boosts run for `seconds` of real time.
  chest: {
    cooldownMs: 10 * 60_000,
    store: 3,
    odds: { speed2: 25, speed3: 18, speed5: 10, taps: 15, bountiful: 17, windfall: 15 },
    boosts: {
      speed2: { mult: 2, seconds: 300 }, // the whole game runs ×mult
      speed3: { mult: 3, seconds: 240 },
      speed5: { mult: 5, seconds: 180 },
      taps: { mult: 10, seconds: 180 }, // chopping by hand ×mult
      bountiful: { mult: 2, seconds: 300 }, // villagers gather and walk ×mult, the clock unchanged
    },
    windfall: { minutes: 15, minWood: 200 }, // minutes of income per resource (current or lifetime average, whichever is more)
  },
  sim: { dt: 1 / 30, catchUpDt: 1, maxFrameSeconds: 1, maxOfflineSeconds: 8 * 3600 },
  achievements: { checksPerSecond: 4 }, // how often earned tiers are checked, in simulated time
  sound: { volume: 0.6, key: 'forest-game-sound' }, // chime volume (0–1); browser storage key for the on/off setting
  music: { volume: 0.5, key: 'forest-game-music' }, // background music volume (0–1); browser storage key for the on/off setting
  // zoom = CSS px per tile; carry tags show from carryZoom; glideMs pans to a new relic; a touch held still for holdMs marks a tree;
  // grabPad = tiles of slack around a placement footprint for a finger
  camera: { startZoom: 40, maxZoom: 72, tapSlop: 6, carryZoom: 48, glideMs: 900, holdMs: 450, grabPad: 0.3 },
  buildMenu: { key: 'forest-game-build-menu' }, // browser storage key: "full" while a phone's build menu shows named cards, not the hotbar
  // browser storage key for the tutorial's step (or "done"); oldKey held the 8-step tutorial's, up to v38
  tutorial: { key: 'forest-game-tutorial-2', oldKey: 'forest-game-tutorial' },
  save: { key: 'forest-game-save', intervalMs: 10_000 },
} as const;

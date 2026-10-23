# Forest Nothing: reference mechanics

Research notes for our clone, taken from the live game (CrazyGames build v69, Oct 2026), its
devlog, the in-game help strings (including the How to Play panel), and the shipped client source. Numbers are the original game's.
They are a reference to tune against, not something to copy.

## Tech
- Vanilla JS + Canvas 2D in one ~38k-line `main.js`. No engine. 60 fps loop with a frame-based `_dt`.
- Top-down pixel art on a square grid. 16×16 sprites drawn at 64 px per tile. Portrait-first, zoom 0.4–2.5, drag to pan.
- Saves: 3 local slots plus cloud saves. Import/export is supported.

## Map
- **100×100 tiles.** The start is a 6×6 clearing at tiles 47–52 with a **4×4 Town Center** in the middle. Starting territory is 36 tiles.
- **Territory** (`ownedTiles`) is the set of cleared tiles. A felled tree's tile becomes owned. Buildings go only on owned tiles.
- **Fog:** only trees near owned land are visible. When a tree falls, the trees around it are revealed (incremental reveal, 1–2 rings). Fog intensity is darker with distance.
- **Choppable** means visible **and** 4-adjacent to an owned tile.
- **Tree wood (HP)** depends on the Chebyshev distance `d` from the start clearing:
  - `d≤1: 60`, `d=2: 80`, `d=3: 100`.
  - After that it's ×`max(1, 1.28 − 0.003k)` per ring, giving
    `d=5: 163`, `d=10: 527`, `d=20: 4.6k`, `d=30: 32k`, `d=47: 470k`.
  - That is about 1.2×10⁹ wood on the map. **Growth is exponential with distance, and it is the
    game's main pacing curve.**
- Trees never regrow. A tree drawn as felled below 50% HP is cosmetic only. Seven tree varieties are arranged in biome rings.
- Phase 2 (late game) adds a sea to the north, a Dry Dock and a ship.

## Core loop (tutorial order)
1. **Manual chopping:** tap or click a choppable tree for +1 wood per hit, with the "+N" multiplied by skills. Hover-to-collect is a skill.
2. **Recruit a villager** at the Town Center, paying wood, food or textiles. Costs come from a table:
   `10, 20, 40, 80, 140, 350, 600, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000, …, 260000`. Past the table it's ×1.5 each.
3. Reach 5 villagers. **Population cap = 5 + 3 × (connected houses)**.
4. **Lumber Camp** (2×2, `100 × 2^n` wood): an extra wood drop-off, so lumberjacks walk less. How to Play says it must touch a connected road or the Town Center (an earlier note said it needs no road).
5. **Axe upgrade** (10 levels). Wood costs are `100, 200, 350, 550, 850, 1300, 2000, 3000, 4500, 6500`, plus food from level 5 and textiles from level 9.
   - Chop speed is ×1.05 per level.
   - Capacity is `(5 + 2·axe + 2·barrow) × 1.02^axe`.
6. **House** (`100 × 1.5^n` wood, plus food/textiles/stone/gold at higher n): +3 population cap. It must touch the Town Center or another city building and be connected by road.
7. Barn, then Farm (food). **Clicking a tree marks it as priority**, and a lumberjack goes to it first.
8. **Roads** come from a limited road stock. Buildings not connected to the Town Center by road are *isolated* and stop working.
   - Non-city buildings (farm, quarry, lumber camp, …) only need to touch a connected road or the Town Center. They don't need to sit next to another building.
   - The Well is the exception: it needs no road at all, and it's cheap.
9. **Relics** appear in the forest after every N trees chopped (18, 19, 20 … then +2 steps). Chop through to the relic and click it to get a skill card (88 skills). The Legacy (prestige) tiers are tied to relic milestones.

## Villager (lumberjack) behaviour
- Base stats: speed 1.3 px/frame (≈1.2 tiles/s), 1 chop/s (1 wood per chop), carry 5.
- **Target:** marked trees first, otherwise the nearest choppable visible tree by Euclidean distance from the villager.
  - The limit is 1 villager per tree; skills raise it to 2 or 3.
  - After a drop-off, the villager picks the tree nearest the lumber camp.
  - The villager keeps the same tree, and chains to nearby trees, until it is cut down.
- **Movement is a straight line, with no pathfinding.** Lumberjacks walk over the open territory.
- **Trip:** walk to the tree, chop until the carry is full or the tree falls, walk to the **nearest wood drop-off** (Town Center or a Lumber Camp), deposit, and repeat.
- With no reachable tree, a villager carrying wood returns it. An empty villager idles by circling the houses and rescans every 20–45 frames.
- Villagers have names, cosmetic variants, per-job time logs and lifetime haul. Jobs are lumber, farm, mine, herd, bake, orchard, cotton, theatre, ritual and collect.
- There are other workers too: farms, quarries and similar buildings take N assigned villagers.

## Economy
- **Resources:** wood, food, textiles (wool), stone, gold. Later: souls, relics, and decoration coins.
- **Sheep Farm:** 1 herder (speed 1.2 tiles/s, carry 15, 0.67 textiles/s). Bonus slots: Pair Herding, Fertile Herding, Workshop.
- **Fruit Orchard:** about 8×8 tiles of fruit trees, 3 workers delivering food. Bonus slots: Base bonus (×2 villager speed, ×2 harvest speed, ×5 carry), Adjacent orchard, Workshop. A worker shows speed 2.5 tiles/s, carry 145 and 2.43/s.
- **Cotton Plantation:** about 10×10 tiles, 5 workers delivering textiles. Bonus slots: Plantation Bonus (×3 collection speed, ×3 carry), Workshop. Shares upgrades with the shepherd. A worker shows speed 1.3 tiles/s, carry 57 and 2.00/s, which is a shepherd's carry 19 and 0.67/s ×3.
- **Market** (City Market): sell or buy at fixed values in gold (wood 1, food 5, textiles 20, stone 50) with a flat 20% commission.
- **Gold** comes from house tax (Tax Office) and mule trade routes between the Rural Market and the City Market.
  - Mule gold per trip grows **faster than linearly** with the gap between the two markets.
  - The gap is measured between the buildings, not along the route, so a winding road only makes mules slower.
- **City buildings** (house, bakery, church, workshop, tax office, tavern, market, theatre, sawmill) work only inside an **urban core**. An isolated one counts for nothing; an isolated house adds no population.
  - How to Play: it must touch another city building or the Town Center **and** have a connected road nearby.
  - An earlier note gives a stricter rule: next to the Town Center, or in a group of 10 or more connected city buildings. Which one applies is unverified; the help text may be simplified.
- Many adjacency bonuses, for example:
  - A Well next to a farm gives ×3 harvest and ×2 carry.
  - A Tavern gives +1 population per house in range.
  - A house next to the Church pays ×5 tax.

## Meta
- **Skill tree:** 88 nodes on 8 radial branches, unlocked by relic cards.
- **Legacy:** an optional reset for a permanent bonus at relic milestones. It's never required. "Rebuild City" restarts without losing Legacy.
- **Offline progress is not simulated.** Time away (hidden tab or closed browser) is banked as **Boost Time, capped at 10 min**. The player spends it at ×2, ×3, ×5 or ×10 game speed; the total extra progress is the same, only the rate differs. An ad grants an extra estimated-production payout.
- Also: achievements (44 visible), timed Challenges (Lumber Rush, Harvest Sprint, Gold Fever) with leaderboards, community city sharing, and decorations.

## Implications for our clone
| Area | Our alpha | Original | Change |
|---|---|---|---|
| Map | 40×60, villagers only | 100×100, 6×6 start, 4×4 TC | Use 100×100 (or smaller for now), square start, camera pan/zoom |
| Tree wood | 6–12, uniform | 60 → 470k, exponential by ring | Ring-based HP formula in config |
| Territory | implicit (grass tiles) | explicit owned set; build only on owned | Keep `Grass` = owned; add a choppable = 4-adjacent rule (same as our frontier) |
| Fog | none | visibility ring around territory | Add a `visible` mask; frontier ∩ visible |
| Player input | buy button only | tap/click tree = +1 wood; click = mark priority | Add input layer (screen→tile), manual chop, marked set |
| Villager targeting | marked first, then shortest trip (walk to tree + walk home), re-picked after every delivery | marked first, then Euclidean nearest to villager; after a drop-off, nearest the lumber camp | ✓ v7 |
| Movement | 8-directional shortest paths on territory, straightened into lines | straight lines | ✓ v7: straight where the ground is open, around trees otherwise |
| Carry / chop | 5 / 1 per s | 5 / 1 per s | ✓ matches |
| Speed | 2.5 tiles/s | ≈1.2 tiles/s | Lower to ~1.2 |
| Villager cost | 10·1.15ⁿ | table 10, 20, 40, 80, 140, 350, … then ×1.5 | Use the table |
| Pop cap | none | 5 + 3/house | Add cap; houses next |
| Drop-offs | TC only | TC + Lumber Camps (100·2ⁿ) | Our `dropoff` flag + multi-source BFS already fit; fix per-villager start path |
| Offline | full simulation, 8 h cap | banked boost time ≤10 min, ×2–×10 | Decide: keep ours (more generous) or copy the boost mechanic |
| Win | all trees cleared | all trees cleared | ✓ |
| Stone | Quarry workplace (never depletes), miners deliver to the TC | quarries with assigned villagers; stone in late costs | ✓ v5. No rock tiles: the map stays trees only |
| Cloth (textiles) | Sheep Farm, 1 herder (0.5/s, carry 10); Fertile Herding adds equal food. Was leather until v10 | Sheep Farm, 1 herder (0.67/s, carry 15) | ✓ v7 |
| Orchard | Fruit Orchard 5×5, 3 orchardists at ×2 farmer speed and harvest, ×5 carry; Barn upgrades and seasons apply; no adjacency bonus | Fruit Orchard ~8×8, 3 workers, ×2 speed and harvest, ×5 carry; Adjacent orchard and Workshop bonus slots | ✓ v10 |
| Cotton | Cotton Plantation 6×6, 5 pickers at ×3 herder rate and carry, Barn upgrades shared; costs gold | Cotton Plantation ~10×10, 5 workers; Plantation Bonus ×3 speed and carry; shares upgrades with the shepherd | ✓ v10 |
| Farm adjacency | Well: farms within 1 tile get ×3 harvest, ×2 carry | Well next to a farm: ×3 harvest, ×2 carry | ✓ v5 |
| Market | City building; sells at 80%, buys at 120% of value (wood 1, food 5, stone 20, leather 20) | City Market; wood 1, food 5, textiles 20, stone 50, flat 20% commission | ✓ v9 (stone cheaper: our quarries never deplete) |
| Tax | Tax Office: 0.2 gold/s per house within 4 tiles | house tax via Tax Office; ×5 next to a Church | ✓ v9, no Church |
| Trade | Trading Post → nearest Market, 1 trader; gold per trip 10·(gap/10)^1.5, straight-line gap | mules between Rural and City Market; superlinear in the gap between buildings | ✓ v9 |

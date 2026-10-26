# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Idle forest-clearing game (Vite + TypeScript, no runtime dependencies) modelled on Forest Nothing.
`docs/MECHANICS.md` holds the reference game's mechanics and numbers; tune against it, don't copy.

## Commands
```
npm run dev                          # http://localhost:5173; browser console exposes `world`, `reset()`
npm test                             # vitest run (all tests)
npx vitest run tests/stone.test.ts   # one file
npx vitest run -t "pausing returns"  # tests matching a name
npm run typecheck                    # tsc; tsconfig includes tests/, noUnusedLocals is on
npm run build                        # typecheck + production build
```
No linter or formatter is configured. Pushes to `main` deploy to GitHub Pages (`.github/workflows/deploy.yml`). The build uses
relative paths (`base: './'`) and writes `dist/sw.js` from `pwa/sw.js`, listing every built file for offline play.

## Architecture
- **`src/core/` is pure simulation with no DOM.** The UI changes state only through `commands.ts`,
  where every player action validates itself and returns success.
- **`GameState` vs `World`.** `GameState` (`types.ts`) is the persistent, JSON-serializable state.
  Its typed arrays are converted to plain arrays in `save.ts`. `World` (`world.ts`) wraps it with
  derived data that is never saved: drop-off distance fields per resource, fog, max wood per tile.
  It also holds `gathered`, per-source counters (each job, hand, tax, skill bonus) since load that only the HUD reads,
  and `fx`, moments for the UI (floating text, the festival toast) that `main.ts` drains every frame, and Dynamite's `blastReady` cooldowns.
  Change tiles through `claimTile`/`clearTree`. After placing, moving or removing any building or changing
  roads, call `onBuildingsChanged` so the fields are rebuilt (villagers walk around buildings).
- **Roads** (`roads.ts`). `Tile.Road` is territory. `roadNetwork` marks roads joined edge to edge to a
  hub (`HUB_KINDS`: the Town Center and the Frontier Outpost); `linkedBuildings` lists buildings that work
  (touching that network or a hub, or `road: false` in `BUILDINGS`; with Field Paths, also farms joined edge to edge, farm by farm, to a linked farm,
  and `search` lets anyone walk across farms). Both are derived on demand; `wouldLink` previews a spot. Isolated buildings count for nothing:
  `isActive` takes the linked set (also `Stats.linked`), drop-off fields, pop cap, tax and trading skip them.
  Pathing steps between connected road tiles cost `CONFIG.roads.pathCost` × normal, and `smooth` keeps
  villagers on the road. Tests can call `pave(w)` (`tests/helpers.ts`) to connect every building.
- **Simulation.** `sim.ts` runs an ordered system list each `tick`: `jobSystem`, `upkeepSystem`, `villagerSystem`,
  `muleSystem`, `grazingSystem`, then `birthSystem` (Growing Families). `tick` splits its step at season boundaries, where Harvest Festival, Shearing Day and Spring Births pay out (`seasons.ts`; the season is
  derived from `time`, not saved). The browser steps at 1/30 s, while offline catch-up uses 1 s steps
  (`CONFIG.sim`). Villager updaters must be **dt-independent**: they spend their whole time budget
  across state transitions inside one call. Tests assert identical results at both step sizes.
- **Determinism.** Core randomness goes through the seeded `rand(s)` (`rng.ts`), whose state is
  stored in `GameState`. Never use `Math.random` in core. The save test round-trips a mid-game
  state and checks that the continued simulation matches exactly.
- **Villager jobs.** `systems/villagers.ts` dispatches through a `Record<Job, Updater>`:
  - `lumber` uses `lumberjack.ts`. A lumberjack picks a tree on spawn and after every delivery; flagging a tree (`toggleMark`), or land first reaching a flagged one (`claimTile`), sends the nearest free ones there at once (`flags.ts`). `nearestTree`
    picks marked trees first, then the shortest next trip: walk to the tree plus its walk home (`fields.wood`).
  - Workplace jobs (`farm`, `orchard`, `mine`, `herd`, `cotton`) share `workplace.ts`. Its `WORK` table maps each job
    to a resource and an `output(st, place)` giving the rate and carry at that workplace (Well-boosted
    farms), plus an optional `also` resource delivered alongside
    it (herders' food from Fertile Herding) and an optional walk `speed` stat (orchardists). Workplaces never run out. Workers walk to their own
    spot (`pathToWork` in `movement.ts`), spread over the interior by their index among the staff.
  - The **Mason's Yard** is a stone drop-off whose actions live in `commands.ts`: `buyRoad` adds a road to `GameState.roadsBought`
    (counted in `roadStock`) and `buildStoneHouse` sets a house's `stone` flag (`popCap` adds room); both need `hasYard`, and
    their prices (`roadCost`, `stoneHouseCost`) are in `economy.ts`. Stone houses draw `STONE_HOUSE` with `STONE_HOUSE_TINT`.
  - `NEEDS` (`buildings.ts`) names a building a workplace requires (Trading Post → Market). `isActive`
    checks it, so an unmet need unstaffs the workplace like a pause.
  - **Pack mules** (`systems/mules.ts`, `GameState.mules`) are not villagers: `muleSystem` gives each Trading Post its `mulesOf` (one, plus any bought with `buyMule`, priced by `muleCost`),
    each of which loads its gap-based `tradeLoads` gold, walks `roadRoutes` to the nearest Market and back, and is retired
    once its removed post's gold is delivered. Deliveries count under the `trade` source. `walk`/`arrived` take any `Walker`.
  - `tax` uses `collector.ts`. Houses accrue `due` gold in `upkeepSystem` (capped at `taxHold`); a collector's round starts
    at its Tax Office, visits up to `taxStops` houses (`round` holds those visited) along `roadRoutes` (roads, hubs, its office),
    and the gold is delivered only back at the office. Re-routing in `commands.ts` sends collectors to their office, not a drop-off.
  - `jobs.ts` staffs workplaces from the nearest empty-handed lumberjack by walk (`nearestTo`, so never one cut off from it) and returns workers only at
    `carry === 0`. That keeps resources conserved, and tests check the totals.
- **Effective values.** Gameplay reads villager and production numbers from `getStats(s)`
  (`stats.ts`: config × upgrades × skills × season and upkeep), not from `CONFIG` directly.
  Upkeep (`eat`, `burn`), tax and the `hungry`/`cold` shortages are derived there from villager count,
  buildings, season and stock. Well-boosted farms are
  also computed there on demand, so there is no cache to invalidate.
- **Costs.** All costs are in `economy.ts`. Upgrade tracks (`axe`, `farm`, `pick`, `coats`, `shoes`, `backpack`) read per-resource
  rows from `CONFIG[kind].costs`, where 0 means not charged. Use `upgradeCost(s, kind, level?)` and
  `maxLevel(kind)`. A track with a `beyond` entry (Axe, Farm, Pick, Shoes, Backpack) has no max: past its table each
  level costs the last price × `costGrowth` and multiplies its effects by `mult` (`split` in `stats.ts`). Skill discounts (Master Builders, Recruiters, Masons) are applied there too.
- **Pathing** (`pathing.ts`). 8-directional Dijkstra over walkable tiles, meaning territory (grass or
  building), with integer costs (`STEP` 10, `DIAG` 14 per tile). A walk steps onto a building's tiles
  only within the building it starts in or the one it is heading to (the `enter` set; drop-offs for a
  field), so villagers go around other buildings. A `free` search walks over anything; lumberjacks use it (`freeWalk`)
  only when a flagged tree, or their way home, is otherwise cut off (`walkToMark` in `flags.ts`, `goHome`). Diagonals never cut past a tree or building
  corner; trees and relics are never walked through. Paths are straightened (`smooth`/`clearLine`)
  so villagers cross open ground in straight lines. Each resource has a multi-source distance field
  from its drop-off buildings.
- **Lucky Chest** (`chest.ts`, `GameState.chest`) is the one part of the state on wall-clock time: `readyAt` and a boost's
  `until` are epoch ms, and core never reads the clock (`refillChest`/`openChest`/`claimChest`/`expireBoosts` take `now`). It stores
  up to `CONFIG.chest.store` openings; `openChest` opens all of them, rolling into `pending`, and `claimChest` applies them at the
  show's burst, so the UI never shows a reward early. `addBoost` keeps `boosts` free of clashes: one of each kind (the same kind adds
  its time), speeds queued back to back fastest first (only the first runs; `runningBoosts`). Speed scales the live loop, and offline
  catch-up in `main.ts` steps through `chestTimeline`; Bountiful and Mighty Taps apply in `stats.ts`/`chopTree`.
- **Saves.** `save.ts` keeps a `VERSION` and a chain of `migrations[v]` (v → v+1). Any change to
  the `GameState` shape needs a version bump, a migration, and a migration test.

## Rendering
- **Sprites are data.** `render/sprites.ts` holds pixel art as string grids (one char per pixel,
  `.` transparent), each category with its own palette (`TREE_`, `GROUND_`, `BUILDING_`,
  `RELIC_`, `FLAG_`, `VILLAGER_`, `UI_PALETTE`). The grids were generated once by throwaway scripts that
  are not in the repo, so edit the grids directly. `tests/sprites.test.ts` checks their sizes and
  palette chars. `renderer.ts` bakes every grid to a canvas at startup, once per fog brightness
  where fog applies.
- **Scale.** One tile is `SPRITE_W` (16) px. Tree, relic and building sprites are
  `OVERHANG_PX` (4) rows taller than their footprint and reach into the tile above, so a building
  sprite is `w·16 × h·16 + 4`. Villagers are composed from layers (`composeVillager`: pose + hat +
  tool or load) and anchored at `VILLAGER_FEET`.
- **Joined farms.** Farms that touch draw as one field: `farmJoins` (`render/farms.ts`) gives each farm a 12-bit mask of
  its edge tiles touching another farm, and `joinFarm` (`sprites.ts`) opens the fence there, filling it with crops repeated
  from the field. The renderer bakes each season × Well × mask sprite when first drawn. Looks only; the simulation never reads it.
- **Ground.** Grass is drawn into an offscreen canvas at 16 px per tile, and only cells whose fog
  level or shown season changed are redrawn. Variants are picked by a hash of the tile index.
- **Seasons.** Seasonal looks are palette tints over the summer art (`TREE_TINTS`, `GROUND_TINTS`,
  `RELIC_TINTS`, `BUILDING_SEASONS[season][kind].tint`), plus separate grids where the shape changes
  (`WINTER_TREES`, `WINTER_RELIC`, `BUILDING_SEASONS[season][kind].grid`). In winter, `ROOFS` turns
  roof chars to snow. `seasonalBuilding` composes a building's grid and palette. Each cell turns to
  a new season at its own hashed moment within `SEASON_STAGGER` (`seasonAt` in `renderer.ts`), and a
  building turns with its top-left tile.
- **Draw order.** `drawScene` draws everything on the ground back to front by where it meets the
  ground: trees and relics by tile row, buildings by bottom edge, villagers by feet. A villager
  standing on a building's tiles is drawn over that building. Flags and the relic glow are drawn
  right after their tree or stone; relic halos go over the whole scene afterwards, like light.
- **Render-only state.** Animation runs on wall-clock time, and facing is kept in the renderer.
  Visual variety comes from tile-index hashes. None of it touches `GameState` or `rand`, which
  keeps the simulation deterministic.

- **Forest creatures** (`render/critters.ts`) are display only, like the rest of the render-only state: `Critters` lives in the
  renderer, steps on wall-clock time with `Math.random`, and only reads `World` (tiles, fog, villagers, season). The logic has
  no canvas, so `tests/critters.test.ts` drives it directly. Sprites are `CRITTERS` grids without an outline; `composeCritter` adds it.

- **UI skin.** UI art (9-slice frames, icons, sidebar wood) is also grid data in `sprites.ts`.
  `ui/skin.ts` bakes it once at startup into CSS variables (`--frame-<name>[-down]`, `--wood`) and
  `.ico-<name>` / `.thumb-<building>` classes that `style.css` uses. One art pixel is 2 CSS px.

## Extending
Most content is data-driven, and `Record<…>` maps make TypeScript flag every place a new key
must be handled:
- **Building:** add it to `BUILDINGS` (`buildings.ts`), `BUILDING_COLOR` (`render/renderer.ts`)
  and `BUILDING_TEXT` (`ui/text.ts`). Selection actions and info lines go in `ACTIONS`/`INFO`
  (`ui/actions.ts`). An optional pixel-art sprite (`w·16 × h·16 + 4`) goes in `BUILDING_SPRITES`
  (`render/sprites.ts`). Without one, the building is drawn as a `BUILDING_COLOR` rectangle. A roofed
  sprite also gets a `ROOFS` entry, seasonal crops get `BUILDING_SEASONS` entries, and a door or fence gap
  on the bottom edge gets a `BUILDING_ENTRANCES` column so roads join there.
  To lock it until a skill is learned, set its `unlock` to a one-level skill placed in a track;
  the build menu hides it and `canPlace` refuses it until then. A `limit` caps how many may stand (the Outpost: 1).
- **Decoration:** add it to `DECOR` (`decor.ts`; `layer` ground or prop, a flat `cost`, `joins` for fence-like runs,
  `trophy` to lock it behind an achievement tier), its grid to `DECOR_SPRITES` (plus `DECOR_ARMS` if it joins, and any
  `DECOR_SEASONS` looks) in `render/sprites.ts`, and its text to `DECOR_TEXT`. Decorations are looks only: tiles under them
  stay `Tile.Grass` and nothing in the simulation reads `GameState.decor`, except that buildings and roads can't be placed
  or moved onto one (`decorUnder` in `canPlaceAt`/`canPlaceRoad`/`moveRoad`). A decoration kind must not share a name with a building kind (`ui/placement.ts` aims either).
- **Guild Contracts and caravan deals** live in `guild.ts` and are saved in `GameState.contracts` / `caravan`;
  `tick` tops the board up and brings the caravan at season boundaries, and the Market panel (`ui/market.ts`) shows both.
- **Resource:** add it to `RESOURCES` (`types.ts`). Drop-off fields and HUD counters pick it up
  automatically. Then add a save migration.
- **Workplace job:** extend `Job`, then add entries to `WORK` (`workplace.ts`), `UPDATERS`
  (`villagers.ts`), and `VILLAGER_CLOTH`/`VILLAGER_GEAR` (`render/sprites.ts`).
- **Skill:** add it to `SKILLS`, to a `TRACKS` list after its parent, and its parent to `PARENT`
  (`skills.ts`; each track is a tree, laid out by `ui/skillGraph.ts`). A track's capstone goes in `MASTERY`
  instead of `PARENT` and is offered at `CONFIG.skills.masteryLevels` levels in the track. Apply its effect in
  `stats.ts` or `economy.ts`, and add its text and icon (a `UI_ICONS` name) to `SKILL_TEXT`.
- **Legacy perk:** add it to `PERK_IDS` and `LEGACY` (`legacy.ts`; `requires` places it in the tree), its numbers
  to `CONFIG.legacy.perks`, its effect in `stats.ts`, `economy.ts` or `state.ts` (via `perk`/`perkMult`), and its
  text and icon to `LEGACY_TEXT`. `prestige` (`commands.ts`) returns the next run's state, and `main.ts` saves it and reloads.
- **Achievement:** add it to `ACHIEVEMENTS` (`achievements.ts`; a metric and its tiers, usually through `lifetime` of a
  `COUNTERS` entry) and its text and icon to `ACHIEVEMENT_TEXT`. An event nothing else records gets an `EVENTS` key
  (`types.ts`, plus a save migration), bumped with `count`/`record` where it happens. `career` (earned tiers and past runs' counters)
  survives rebuilds; `achievementSystem` checks a few times per simulated second and emits `fx` the toasts read.
- **Tunables:** all of them live in `src/config.ts`.

## Tests
`tests/helpers.ts` provides:
- `smallWorld(size, villagers, seed)`: a small map with villagers hired for free.
- `unlockBuildings`: learns every building-unlock skill, so any building can be placed.
- `clearArea`: fells a rectangle of trees.

Tests that place buildings usually set `s.nextRelicAt = Infinity` so relics don't interfere.

## Docs
Keep the `README.md` Controls, Layout and **Changelog** sections current. Add a changelog entry
for each version.

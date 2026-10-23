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
No linter or formatter is configured.

## Architecture
- **`src/core/` is pure simulation with no DOM.** The UI changes state only through `commands.ts`,
  where every player action validates itself and returns success.
- **`GameState` vs `World`.** `GameState` (`types.ts`) is the persistent, JSON-serializable state.
  Its typed arrays are converted to plain arrays in `save.ts`. `World` (`world.ts`) wraps it with
  derived data that is never saved: drop-off BFS fields per resource, fog, max wood per tile.
  Change tiles through `claimTile`/`clearTree`. After placing a drop-off building, call
  `onBuildingsChanged` so the fields are rebuilt.
- **Simulation.** `sim.ts` runs an ordered system list each `tick`: `jobSystem`, then
  `villagerSystem`. The browser steps at 1/30 s, while offline catch-up uses 1 s steps
  (`CONFIG.sim`). Villager updaters must be **dt-independent**: they spend their whole time budget
  across state transitions inside one call. Tests assert identical results at both step sizes.
- **Determinism.** Core randomness goes through the seeded `rand(s)` (`rng.ts`), whose state is
  stored in `GameState`. Never use `Math.random` in core. The save test round-trips a mid-game
  state and checks that the continued simulation matches exactly.
- **Villager jobs.** `systems/villagers.ts` dispatches through a `Record<Job, Updater>`:
  - `lumber` uses `lumberjack.ts`. A lumberjack keeps its claimed tree across trips; marked trees come first.
  - Workplace jobs (`farm`, `mine`) share `workplace.ts`. Its `WORK` table maps each job to a
    resource and the stats that drive it. Workplaces never run out.
  - `jobs.ts` staffs workplaces from empty-handed lumberjacks and returns workers only at
    `carry === 0`. That keeps resources conserved, and tests check the totals.
- **Effective values.** Gameplay reads villager and production numbers from `getStats(s)`
  (`stats.ts`: config × upgrades × skills), not from `CONFIG` directly. Well-boosted farms are
  also computed there on demand, so there is no cache to invalidate.
- **Costs.** All costs are in `economy.ts`. Upgrade tracks (`axe`, `farm`, `pick`) read per-resource
  rows from `CONFIG[kind].costs`, where 0 means not charged. Use `upgradeCost(s, kind, level?)` and
  `maxLevel(kind)`. Skill discounts (Master Builders, Recruiters, Masons) are applied there too.
- **Pathing** (`pathing.ts`). Grid BFS over walkable tiles, meaning territory (grass or building).
  Trees and relics are never walked through. Each resource has a multi-source distance field from
  its drop-off buildings.
- **Saves.** `save.ts` keeps a `VERSION` and a chain of `migrations[v]` (v → v+1). Any change to
  the `GameState` shape needs a version bump, a migration, and a migration test.

## Rendering
- **Sprites are data.** `render/sprites.ts` holds pixel art as string grids (one char per pixel,
  `.` transparent), each category with its own palette (`TREE_`, `GROUND_`, `BUILDING_`,
  `RELIC_`, `FLAG_`, `VILLAGER_PALETTE`). The grids were generated once by throwaway scripts that
  are not in the repo, so edit the grids directly. `tests/sprites.test.ts` checks their sizes and
  palette chars. `renderer.ts` bakes every grid to a canvas at startup, once per fog brightness
  where fog applies.
- **Scale.** One tile is `SPRITE_W` (16) px. Tree, relic and building sprites are
  `OVERHANG_PX` (4) rows taller than their footprint and reach into the tile above, so a building
  sprite is `w·16 × h·16 + 4`. Villagers are composed from layers (`composeVillager`: pose + hat +
  tool or load) and anchored at `VILLAGER_FEET`.
- **Ground.** Grass is drawn into an offscreen canvas at 16 px per tile, and only cells whose fog
  level changed are redrawn. Variants are picked by a hash of the tile index.
- **Draw order.** `drawScene` draws everything on the ground back to front by where it meets the
  ground: trees and relics by tile row, buildings by bottom edge, villagers by feet. A villager
  standing on a building's tiles is drawn over that building. Flags and the relic glow are drawn
  right after their tree or stone.
- **Render-only state.** Animation runs on wall-clock time, and facing is kept in the renderer.
  Visual variety comes from tile-index hashes. None of it touches `GameState` or `rand`, which
  keeps the simulation deterministic.

## Extending
Most content is data-driven, and `Record<…>` maps make TypeScript flag every place a new key
must be handled:
- **Building:** add it to `BUILDINGS` (`buildings.ts`), `BUILDING_COLOR` (`render/renderer.ts`)
  and `BUILDING_TEXT` (`ui/text.ts`). Selection actions and info lines go in `ACTIONS`/`INFO`
  (`ui/actions.ts`). An optional pixel-art sprite (`w·16 × h·16 + 4`) goes in `BUILDING_SPRITES`
  (`render/sprites.ts`). Without one, the building is drawn as a `BUILDING_COLOR` rectangle.
- **Resource:** add it to `RESOURCES` (`types.ts`). Drop-off fields and HUD counters pick it up
  automatically. Then add a save migration.
- **Workplace job:** extend `Job`, then add entries to `WORK` (`workplace.ts`), `UPDATERS`
  (`villagers.ts`), and `VILLAGER_CLOTH`/`VILLAGER_GEAR` (`render/sprites.ts`).
- **Skill:** add it to `SKILLS` (`skills.ts`, with an optional `requires`), apply its effect in
  `stats.ts` or `economy.ts`, and add its text to `SKILL_TEXT`.
- **Tunables:** all of them live in `src/config.ts`.

## Tests
`tests/helpers.ts` provides:
- `smallWorld(size, villagers, seed)`: a small map with villagers hired for free.
- `clearArea`: fells a rectangle of trees.

Tests that place buildings usually set `s.nextRelicAt = Infinity` so relics don't interfere.

## Docs
Keep the `README.md` Controls, Layout and **Changelog** sections current. Add a changelog entry
for each version.

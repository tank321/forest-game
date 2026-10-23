# Forest Game (alpha v5)

Idle forest-clearing game modelled on Forest Nothing (see `docs/MECHANICS.md`).
Vite + TypeScript, no runtime dependencies.

```
npm install
npm run dev     # http://localhost:5173 (console: `world`, `reset()`)
npm test        # vitest
npm run build   # typecheck + production build to dist/
```

## Controls
Drag to pan, wheel or pinch to zoom. In **Chop** mode, tap a tree next to your land for +1 wood.
In **Mark** mode (or right-click), a tap flags a priority tree. Tap a building to select it:
the Town Center hires villagers (with wood or food), a Lumber Camp upgrades the axe, a Barn
upgrades farms, a Quarry upgrades picks. Esc cancels.

**Food:** a Farm (3×3) takes one empty-handed lumberjack as its farmer; farmers deliver food to
the Town Center or the nearest Barn (2×2). Pause a farm to give its farmer back. Food pays for
food-priced villagers, houses from the 4th, and late axe/farm upgrade levels.

**Stone:** a Quarry (2×2) takes two empty-handed lumberjacks as miners; they mine on site and
carry stone to the Town Center. Pause a quarry to give its miners back. Stone pays for axe/farm
levels 7–10, pick upgrades, houses from the 7th, and Wells. A **Well** (1×1) makes every farm
within 1 tile harvest ×3 and carry ×2 (wells don't stack).

Every few felled trees a **relic** appears in the forest (gold square). Chop until your land
touches it, tap it, and pick one of three skills. **Skills** lists levels; **Export/Import** move
saves as JSON files. In `npm run dev` a **DEV tap** button multiplies your taps ×1/×10/×100/×1000.

## Layout
- `src/config.ts` – all tunables
- `src/core/` – pure simulation, no DOM
  - `types.ts` state shape · `state.ts` new game · `world.ts` state + derived data (drop-off field, fog, max wood), `clearTree`
  - `trees.ts` ring-based tree wood · `buildings.ts` building defs + placement helpers
  - `pathing.ts` per-resource drop-off BFS fields, `pathHome`, `nearestTree` (villager-centred, marked first), `pathToAny`
  - `systems/` – `jobs.ts` staffs workplaces · `villagers.ts` dispatches by job to `lumberjack.ts` (sticky tree claims) / `workplace.ts` (farmers, miners) · `movement.ts` shared walking
  - `sim.ts` system list, `tick`, `simulate` · `stats.ts` effective values (upgrades, skills, well-boosted farms)
  - `skills.ts` skill defs, prerequisites, card dealing · `relics.ts` relic milestones and placement
  - `economy.ts` costs, population cap, `pay`/`gain` · `commands.ts` validated player actions · `save.ts` versioned saves + migrations
- `src/render/` – `camera.ts` pan/zoom, `renderer.ts` colored rectangles
- `src/input/input.ts` – pointer/wheel/pinch → tap and hover in world coords
- `src/ui/` – `hud.ts` top bar, `panel.ts` build menu / selection, `actions.ts` per-building actions, `text.ts` labels
- `src/main.ts` – wiring, fixed-timestep loop, offline catch-up, autosave

## Changelog
**v5** – Stone.
- Quarry building with a miner job; stone resource delivered to the Town Center.
- Pick upgrades (10 levels) at the Quarry.
- Stone costs on axe/farm levels 7–10, houses from the 7th, and Wells.
- Well building: farms within 1 tile harvest ×3 and carry ×2.
- Skills: Stonecutters, Masons, Quarry Crews, Deep Wells.
- Fix: lumberjacks could path through a relic tile, or stand on one to chop.
- Saves migrate from v4 automatically.

**v4** – Food: farms, barns, villager jobs, food-priced villagers and upgrades.

**v3** – Villagers, relics, skill tree.

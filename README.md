# Forest Game (alpha v10)

Idle forest-clearing game modelled on Forest Nothing (see `docs/MECHANICS.md`).
Vite + TypeScript, no runtime dependencies.

```
npm install
npm run dev     # http://localhost:5173 (console: `world`, `reset()`)
npm test        # vitest
npm run build   # typecheck + production build to dist/
```

## Controls
Drag to pan, wheel or pinch to zoom. Tap a tree next to your land for +1 wood.
Hover over a tree to see its wood left out of its full-grown wood; a tree that has been chopped
shows a health bar. Zoom in close to see what each villager carries in a tag over its head.
Right-clicking a tree flags it as a priority: a red flag once your land reaches it,
yellow until then. Tap a building to select it:
the Town Center hires villagers (with wood, food or cloth) and upgrades the wheelbarrow and coats, a Lumber Camp upgrades the axe, a Barn
upgrades farms, orchards, sheep farms and cotton plantations, a Quarry upgrades picks, a Market trades goods for gold. A selected building that gathers shows what it has produced or collected so far. Esc cancels.
While placing a building, **Cancel**, Escape or a right-click anywhere stops placing it.

At the start the build menu has only the House, Lumber Camp, Barn and Farm. Every other building is
unlocked by its own skill from a relic (Quarrying, Wells, Orchards, Sheep Farms, Cotton Fields, Markets,
Tax Offices, Trading Posts) and joins the build menu once learned.

**Roads:** buildings work only while they touch the Town Center or a road joined, edge to edge, to the
Town Center; the Well needs no road. An isolated building is tinted grey and counts for nothing: no
workers, no deliveries, no population or tax, no trading. Choose **Road** in the build menu, then tap or
drag over cleared land to lay road; start a drag on a road to lift it. **Done**, Escape or
a right-click ends road mode. Roads come from a stock of 12 plus 3 per house, and lifted roads return to it.
Tap a road to select it: **Move** it to another cleared tile, or **Sell** it back to the road stock.
Roads not yet joined to the Town Center are drawn darker. While placing a building, yellow means it can
stand there but needs a road. Villagers prefer connected roads when walking (at the same speed).

Select any building except the Town Center and choose **Move**, then tap a valid new location.
Moves are free; a green footprint marks valid cleared land, and city buildings (houses, Markets,
Tax Offices) still need to touch the Town Center or another city building. The original building stays until you place it; **Cancel move** or Escape cancels.
**Remove** shows its refund and the share lost, and removes the building in one click. Removal returns 50%
of the original construction materials, rounded down per resource; upgrade costs are excluded.
Workers deliver carried resources before returning to lumberjacking. Removing houses reduces the
population cap but keeps existing villagers. The Town Center cannot be moved or removed.

**Food:** a Farm (3×3) takes one empty-handed lumberjack as its farmer; farmers deliver food to
the Town Center or the nearest Barn (2×2). Pause a farm to give its farmer back. A **Fruit Orchard** (5×5; wood, stone and cloth)
takes three orchardists, each walking ×2 as fast, harvesting ×2 as fast and carrying ×5 as much as a
farmer; Barn upgrades and seasons apply, Wells don't. Food pays for
food-priced villagers, houses from the 4th, and late axe/farm upgrade levels.

**Stone:** a Quarry (2×2) takes two empty-handed lumberjacks as miners; they mine on site and
carry stone to the Town Center. Pause a quarry to give its miners back. Stone pays for axe/farm
levels 7–10, pick upgrades, houses from the 7th, and Wells. A **Well** (1×1) makes every farm
within 1 tile harvest ×3 and carry ×2 (wells don't stack). A boosted farm looks irrigated: damp soil, lusher crops
and water channels between the beds, frozen in winter. A Well that is selected, being placed or being moved shows its reach as a dashed blue square, and while placing it the farms it would boost are outlined in blue.

**Cloth:** a Sheep Farm (3×3) takes one empty-handed lumberjack as its herder; the herder
gathers cloth and carries it to the Town Center or the nearest Barn. A **Cotton Plantation** (6×6,
wood, stone and gold) takes five pickers, each gathering ×3 as fast and carrying ×3 as much as a
herder. Workers spread out over the field instead of crowding one edge. Barn (farm) upgrades raise
herding and picking speed and carry too. Pause a sheep farm or plantation to give its workers back.
The **Fertile Herding** skill makes herders (not pickers) bring back as much food as cloth. Cloth pays for
cloth-priced villagers, the last two axe/farm/pick levels, and houses from the 10th.

**Seasons & upkeep:** a year is four 3-minute seasons, shown on the stats plaque; hover over the
season (or tap it, or press Enter on it) to see what this season and the next one do. Farms and orchards harvest
×1.5 in autumn and nothing in winter. The first 5 villagers live for free; every villager beyond
them eats 0.1 food/s all year and burns 0.1 wood/s in winter. Nobody dies, but when a stock runs
out the town slows down: **Hungry** (no food) halves chopping and mining, **Cold** (no firewood in
winter) halves farming, mining, herding and picking. Food and wood rates on the plaque are net of upkeep; hover over (or tap) a resource for its sources and upkeep.
**Coats** at the Town Center (wood and cloth, 3 levels) cut firewood by 25% per level.
The **Wheelbarrow** at the Town Center (10 levels) makes every villager walk 5% faster per level and adds
a flat 2 to every gatherer's carry per level, the same for every job. It costs wood,
then also food from level 3, stone from level 5, cloth from level 7 and gold from level 9.

**Gold:** a **Market** (2×2, a city building) sells wood, food, stone and cloth for gold at 80% of
their value (wood 1, food 5, stone 20, cloth 20) and sells them to you at 120%. Select the Market,
pick a resource (each tile shows your stock), then tap a quick amount from 1 to 10M under **Sell** or
**Buy** (each shows the gold it earns or costs), or type an amount (**Max** fills in your whole stock). Market trades don't count toward the production rates on the plaque. A **Tax Office**
(2×2, a city building) collects 0.2 gold/s from every house within 4 tiles; a house pays once, however
many offices reach it. A **Trading Post** (2×2, anywhere) takes one empty-handed lumberjack as its
trader, who loads gold and carries it to the nearest Market. Gold per trip grows faster than the
straight-line gap between the two buildings (10 gold at 10 tiles, 28 at 20), so put trading posts far
from the Market. Without a Market the post stands idle. Gold pays for houses from the 13th. Skills:
**Tax Collectors** (+20% tax per level), **Pack Mules** (+25% gold per trip per level) and
**Shrewd Traders** (Market commission 5 points lower per level).

Every few felled trees a **relic** appears in the forest (a rune stone; it glows once your land touches it) and the map pans over to it; the land counter on the stats plaque counts down the trees left until the next one. Chop until your land
touches it, then tap it to open the **Choose a skill** tab (the game keeps running). Inspect one
of the offered cards and press **Choose** to upgrade it. Close with × or Escape to pick later
with **Pick skill** in the sidebar. Skills come in six tracks (Forestry, Villagers, Buildings, Farming, Mining,
Trade), and each skill is offered only once the one before it in its track has a level. A relic offers skills
from different tracks while it can. **Skills** opens the skill tree: one column per track, easier skills on top,
with a solid link once a skill unlocks the next one. Hover over a skill to compare current and next-level bonuses
in the right-hand panel; skills on offer from a relic glow, and clicking one learns it right there. On phones, tap a skill to show details beneath the tree,
which scrolls sideways. Keyboard users can select skills with Enter or Space. **Legacy** opens the Legacy perk tree;
it turns gold once you have learned enough skill levels to rebuild. Pick an available perk and click **Rebuild** twice
to start over on a new map with that perk kept forever. **Export/Import** move
saves as JSON files. In `npm run dev` a row of DEV buttons appears: **Tap** multiplies your taps ×1/×10/×100/×1000,
**Speed** runs the game ×1/×2/×5/×10, and **Reset** (click twice) wipes the save and starts over.

## Layout
- `src/config.ts` – all tunables
- `src/core/` – pure simulation, no DOM
  - `types.ts` state shape · `state.ts` new game · `world.ts` state + derived data (drop-off field, fog, max wood), `clearTree`
  - `trees.ts` ring-based tree wood · `buildings.ts` building defs + placement helpers · `roads.ts` road network, connected buildings, road stock
  - `pathing.ts` 8-directional Dijkstra: per-resource drop-off fields, `pathHome`, `nearestTree` (marked first, then shortest trip), `pathToAny`, path straightening
  - `systems/` – `jobs.ts` staffs workplaces · `villagers.ts` dispatches by job to `lumberjack.ts` (re-picks a tree after every delivery) / `workplace.ts` (farmers, orchardists, miners, herders, pickers, traders) · `movement.ts` shared walking, each worker's spot in its workplace
  - `sim.ts` system list, `tick` (split at season boundaries), `simulate` · `stats.ts` effective values (upgrades, skills, well-boosted farms, season and upkeep, tax, gold per trade trip)
  - `seasons.ts` season from simulated time · `systems/upkeep.ts` food and firewood consumption, house tax
  - `skills.ts` skill defs, tracks and prerequisites, card dealing · `relics.ts` relic milestones and placement
  - `legacy.ts` Legacy (prestige) perk tree, rebuild requirement, perk helpers
  - `economy.ts` costs, Market quotes, population cap, `pay`/`gain` · `commands.ts` validated player actions · `save.ts` versioned saves + migrations
- `src/render/` – `camera.ts` pan/zoom, `renderer.ts` ground and tree sprites + colored rectangles, tree health bars and hover label, `sprites.ts` pixel-art grids and palettes (map and UI), `bake.ts` grid → canvas
- `src/input/input.ts` – pointer/wheel/pinch → tap and hover in world coords
- `src/ui/` – `hud.ts` stats plaque, `panel.ts` build menu / selection, `skillModal.ts` skill tree and relic choices, `legacyModal.ts` Legacy perk tree and rebuild, `skillInfo.ts` skill status and bonus previews, `seasonInfo.ts` season effect lines, `actions.ts` per-building actions, `market.ts` Market trading panel, `text.ts` labels, icons and cost chips, `skin.ts` bakes UI sprites into CSS
- `src/assets/fonts/` – legacy Silkscreen font assets (SIL Open Font License, `OFL.txt`); the UI uses system fonts.
- `src/main.ts` – wiring, fixed-timestep loop, offline catch-up, autosave

## Changelog
**v15** – Legacy (prestige).
- Learn 15 skill levels to unlock a **rebuild**. Rebuilding starts a new run on a new map and wipes buildings, villagers, resources and skills. You keep your Legacy perks. Each rebuild raises the requirement by 5 levels, up to every skill maxed.
- Each rebuild takes one perk from the Legacy tree and adds 10 starting roads. The tree starts with Master Harvest (villagers gather ×3) and Swift & Strong (walk ×3, carry ×3), then forks:
  - City: Urban Core (base population 20, villagers −50%, 10×10 starting clearing), then Prosperous City (buildings −50%, start with 10 villagers who need no food or firewood).
  - Commerce: Trade Guilds (lumberjacks chop ×2, and each profession speeds up with its headcount, toward +300%), then Royal Bank (tax and trade gold ×3, half the market commission).
- Both branches lead to Relic Hunters (relics twice as often, 4 skills per pick). After that, Legacy ×2 (every gather rate ×2) can be taken at every rebuild.
- A **Legacy** button next to Skills opens the perk tree and turns gold when a rebuild is ready. Rebuilding takes two clicks.
- Saves migrate from v14 with an empty Legacy. DEV Reset wipes the Legacy too.

**v14** – Roads.
- Roads are laid from the build menu by tapping or dragging over cleared land, from a stock of 12 plus 3 per house.
- Tap a road to select it, then move it to another cleared tile or sell it back to the stock.
- A building works only while it touches the Town Center or a road joined to it; the Well needs no road. Isolated buildings are tinted grey and do nothing, and their status line says so.
- Villagers keep to connected roads where that is the cheaper route.
- Saves migrate from v13; existing buildings stand isolated until roads reach them.
- Right-clicking anywhere cancels placing a building or ends road mode.
- Farms boosted by a Well look irrigated. A Well shows its reach while selected, being placed or being moved, and placing one outlines the farms it would boost.
- Upgrade cards are condensed to two rows, Speed and Carry. The Barn card shows a farmer's numbers and notes that orchardists, herders and pickers improve too.
- A herder's carry tag shows the food its load will deliver (Fertile Herding) next to the cloth.
- Villagers walk around buildings instead of over them: they only step onto the building they are in or the one they are heading to, so routes keep to roads and open ground.
- A road running past a building's door or fence gap joins the building there, instead of at the first road tile beside it.
- Road mode ends by itself once the last road in the stock is laid.
- Sidebar: the Chop and Mark buttons, the relic count and **Find relic** are gone; right-click a tree to mark it.
- Removing a building no longer asks for confirmation: the **Remove** button shows the refund and the 50% lost.
- When a relic appears, the map pans smoothly over to it and says **New relic discovered!** Dragging or zooming stops the pan.

**v13** – Skill tracks.
- Skills are grouped into six tracks, each unlocking in order, easier skills first:
  - Forestry: Sharp Axes → Power Swing → Camp Crews → Teamwork
  - Villagers: Swift Feet → Big Baskets → Roomy Houses → Recruiters
  - Buildings: Master Builders → Masons → Deep Wells
  - Farming: Green Thumbs → Fertile Herding
  - Mining: Stonecutters → Quarry Crews
  - Trade: Tax Collectors → Pack Mules → Shrewd Traders
- A skill is offered once the one before it has a level. Power Swing, Fertile Herding and every other skill below the top of its track are now gated; Masons follows Master Builders instead of Stonecutters, and Deep Wells follows Masons instead of Green Thumbs.
- Relic choices come from three different tracks while there are enough to go round.
- Buildings unlock gradually: only the House, Lumber Camp, Barn and Farm can be built at the start. Eight new one-level skills each unlock a building and add it to the build menu, and their tree nodes show the building:
  - Farming: Green Thumbs → **Wells** → Deep Wells → **Orchards**
  - Herding (new): **Sheep Farms** → Fertile Herding → **Cotton Fields**
  - Mining: **Quarrying** → Stonecutters → Quarry Crews
  - Trade: **Markets** → **Tax Offices** → Tax Collectors → **Trading Posts** → Pack Mules → Shrewd Traders
  - Buildings is now Master Builders → Masons; Deep Wells moved to Farming.
- Buildings that already stand keep working and can still be moved; saves migrate from v12, learning the unlock skill of every building kind they already have.
- The **Skills** popup is a skill tree: a column per track with linked pixel-framed nodes (dim when locked, plank when available, parchment when learned, gold when maxed); skills on offer from a relic glow, and clicking one (or its **Choose** button in the detail panel) learns it without going back to the choice tab. The detail panel names the skill's track and place in it. The status and group filters are gone, and each relic choice card names its track.
- Skills learned in older saves keep their levels, even where they skip ahead of a track.
- Under the land counter on the stats plaque, **relic in N** counts down the trees left to fell before the next relic appears.
- The stats plaque starts with only wood; food, stone, cloth and gold each appear once you first gather (or buy) some.
- Fix: a marked tree's flag is a short pennant planted in the ground beside the trunk, about a third of a grown tree's height, instead of floating in the canopy.

**v12** – Wheelbarrow.
- Wheelbarrow upgrade at the Town Center (10 levels, 150 wood to 9000 wood + 3000 food + 1200 stone + 400 cloth + 400 gold): every villager walks ×1.05 per level, and every gatherer carries a flat +2 per level, the same for every job. Its card previews walking speed and the extra carry.
- Relic skill choice: the popup keeps one size while you hover between the offered skills.
- Zoomed in, a tag over each villager's head shows the resource it carries and how much. Empty-handed villagers show none.
- A selected building that gathers shows a lifetime counter: **Total produced** on farms, orchards, quarries, sheep farms, cotton plantations and trading posts, **Total collected** on the Town Center, lumber camps, barns, markets and tax offices (a house taxed by several offices is shared between them). Counting starts at v12 for existing buildings.
- Build menu: cards sit in a fixed two-column grid, with each icon and name in a same-height top row and costs wrapping across the full card width, so cards line up and stay shorter.
- Sidebar: the relic count and **Find relic** share their own row under Chop and Mark, and the DEV buttons (now **Tap**, **Speed**, **Reset** behind a DEV tag) stay together on one row under Skills.
- The per-minute rates on the stats plaque are a smooth rolling one-minute average: loads villagers are still carrying count as they are gathered, so deliveries no longer make the rates jump, and they refresh once a second. They show … for the first few seconds after loading.
- The stats plaque no longer shows trees left.
- Hover over (or tap) a resource on the stats plaque for where its per-minute rate comes from: each job (lumberjacks, farms, orchards, quarries, sheep farms, cotton plantations, trading posts), chopping by hand and tax, minus villagers' food and winter firewood, with the net when upkeep applies.
- Saves migrate from v11 automatically.

**v11** – Seasonal sprites.
- Trees change with the seasons: fresh greens in spring with lime blossom, russet oaks and golden limes and birches in autumn, bare snowy branches in winter. Pines stay green and gather snow on their tiers, and stumps get a cap of snow. Each tile turns at its own moment over the first 15 s of a season.
- Ground changes with the seasons: brighter grass and flowers in spring, olive and straw grass with fallen leaves in autumn, snow in winter with the flowers buried and pebbles poking through.
- Buildings change with the seasons: farms sprout in spring, ripen gold in autumn and lie under snow in winter; orchards blossom in spring, turn orange in autumn and stand bare in winter; cotton buds in spring and bursts white in autumn; sheep-farm tufts follow the grass. In winter snow covers the roofs and caps the relic stones, whose moss browns in autumn.
- Relic skill choice: a narrower popup; click (or tap) a skill to learn it, with each choice card showing its next-level bonus. After the last pick the game resumes with a confirmation, instead of opening the skill journal.
- Dev build: **DEV speed** button (×1/×2/×5/×10) and a two-click **DEV reset** button next to DEV tap.

**v10** – Cotton, cloth and orchards.
- Leather is now **cloth**, made by sheep farms and cotton plantations. Saves migrate from v9 automatically, including stock, totals, hires and recorded building costs.
- Cotton Plantation (6×6; 5000 wood, 500 stone, 250 gold, ×1.5 each): five pickers, each ×3 a herder's speed and carry. Barn upgrades apply to them too, and Cold slows them like herders.
- Fruit Orchard (5×5; 3000 wood, 300 stone, 100 cloth, ×1.5 each): three orchardists, each ×2 a farmer's walk speed, ×2 harvest and ×5 carry. Barn upgrades, Green Thumbs and seasons apply; Wells don't.
- Workplace jobs can walk at their own speed.
- Workplace workers walk to their own spot spread over the building's interior instead of the nearest edge tile.
- Barn upgrade preview and Town Center job counts include orchardists and pickers. Season notes name orchards with farms.
- Sprites: cotton field with a fenced gate, picker in a straw hat with a cotton sack, cloth (shirt) icon, fruit orchard, orchardist in orange with a basket of apples.

**v9** – Gold.
- Gold resource, shown on the stats plaque. The away message reports gold when it changed.
- Market (2×2, city building): sell goods for gold at 80% of their value or buy them at 120%. Its panel has a resource picker with stock, the exchange rate, quick amounts from 1 to 10M with their gold, a custom amount with Max, and a note confirming the last trade. Trades don't count as production.
- A selected building's panel heading shows its sprite.
- Tax Office (2×2, city building): houses within 4 tiles pay 0.2 gold/s each.
- Trading Post (2×2) with a trader job: the trader carries gold to the nearest Market. Gold per trip grows with the gap between the buildings to the power 1.5. The post needs a Market to work.
- Markets and Tax Offices count as city buildings, so houses can be built against them.
- Houses from the 13th cost gold.
- Skills: Tax Collectors, Pack Mules, Shrewd Traders.
- Sprites: market stall with a striped awning, stone tax office with a coin sign, trading post with a pack mule, trader in purple with a coin pouch, gold icon.
- Saves migrate from v8 automatically.

**v8** – Seasons and upkeep.
- Four 3-minute seasons. Farms harvest ×1.5 in autumn and lie fallow in winter; the map turns snowy in winter.
- Villagers beyond the first 5 eat food all year and burn firewood in winter. Running out makes the town Hungry (chopping and mining ×0.5) or Cold (farming, mining and herding ×0.5); nobody dies.
- Coats upgrade at the Town Center (3 levels, wood and leather): −25% firewood per level.
- Stats plaque: season with a progress bar (hover or tap for this and next season's effects), a Hungry/Cold warning, and food/wood rates net of upkeep. The away message reports food as well as wood.
- Saves migrate from v7 automatically.

**v7** – Leather.
- Sheep Farm (3×3) with a herder job; leather resource delivered to the Town Center or the nearest Barn.
- Barn (farm) upgrades also raise herding speed and carry.
- Fertile Herding skill: herders also deliver food equal to their leather.
- Leather costs on axe/farm/pick levels 9–10 and houses from the 10th; a leather price track for hiring villagers.
- Sprites: fenced sheep pen, herder with a crook, leather icon.
- Lumberjacks pick the free tree with the shortest next trip: the walk to the tree plus the walk from it to the nearest Town Center or Lumber Camp. They choose again after every delivery instead of returning to their last tree, so they work near the drop-off they just used.
- Villagers walk in 8 directions and in straight lines across open ground, never cutting past a tree's corner.
- Fix: a lumberjack whose tree fell just as its load filled walked to another tree before going home.
- Saves migrate from v6 automatically.

**Unreleased** – Art.
- Readable system fonts throughout the UI and tree hover labels, with lighter text shadows. Top stats stay in one row; scroll horizontally on narrow screens to see all six counters.
- Skills journal popup: cards with level pips, learned/locked/maxed states, status and group filters, prerequisite navigation, and current/next-level bonus previews on hover (tap on phones). A separate relic-choice tab requires an explicit **Choose** action; closing preserves pending choices. Upgrade messages and animated pips confirm each pick.
- Compact skills layout: title and progress share a header, tabs and filters share a toolbar, and shorter cards fill the remaining window height. Upgrade notifications disappear after a few seconds without taking space from the grid.
- Building upgrades use readable parchment cards: separate current/next stat columns with resource units, a level badge, a labeled cost, and a dedicated upgrade button. Worker status and pause explanations appear on separate lines.
- Tree health: a chopped tree shows a health bar (green left, red lost); hovering a tree shows its wood left / full-grown wood.
- Pixel-art UI: wooden plank buttons that press down, gold for the active tool and skill picks, parchment for build cards; a wooden sidebar.
- Icons for resources, stats, tools and menu buttons. Costs are icon chips, red where you are short.
- Build cards show the building's sprite.
- Stats float over the top of the map on a parchment plaque; messages pop up over the map. Tools moved into the sidebar; Export/Import are icon buttons.
- Wide screens (900 px and up): the map fills the window, with the HUD, build panel and menu in a sidebar on the right. Narrow screens keep the single-column layout.
- Tree sprites: oak, lime, birch and pine, chosen per tile; canopies overhang the tile above.
- Grass tiles (plain, tufts, flowers, pebbles) under trees and on cleared land.
- Lumber Camp sprite: log cabin, log pile and chopping block.
- Farm sprite: fenced wheat field with a gate and a scarecrow.
- House sprite: thatched cottage with a chimney.
- Quarry sprite: terraced pit with a ladder, boulders and cut stone blocks.
- Town Center sprite: timber hall with a bell tower and banner, and a dirt yard with log, grain and stone piles.
- Relics are mossy rune stones instead of gold squares; the rune lights and a halo pulses once one can be collected.
- Barn sprite (red barn with a hayloft and a hay bale) and Well sprite (stone well with a roof and bucket).
- Marked trees carry a flag: red when villagers can reach the tree, yellow until the land touches it.
- Villager sprites: outfit and tool by job (lumberjack, farmer, miner); they walk, swing tools, carry their load home, and face where they are going.
- Trees shrink through three growth stages to a stump as they are chopped (replaces the light/dark shading).

**v6** – Building management.
- Move any building except the Town Center for free, with placement validation and cancellation.
- Remove buildings with a refund preview and explicit confirmation; receive half their original construction materials, rounded down. Upgrades remain unlocked.
- Worker loads, job assignments, drop-off routes, well bonuses and population capacity update after moves and removals.
- Save v6 records each building's actual construction payment. Older saves migrate automatically using build order and saved discounts to estimate missing payments; their historical skill discounts cannot be recovered exactly.

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

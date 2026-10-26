# Forest Game (alpha v10)

Idle forest-clearing game modelled on Forest Nothing (see `docs/MECHANICS.md`).
Vite + TypeScript, no runtime dependencies.

```
npm install
npm run dev     # http://localhost:5173 (console: `world`, `reset()`)
npm test        # vitest
npm run build   # typecheck + production build to dist/
```

**On a phone:** every push to `main` builds the game and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`), at `https://tank321.github.io/forest-game/`. Open it in Chrome on Android and choose
**Install app** (or **Add to Home screen**): it then opens full screen from its own icon and plays offline. Saves stay
in that browser, so use **Export** and **Import** to move a game between devices. Pages first has to be turned on once in
the repository's **Settings → Pages** with **Source: GitHub Actions**, and serves a private repository only on a paid plan.

## Controls
A new game opens with a short **tutorial** at the top of the sidebar: one goal at a time, from the first taps through
hiring, a House, a Farm, a road out to the trees, a Lumber Camp and the axe, a Barn and the first farm upgrade, to the
first relic and skill, the skill tree and Legacy. Each goal finishes when you do it, and whatever it points at pulses. **Skip tutorial** (click twice) ends it for good; it isn't shown for existing saves.

Drag to pan, wheel or pinch to zoom (on a touch screen two fingers also pan). Tap a tree next to your land for +1 wood.
Hover over a tree to see its wood left out of its full-grown wood; a tree that has been chopped
shows a health bar. Zoom in close to see what each villager carries in a tag over its head.
Right-clicking a tree (or holding a finger on it) flags it as a priority: a red flag once your land reaches it,
yellow until then. Flagging a red one sends the nearest lumberjack straight there (two with Teamwork, three with
Felling Crews), dropping the tree it was on; lumberjacks walking home with a load finish the delivery first. A yellow
flag does the same the moment your land reaches it and it turns red. Nothing stops a lumberjack from reaching a red flag:
when buildings or forest cut the tree off (a strip of land sealed in behind a row of farms, say), it walks straight over
them to get there and back, and it walks out the same way if it is left stranded. Tap a building to select it:
the Town Center hires villagers (with wood, food or cloth), a Lumber Camp upgrades the axe, a Barn
upgrades farms, orchards, sheep farms and cotton plantations, a Quarry upgrades picks, a Tailor upgrades shoes, backpacks and coats, a Market trades goods for gold, a Mason's Yard sells roads. A selected building that gathers shows what it has produced or collected so far. Esc cancels.
While placing a building, **Cancel**, Escape or a right-click anywhere stops placing it.
On a touch screen, placing or moving a building or road is aimed first: its footprint starts in view (on the
building being moved, or in the middle of the map), dragging a finger moves it, and tapping elsewhere puts it there.
Tap the footprint itself to place it. Pinch or two fingers pan and zoom meanwhile.
On a phone the menu is a row of icons, and the build menu is a hotbar: one row of building icons you swipe sideways,
with roads left on the Road tile. A building you can't afford yet is dimmed, with a bar filling toward its cost. Tap one
to aim it, which shows its name, full cost, what is short and what it does (✕ cancels). The arrow beside the hotbar
switches to the cards with names and costs, and back (remembered in this browser).

At the start the build menu has only the House, Lumber Camp, Barn and Farm. Every other building is
unlocked by its own skill from a relic (Quarrying, Wells, Orchards, Sheep Farms, Tailoring, Cotton Fields, Markets,
Tax Offices, Trading Posts, Mason's Yard) and joins the build menu once learned.
**Guide** (in the menu under the panel) lists every building with a one-line description, its size,
workers, drop-offs and road needs. Locked buildings are dimmed and name the skill that unlocks them.
**Achievements** pop up as toasts while you play; higher tiers and secrets get a bigger, longer one. The sidebar
(on wider screens) shows the achievement you are closest to; tap it (or **Achievements** in the menu) to see every one with its progress.
Each one plays a bell chime; the speaker button in the menu turns sound off or on.
**Music** plays in the background and follows the season: each has its own chords, tempo and instruments, crossfading as the
season turns. The note button in the menu turns it off or on. Audio starts after your first tap or key press, and the music pauses while the tab is hidden.
They give no rewards and are kept across rebuilds; most count over all your runs.
The **Lucky Chest** in the map's top-right corner stores one opening every 10 minutes of real time, up to 3 (the timer
keeps running while the game is closed, and stops while it is full). Tap it when it glows: every stored chest opens at
once, dropping in, rattling and bursting open with a timed boost each (the whole game at ×2, ×3 or ×5 speed, ×10 hand
chops, or villagers gathering and walking ×2) or a Windfall of 15 minutes' income. Different boosts run side by side;
the same boost twice runs twice as long; speed boosts never run together but queue, fastest first (a slower one
already running pauses and resumes after). Every boost shows under the chest with its time left, queued speeds dimmed; hover over one for what it does.
**Forest creatures** (rabbits, birds, squirrels, foxes and more, changing with the season) wander the forest edge for atmosphere: a few around the first clearing, more as more land comes into sight (one per 48 tiles in sight on screen, up to 12, fewer in winter). They can't be tapped and change nothing in the game.

**Roads:** buildings work only while they touch the Town Center or a road joined, edge to edge, to the
Town Center; the Well needs no road. An isolated building is tinted grey and counts for nothing: no
workers, no deliveries, no population or tax, no trading. Choose **Road** in the build menu, then tap or
drag over cleared land to lay road; start a drag on a road to lift it. **Done**, Escape or
a right-click ends road mode. Roads come from a stock of 12 plus 3 per house (and any bought at the Mason's Yard), and lifted roads return to it.
Tap a road to select it: **Move** it to another cleared tile, or **Sell** it back to the road stock.
Roads not yet joined to the Town Center are drawn darker. While placing a building, yellow means it can
stand there but needs a road. Villagers prefer connected roads when walking (at the same speed).

Select any building except the Town Center and choose **Move**, then tap a valid new location. On a touch screen you
can also hold a finger on a building to pick it up, drag it straight to its new spot, and tap its footprint to place it.
Moves are free; a green footprint marks valid cleared land, and city buildings (houses, Markets,
Tax Offices) still need to touch the Town Center or another city building. The original building stays until you place it; **Cancel move** or Escape cancels.
**Remove** takes two clicks: the first shows its refund and the share lost, and a second within 3 seconds removes the building. Removal returns 50%
of the original construction materials, rounded down per resource; upgrade costs are excluded.
Workers deliver carried resources before returning to lumberjacking. Removing houses reduces the
population cap but keeps existing villagers. The Town Center cannot be moved or removed.

**Decorations** are only for looks, for those who like to lay out a town; nothing else in the game needs them.
**Decorate**, the last card in the build menu, opens a palette: flower beds, stone paving, picket fences, hedges, lamp
posts, benches, scarecrows, an ornamental cherry, a pond, dirt paths, stone walls, vegetable patches, woodpiles, haystacks,
a 2×1 market stall, a 3×3 town square and a 3×2 flower garden from the start. The **Trophies** button beside **Back**
switches it to the five trophies (a Golden Axe, a Relic Shrine, a Market Banner, a Town Fountain and a Snowman), which
unlock with an achievement tier, stay unlocked across rebuilds, and show in silhouette until then; it counts how many
you have earned, and **Town decorations** switches back. Each costs a little and comes back in full. 1×1 pieces are painted like road (tap or
drag; start a drag on one of that kind to lift them); bigger ones are placed like a building. Fences, hedges, walls and
paths join the ones beside them, and props can stand on paving, paths, the square and the garden. **Done**, Escape or a right-click ends placing. Tap a
decoration to **Move** or **Remove** it (or hold a finger on it to pick it up). Villagers walk straight over them, but
buildings and roads can't be put on one: remove it first. A new map after a rebuild starts without them.

**Food:** a Farm (3×3) takes one empty-handed lumberjack as its farmer; farmers deliver food to
the Town Center or the nearest Barn (2×2). Pause a farm to give its farmer back. A **Fruit Orchard** (5×5; wood, stone and cloth)
takes three orchardists, each walking ×2 as fast, harvesting ×2 as fast and carrying ×5 as much as a
farmer; Barn upgrades and seasons apply, Wells don't. Food pays for
food-priced villagers, houses from the 4th, and late axe/farm upgrade levels.

**Stone:** a Quarry (2×2) takes two empty-handed lumberjacks as miners; they mine on site and
carry stone to the Town Center. Pause a quarry to give its miners back. Stone pays for axe/farm
levels 7–10, pick upgrades, houses from the 7th, and Wells. A **Well** (1×1) makes every farm
within 1 tile harvest ×3 and carry ×2 (wells don't stack). A boosted farm looks irrigated: damp soil, lusher crops
and water channels between the beds, frozen in winter. The **Mason's Yard** (4×4, one per town; Masons, once 4 levels
are learned in Mining) takes stone too, so miners from a nearby Quarry deliver there. Select it to **Buy a road** for the
road stock (100 stone, each road bought ×1.5 the last). While it is connected, a selected house can be **Rebuilt in stone**
(200 wood and 150 stone, each stone house ×1.35 the last): a slate-roofed stone house holds 2 more villagers, keeps its
stone when moved, and half the upgrade comes back if it is removed. Masons discounts the stone in both. A Well that is selected, being placed or being moved shows its reach as a dashed blue square, and while placing it the farms it would boost are outlined in blue. Once **Camp Crews** is learned, a Lumber Camp shows the 3 tiles around it where lumberjacks chop ×1.5 the same way, as a dashed gold square.

**Cloth:** a Sheep Farm (3×3) takes one empty-handed lumberjack as its herder; the herder
gathers cloth and carries it to the Town Center or the nearest Barn. A **Cotton Plantation** (6×6,
wood, stone and gold) takes five pickers, each gathering ×3 as fast and carrying ×3 as much as a
herder. Workers spread out over the field instead of crowding one edge. Barn (farm) upgrades raise
herding and picking speed and carry too. Pause a sheep farm or plantation to give its workers back.
The **Fertile Herding** skill makes herders (not pickers) bring back as much food as cloth. Cloth pays for
cloth-priced villagers, the last two axe/farm/pick levels, Tailor upgrades, and houses from the 10th.

**Tailor** (2×2, 800 wood and 60 cloth; unlocked by the Tailoring skill, after Sheep Farms; one per town) takes no deliveries:
its upgrades are paid straight from the stockpile. **Shoes** make every villager walk ×1.05 faster per level,
**Backpacks** give every gatherer +2 carry per level on top of its own, and **Coats** cut winter firewood by 25% per level.

**Upgrades past level 10:** the Axe, Farm (Barn), Pick, Shoes and Backpack tracks never end. Their first 10 levels
are as listed above; every level after that multiplies the track's effects again (Axe, Farm and Pick: ×1.15 speed
and ×1.15 carry; Shoes: ×1.05 walking; Backpack: ×1.15 extra carry) and costs ×1.35 the level before, in the same
resources as level 10. Trees grow about ×1.2 bigger each ring out, so this keeps each ring only a little slower to
clear than the last. Coats and the Satchel keep their 3 levels.

**Seasons & upkeep:** a year is four 3-minute seasons, shown on the stats plaque; hover over the
season (or tap it, or press Enter on it) to see what this season and the next one do. Farms and orchards harvest
×1.5 in autumn and nothing in winter. The first 5 villagers live for free; every villager beyond
them eats 0.1 food/s all year and burns 0.1 wood/s in winter. Nobody dies, but when a stock runs
out the town slows down: **Hungry** (no food) halves chopping and mining, **Cold** (no firewood in
winter) halves farming, mining, herding and picking. Food and wood rates on the plaque are net of upkeep; hover over (or tap) a resource for its sources and upkeep.
**Growing Families** (Settlement, after Roomy Houses, once 4 Settlement levels are learned) brings villagers for free:
one is born at the Town Center every 15 minutes, sooner with more connected Houses (×1 + 0.05 per House: 10 minutes
at 10 Houses, 5 at 40), while there is population room and a food surplus (10 food per villager in stock). Otherwise
the next birth waits; the Town Center's panel says when it comes or what it waits for. Its second level adds **Spring
Births**: as spring begins, 1 villager per 5 connected Houses (at least 1), room and surplus allowing. Born villagers
eat like any other but aren't hires, so villager prices don't rise.
**Coats** at the Town Center (wood and cloth, 3 levels) cut firewood by 25% per level.
The **Wheelbarrow** at the Town Center (10 levels) makes every villager walk 5% faster per level and adds
a flat 2 to every gatherer's carry per level, the same for every job. It costs wood,
then also food from level 3, stone from level 5, cloth from level 7 and gold from level 9.

**Gold:** a **Market** (2×2, a city building) sells wood, food, stone and cloth for gold at 80% of
their value (wood 1, food 5, stone 20, cloth 20) and sells them to you at 120%. Select the Market,
pick a resource (each tile shows your stock), then tap a quick amount from 1 to 10M under **Sell** or
**Buy** (each shows the gold it earns or costs), or type an amount (**Max** fills in your whole stock). Market trades don't count toward the production rates on the plaque. A **Tax Office**
(2×2, a city building) takes one empty-handed lumberjack as its tax collector. While one stands, every
connected house comes to owe 0.2 gold/s, up to 60 s of tax (12 gold); beyond that its tax is lost. The
collector walks only along the roads (and across the Town Center or Outpost) from house to house,
starting each round at the house owing the most, then the nearest next, and the gold counts once it is
back at the office. It visits one house per round; the **Satchel** upgrade at the office raises that to
2, 3 and 5. A **Trading Post** (2×2, anywhere) comes with its own pack mule (no villager
needed), which loads gold for 5 s and carries it along the roads to the nearest Market and back. Gold per trip grows faster than the
straight-line gap between the two buildings (10 gold at 10 tiles, 28 at 20), so put trading posts far
from the Market. Without a Market the post stands idle. Select the post and **Buy a pack mule** for up to 5 on its
route (wood, food and gold): the first extra costs 400 wood, 150 food and 100 gold, and each one bought anywhere in the
town costs ×1.6 the last (a removed post's mules are not refunded). Gold pays for houses from the 13th. Skills:
**Tax Collectors** (+50% tax per level), **Deputies** (a second collector per Tax Office), **Pack Mules** (+25% gold per trip per level) and
**Shrewd Traders** (Market commission 5 points lower per level).
With **Guild Contracts**, the Market panel also lists three contracts (gather a resource, fell trees or
reach a population); tap a finished one to claim its gold. With **Merchant Caravans**, a caravan's three
deals appear there each winter; tap one to take it before spring.

The **Frontier Outpost** (3×3, the Settlement Mastery) is a second hub you can build anywhere on cleared
land, once. It takes every resource, hires villagers like the Town Center, and roads touching it count as
connected, so a new town can grow at the forest's edge.

Every few felled trees a **relic** appears in the forest (a rune stone with a soft golden glow, so it is easy to spot in the forest; it glows brightly once your land touches it) and a popup at the top of the map says so, and again when your land first reaches it (tap the popup to glide the map over to the relic); the land counter on the stats plaque counts down the trees left until the next one. Chop until your land
touches it, then tap it to open the **Choose a skill** tab (the game keeps running). Inspect one
of the offered cards and press **Choose** to upgrade it; the relic is then taken and its tile becomes land. Close with ×
or Escape to pick later: the relic stays on the map, glowing, and tapping it again offers the same skills. Once per relic,
**Reshuffle** under the cards deals other skills instead (the ones shown come back only if too few others are left). Skills come in six tracks, one per economy (Forestry, Settlement, Farming,
Herding, Mining, Trade). Each track is a tree: a skill is offered once its parent has a level, and one parent can
unlock several skills. A relic offers skills from different tracks while it can. **Skills** opens the skill tree,
which fills the window: drag (or swipe) to pan, scroll (or pinch) to zoom, or use the +, − and ⤢ (show everything)
buttons in the corner and the + and − keys. A link turns solid once its parent has a level. Hover over a skill
(or tap it, on phones) for a popup beside it with its current and next-level bonus; skills on offer from a relic
glow, and clicking one (tapping it a second time on phones) learns it right there. Keyboard users can tab through
skills (the view and the popup follow focus) and learn an offered one with Enter or Space. **Legacy** opens the Legacy perk tree;
it turns gold once you have learned enough skill levels to rebuild: 15 on the first run, 5 more after each of the first two rebuilds, then 10 more after each one (15, 20, 25, 35, 45 …), up to every skill learned (93). Pick an available perk and click **Rebuild** twice
to start over on a new map with that perk kept forever. A relic offers 3 skills to choose from, one more after each rebuild
up to 5 (6 with Relic Hunters). **Export/Import** move
saves as JSON files. In `npm run dev` a row of DEV buttons appears: **Tap** multiplies your taps ×1/×10/×100/×1000,
**Speed** runs the game ×1/×2/×5/×10, and **Reset** (click twice) wipes the save and starts over.

## Layout
- `src/config.ts` – all tunables
- `src/core/` – pure simulation, no DOM
  - `types.ts` state shape · `state.ts` new game · `world.ts` state + derived data (drop-off field, fog, max wood), `clearTree`
  - `trees.ts` ring-based tree wood · `buildings.ts` building defs + placement helpers · `roads.ts` road network, connected buildings, road stock
  - `decor.ts` decorations (looks only): kinds, costs, trophy unlocks, where they fit
  - `pathing.ts` 8-directional Dijkstra: per-resource drop-off fields, `pathHome`, `nearestTree` (marked first, then shortest trip), `pathToAny`, `roadRoutes` (walks kept to the roads), path straightening
  - `systems/` – `jobs.ts` staffs workplaces · `villagers.ts` dispatches by job to `lumberjack.ts` (re-picks a tree after every delivery) / `workplace.ts` (farmers, orchardists, miners, herders, pickers) / `collector.ts` (tax collectors' rounds) · `mules.ts` Trading Posts' pack mules · `movement.ts` shared walking (faster along roads with Cobblestone), each worker's spot in its workplace · `grazing.ts` Grazing Flocks
  - `sim.ts` system list, `tick` (split at season boundaries), `simulate` · `stats.ts` effective values (upgrades, skills, well-boosted farms, season and upkeep, tax, gold per trade trip)
  - `seasons.ts` season from simulated time · `systems/upkeep.ts` food and firewood consumption, gold owed by houses · `systems/births.ts` Growing Families and Spring Births
  - `skills.ts` skill defs, tracks and prerequisites, card dealing · `relics.ts` relic milestones and placement
  - `legacy.ts` Legacy (prestige) perk tree, rebuild requirement, perk helpers
  - `achievements.ts` achievement table, lifetime counters (career), tier checks, next-up pick
  - `chest.ts` Lucky Chest rewards, odds, boost multipliers and the Windfall
  - `economy.ts` costs, Market quotes, population cap, `pay`/`gain` · `guild.ts` Guild Contracts and caravan deals · `commands.ts` validated player actions · `save.ts` versioned saves + migrations
- `src/render/` – `critters.ts` ambient forest creatures (season roster, wandering, shyness, snow tracks; display only), `camera.ts` pan/zoom, `renderer.ts` ground and tree sprites + colored rectangles, tree health bars and hover label, `sprites.ts` pixel-art grids and palettes (map and UI), `bake.ts` grid → canvas
- `src/input/input.ts` – pointer/wheel/pinch → tap and hover in world coords
- `src/ui/` – `hud.ts` stats plaque, `panel.ts` build menu / selection, `skillModal.ts` skill tree and relic choices, `skillGraph.ts` skill tree layout, `panZoom.ts` drag/wheel/pinch pan-and-zoom viewport, `legacyModal.ts` Legacy perk tree and rebuild, `guideModal.ts` building guide, `achievementsModal.ts` achievement list and next-up button, `toast.ts` achievement and relic toasts, `chest.ts` the Lucky Chest button, boost badge and opening show, `audio.ts` the shared audio context and on/off buttons, `prefs.ts` per-browser settings, `tutorial.ts` the new-game tutorial steps and coach card, `sound.ts` synthesized achievement chimes and Lucky Chest sounds, `music.ts` generative seasonal background music, `skillInfo.ts` skill status and bonus previews, `seasonInfo.ts` season effect lines, `actions.ts` per-building actions, `market.ts` Market trading panel (plus caravan deals and contracts), `text.ts` labels, icons and cost chips, `skin.ts` bakes UI sprites into CSS
- `src/assets/fonts/` – legacy Silkscreen font assets (SIL Open Font License, `OFL.txt`); the UI uses system fonts.
- `src/main.ts` – wiring, fixed-timestep loop, offline catch-up, autosave, service worker registration
- `public/` – web app manifest and icons · `pwa/sw.js` offline service worker, filled in by `vite.config.ts` at build
- `.github/workflows/deploy.yml` – tests, builds and publishes to GitHub Pages on every push to `main`

## Changelog
**v56** – Surveyors halved, and a slimmer plaque and tidier Tailor on phones. No save change.
- On phones, Well Fed, Hungry and Cold show as a one-line tag hanging from the bottom of the stats plaque instead of
  taking a row of their own, so the plaque stays two rows tall and more of the map shows.
- **Surveyors** now adds 1 road per house per level (was 2), so +1 and +2 at its two levels. Roads already laid stay
  where they are; a town over its new stock lays no more until it has room again.
- On phones, an upgrade's button no longer grows to fit its whole cost on one line: at the Tailor, where Shoes and
  Backpack cost five resources, the cost wraps onto more lines and the level and stats beside it read normally again.

**v55** – On phones, the Lucky Chest's boost badges under the chest shrink to an icon, the time left and its bar, so a
few running at once no longer cover the corner of the map. No save change.

**v54** – The Mason's Yard, and one Market per town.
- **Mason's Yard** (4×4, one per town): a new Mining skill under Masons, offered once 4 levels are learned in Mining,
  unlocks it for 3000 wood and 800 stone. It is a stone drop-off, so it pays to build it near your Quarries, and it
  needs a road to the town. Select it to buy roads one at a time: 100 stone for the first, each ×1.5 the last.
- **Stone houses:** while a Mason's Yard is connected, select a house and **Rebuild in stone** (200 wood and 150 stone,
  ×1.35 for each stone house already standing) for room for 2 more villagers. Stone houses get stone walls and a slate
  roof, stay stone when moved or when the Yard is gone, and refund half the upgrade with the house. Masons discounts the
  stone in roads and stone houses alike.
- Two achievements: Chip off the Old Block (build a Mason's Yard) and Set in Stone (rebuild a house in stone).
- Out of roads, the message points to the Mason's Yard once it is unlocked. A selected house says how many it holds.
- Save v30: no roads bought yet.
- Like the Tailor and the Frontier Outpost, only one Market may stand: once it is built it leaves the build menu, and
  it returns if the Market is removed. Its price no longer climbs (500 wood, 50 stone). Towns that already have more
  than one keep them.
- Buildings and roads can no longer be placed or moved onto decorations, which used to vanish under them (their cost
  came back, unannounced). The spot shows red and asks you to remove the decorations first.
- On a touch screen, tapping a relic no longer picks a skill by itself: the tap that opened the menu also landed on
  the card under your finger.
- A finished Guild Contract's "Claim" line and reward are dark on its gold button, where they were unreadable.
- The Guild Contract board never posts a contract it already has (at most one "Reach N villagers", one "Fell", and one
  "Gather" per resource). "Reach" contracts used to pile up while houses were full, until the board held three of the
  same one, all finished by a single milestone. Save v29 drops the repeats, and the board refills at the next season.
- On a phone the sidebar no longer shows the next-up achievement, leaving more room for the map and panel.
  **Achievements** in the menu still lists them all.
- On a phone the build menu is a hotbar: one row of icon tiles without the heading, about a third the height of the old
  cards, so the map gets more of the screen. A tile you can't afford yet is dimmed, with a bar showing how close you
  are, and the Road tile shows how many roads are left. Tapping any tile aims it, and the panel then shows its name,
  full cost (shortfalls in red), what is missing and what it does, with ✕ to cancel. The arrow beside the hotbar now
  switches to the named cards with costs and back, instead of folding the menu away.
- Tapping to place a building you can no longer afford says "Not enough for a …" instead of "Can't build there".

**v53** – More decorations, and trophies get their own page.
- The decoration palette is split in two: the town decorations, and the five trophies. A **Trophies** button beside
  **Back** (showing how many you have earned) switches to them, and **Town decorations** switches back.
- Eight new decorations: dirt paths and stone walls that join their neighbors, vegetable patches (seedlings, cabbages,
  pumpkins, then bare furrows), woodpiles (stacked high in autumn, burned down in winter), haystacks, a 2×1 market stall,
  a 3×3 cobbled town square and a 3×2 flower garden (tulips in spring, roses in summer). Benches, lamps and stalls can
  stand on the square, the garden and paths.
- The Town Fountain's basin is drawn whole: it was cut off at the bottom of its tiles.

**v52** – Decorations.
- **Decorate**, the last card in the build menu, opens a palette of decorations that are only for looks: villagers walk
  over them and nothing works any differently. Flower beds, stone paving, picket fences, hedges, lamp posts, benches,
  scarecrows, an ornamental cherry and a 2×2 pond are there from the start.
- Five trophies unlock with an achievement tier: a Golden Axe (Timberrr! V), a Relic Shrine (Relic Hunter III), a Market
  Banner (Treasure Trove IV), a 2×2 Town Fountain (Village Elder IV) and a Snowman (Weathered III). Earned trophies
  stay unlocked across rebuilds.
- Each costs a little (10 wood for a fence, 5 stone for paving, 100 stone for the fountain) and returns it all when removed,
  or when a building or road is put over it. 1×1 pieces are painted like road; fences and hedges join their neighbors.
- They change with the seasons: blossom and flowers fade in autumn, the cherry stands bare, hedges and benches carry
  snow, and the pond and fountain freeze over in winter.
- Save v28: no decorations yet.

**v51** – Relic news waits for you.
- The map no longer pans on its own when a relic appears or your land first reaches one. A popup at the top of the map
  tells you instead, and stays 10 seconds; tap it to glide over to the relic. Several relics each get their own popup.

**v50** – Bigger skill levels, and villagers born over time.
- **Growing Families**, a new Settlement skill after Roomy Houses (offered once 4 Settlement levels are learned):
  a villager is born at the Town Center every 15 minutes, sooner with more connected Houses (10 minutes at 10, 5 at
  40), while there is room and a food surplus (10 food per villager in stock). Level 2, **Spring Births**: as spring
  begins, 1 villager per 5 connected Houses at once. Born villagers aren't hires, so prices don't rise. The Town
  Center's panel shows the next birth, the season popup the coming Spring Births, and the away message the villagers
  born while you were gone. Skills now add up to 92 levels.
- The stat skills have fewer levels, each a bigger step. Sharp Axes, Green Thumbs, Stonecutters and Tax Collectors are
  2 levels of +50% (were 5 of +20%); Swift Feet 2 of +25% walking (5 of +10%); Big Baskets 2 of +5 carry (5 of +2);
  Recruiters, Masons and Root Cellars 2 of −25% (3 of −15%). At their maximum they are as strong as before, or a
  little stronger. Roomy Houses stops at 2 levels (+2 population per house; was 3).
- With the condensed skills, the skill levels add up to 90 instead of 112 (92 with Growing Families). Every track still
  has enough levels for its Mastery.
- Rebuilds ask for more from the third on: 15 skill levels on the first run, 5 more after each of the first two
  rebuilds, then 10 more after each one (15, 20, 25, 35, 45 … 85, then every skill learned after the 9th rebuild;
  was +5 a run, every skill after the 16th). The perks stack up fast, so a flat +5 made the middle runs quick.
- Save v27: progress toward the next birth starts at none.
- Save v26: learned levels of these skills convert to their share of the new maximum, rounded up (Sharp Axes 3 → 2,
  2 → 1; Recruiters 2 → 2; Roomy Houses 3 → 2). A card in an open relic offer for a skill that is now maxed is removed from the offer.
- With Camp Crews learned, a Lumber Camp that is selected, being placed or being moved shows its 3-tile reach as a
  dashed gold square, like a Well's.
- The season popup is one line per season: "Summer, 2m 13s left: Normal harvest", then "Next: Autumn: Harvest ×1.5".
  Winter adds the firewood it will burn ("No harvest · Firewood 18 wood/min"), and seasonal skills appear once learned:
  Shearing Day in spring, Midsummer Fair in summer, Harvest Festival, Deep Shafts and Merchant Caravans in winter.
  Food upkeep (in the food rate) and shortage penalties (on the Hungry/Cold chip) are no longer repeated there.
- Only one Tailor may stand: its upgrades already cover the whole town. Once it is built it leaves the build menu,
  like the Frontier Outpost, and comes back if it is removed. A town that already has more keeps them.

**v49** – Upgrades without end.
- The Axe, Farm, Pick, Shoes and Backpack upgrades go on past level 10: each further level multiplies the track's
  effects (×1.15 speed and carry; Shoes ×1.05 walking; Backpack ×1.15 extra carry) and costs ×1.35 the level before.
  Levels 1–10 are unchanged. Upgrade cards show "Level 14" with no maximum, and big rates use short numbers.
- Why: tree wood grows about ×1.2 per ring without limit, while every bonus had a cap, so a run slowed to a crawl
  around ring 30 (a ring-30 tree took a lumberjack about 1½ hours, mostly walking with a capped load). In a model of
  a greedy first run, clearing the whole map went from well over 300 hours to about 24.
- Well Equipped (total upgrade levels) gains tiers at 60 and 100: 102 achievement tiers in all. No save change.

**v48** – Reshuffle.
- Under a relic's skill cards, **Reshuffle** deals other skills to choose from, once per relic. Closing and opening
  the relic again keeps the reshuffled offer. In a simulation of first runs, it brought the skill a player was after
  about a third sooner (Wells after about 6 relics instead of 10, Teamwork after about 14 instead of 22).
- Save v25: an offer already dealt hasn't been reshuffled.

**v47** – Hovering over a Lucky Chest boost under the chest says what it does ("Villagers gather and walk twice as
fast."); a queued speed also says which one it waits for. No save change.

**v46** – Relics wait on the map.
- Closing the skill choice without picking now leaves the relic on the map, glowing, instead of putting a **Pick skill**
  button in the sidebar (which is gone). Tap the relic again for the same skills; it is taken, and counts as collected,
  once you pick one.
- Save v24: skill picks still owed from an older save come back as relics at the edge of your land, offering the
  same skills.

**v45** – More pack mules.
- A Trading Post's panel now has **Buy a pack mule**: up to 5 mules per post, each working the route on its own. The
  first extra costs 400 wood, 150 food and 100 gold, and every one bought in the town costs ×1.6 the last. At 10
  tiles from the Market a mule brings in about 26 gold a minute (more with Pack Mules), so the first pays back in a
  few minutes and later ones take longer, unless the route is long. A post's mules walk a little apart, as a pack train.
- Save v23: every Trading Post keeps the one mule it had.

**v44** – Relics glow.
- Every relic in sight now has a faint golden halo and a slow pulse of light around the stone, so it stands out among
  the trees. One your land touches still glows brightly and quickly. No save change.

**v43** – More skill choices after each rebuild.
- A relic offers 3 skills to choose from on the first run, 4 after the first rebuild and 5 from the second on.
  Relic Hunters now adds one more on top (6) instead of setting 4. No save change.

**v42** – More creatures as the forest opens up.
- How many forest creatures are about now follows how much of the screen is in sight (your land and the forest at its
  edge), not the size of the screen: about 3 around the starting clearing, growing to 12 once the land fills about half
  a desktop screen. Zoomed in close there is still at least one. No save change.

**v41** – The Lucky Chest stores up to three.
- The chest keeps filling while it is unopened, while you are idle and while the game is closed: one opening every
  10 minutes, up to 3. One tap opens them all at once, in one show with every reward on the card.
- Boosts never clash: different kinds run together, the same kind adds its time, and speed boosts queue fastest first.
  Offline catch-up follows the queue exactly. Each boost has its own badge under the chest.
- Save v22: a ready chest becomes one stored (one whose cooldown passed long ago fills up from then), and a running
  boost or an unclaimed reward carries over.

**v40** – The map pans to an uncovered relic.
- When your land first reaches a relic, the map glides over to it, as when it appears, with "Relic uncovered! Tap it to
  choose a skill." Reached while you were away, it pans there on your return. No save change.

**v39** – The tutorial teaches roads, the Barn, skills and Legacy.
- New steps: **Lay a road** (after the Farm: drag a road from the Town Center out toward the trees; skipped if one is
  already joined), **Better farms** (after the axe: build a Barn near your farms and buy the first farm upgrade) and
  **Explore your skills** (after the first skill: open the skill tree). The last card now explains **Legacy** rebuilds
  and points at its button. The Lumber Camp goes at the end of the new road.
- Progress in the old 8-step tutorial carries over to the matching step. No save change (tutorial progress is a
  browser setting).

**v38** – Hold to move.
- On a touch screen, holding a finger on a building (any but the Town Center) picks it up to move, with a short buzz on
  phones that can: keep the finger down and drag it to the new spot, then tap its footprint to place it, as after **Move**.
  No save change.

**v37** – Nothing stands between a lumberjack and a flag.
- A red-flagged tree that no path reaches (land sealed in by buildings and forest) is still fetched: the lumberjack takes
  the normal route where there is one and otherwise walks straight over buildings and trees, there and back with its load.
  A lumberjack left in such a pocket with nothing to chop walks out to a drop-off. Yellow flags still wait for your land.
  No save change.

**v36** – Phone building panel, reworked.
- On a phone a selected building's panel fits without scrolling: its name shares one line with **Move**, **Remove**,
  **Pause** (where it has one) and **✕**; its status and total share one small line; and each upgrade is a single row,
  stats on the left (current → next) beside an **Upgrade** button that carries the cost. The description is left out when
  there is more to show (the Guide has it), and the next-up achievement steps aside while a building is selected or placed.
- **Remove** takes two taps everywhere: the first shows the refund and turns it into **Confirm remove**, and a second
  tap within 3 seconds removes the building.

**v35** – Phone building panel.
- On a phone a selected building's **Move**, **Remove** and **Close** sit right under its name instead of below its
  upgrades, and the upgrade card, status and tally lines are more compact, so the panel takes less of the screen.
  Desktop is unchanged. No save change.

**v34** – Build menu arrow.
- On a phone the build menu folds away and back with an arrow on its heading (down to tuck it away, up to bring it back)
  instead of the Hide and Show text. No save change.
- Folding now really hides the building cards; before, only the arrow turned.

**v33** – Workers who can reach their workplace.
- A workplace now takes the nearest empty-handed lumberjack by walking route, not in a straight line. Before, it could
  pick one that buildings or forest cut off from it (a Town Center and its neighbors can split a village in two), who then
  stood idle forever while counting as its worker, so the workplace never produced. A worker that loses its way to its
  workplace (a building placed in the way) also gives the job back for someone who can reach it. No save change.

**v32** – Flags send lumberjacks.
- Flagging a tree your land reaches sends the nearest lumberjack to it at once, instead of waiting for a lumberjack to
  finish its current trip. With Teamwork two go, with Felling Crews three. Lumberjacks walking home with a load, or
  already on another flagged tree, carry on. No save change.
- A yellow flag does the same the moment your land reaches it and it turns red.

**v31** – Phone stats plaque.
- On narrow screens the stats plaque wraps onto rows instead of scrolling sideways, so every resource, the population,
  land, season and any shortage are visible at once; rates drop the "/min" there to fit. The Lucky Chest and achievement
  toasts sit just below the plaque however tall it grows, and the resource and season popups open over the chest. No save change.

**v30** – Phone layout.
- On narrow screens the map takes most of the screen. The build menu is a single row of cards that scrolls sideways, and
  **Hide**/**Show** on its heading folds it away (the tutorial still shows a card it points at). The menu is one row of
  icon buttons, the sidebar's spacing is tighter, and the installed app uses the strip beside a camera notch for the map.
  Desktop is unchanged. No save change.
- The installed app now always checks for a new version when it opens; before, it could keep showing the old one for up to 10 minutes after an update.

**v29** – Install on a phone.
- The game is published to GitHub Pages on every push to `main`, and can be installed as an app from Chrome: full screen
  in portrait, with an oak tree icon, and playable offline. A new version loads the next time the app is opened. No save change.

**v28** – Touch controls.
- Hold a finger on a tree for a moment to flag it as a priority, like a right-click (phones that can vibrate give a short buzz).
- On a touch screen, placing a building and moving a building or road no longer happen on the first tap. The footprint
  starts in view, follows your finger as you drag (grab it to carry it, or drag anywhere to bring it under your finger),
  and moves to wherever you tap; tapping the footprint itself places it. The panel's instructions say so on touch screens.
- Pinching now also pans with the two fingers' midpoint, so you can move the map while aiming a placement. No save change.

**v27** – Chimney smoke.
- In winter, smoke curls up from every house's chimney: soft puffs that rise, swell and drift off with the wind as they fade, each house puffing in its own rhythm. No save change.
- Relic skill cards now pick a track evenly before a skill in it, so a track you haven't started (and the building it unlocks: Quarry, Sheep Farm, Market) comes up as often as one with many skills on offer. Long waits for those buildings are about half as long in unlucky games.

**v26** – Creature animation fixes.
- Foxes are redrawn with pointed ears, a snout, a bushy white-tipped tail and legs you can actually see, which now trot. Hedgehogs and songbirds get tiny visible legs too. The deer is redrawn slimmer and leggier, with antlers, a white rump, and a neck that bends down to graze.
- Rabbits and frogs really hop: they crouch, spring up off the ground with a shadow below, and land, instead of sliding along in one pose.
- Rabbits, squirrels, songbirds, hedgehogs and foxes sometimes rest in the shade under a tree, peeking out below the canopy beside the trunk, and startled rabbits, hedgehogs and foxes may dive under the trees.
- Creatures come in from the top and bottom of the view as well as the sides, each equally often (geese still cross sideways). Ducklings no longer cut across a building to catch up with their mother.
- In winter about half the houses hang twinkling Christmas lights: a string of colored bulbs swagged under the eave.

**v25** – Forest creatures.
- Wildlife now wanders the edge of the forest, just for atmosphere: you can't tap it and it changes nothing in the game. Creatures come in from the side of the view, appearing at the first tile you can see (never over the black beyond sight), and leave the same way, fading out at the edge of sight. Walkers cross the forest under the trees to wander and rest on open ground, never crossing a building; birds fly in and glide down to land, and butterflies flutter in.
- Spring: rabbits, squirrels, songbirds, butterflies in four colors, and frogs and a duck with her ducklings in a line by your Wells. Summer: the same without the ducks, plus fireflies glowing along the treeline. Autumn: squirrels carrying acorns, hedgehogs, foxes, and V's of geese crossing overhead. Winter is quieter: white hares, red cardinals and foxes, which leave fading footprints in the snow. A rare deer grazes at the treeline from spring to autumn.
- They're shy: when a villager comes close, rabbits, foxes, frogs and ducks scurry a few tiles off, birds take off, and squirrels and deer bolt off the side. When the season turns, those that don't belong head home.
- About 4–8 at a time, fewer in winter, and only where you can see. They move on real time, so speed boosts don't hurry them, and they're hidden when zoomed far out. No save change.

**v24** – Lucky Chest.
- A chest button in the map's top-right corner opens once every 10 minutes of real time. A ring counts down around it; once ready it turns gold, hops, glows and shines with turning rays, and a chime and message say so. The timer keeps running while the game is closed.
- Opening it plays a show: the chest drops onto the map and squashes as it lands, then rattles harder and harder while light leaks from its seam, flickering through the reward colors before it settles on the real one. The lid flies off with a flash, turning rays, a burst of coins and gems, a jolt of the map and a fanfare, and the reward rises out with its rank dropping in letter by letter. Tap to skip ahead or collect; the reward flies into the corner.
- Rewards and their odds: **Speed ×2** for 5 minutes (25%), **Speed ×3** for 4 minutes (18%), **Speed ×5** for 3 minutes (10%), **Mighty Taps ×10** for 3 minutes (15%), **Bountiful ×2** (villagers gather and walk twice as fast, seasons and upkeep unchanged) for 5 minutes (17%), and a **Windfall** of 15 minutes of every resource's income (15%). Ranks grow from Great (gold) through Super (blue) and Epic (purple) to Legendary (orange, cycling colors), and bigger ranks get more loot, faster rays and a longer fanfare.
- The reward is rolled from the game's seeded randomness when the chest opens, so reloading can't re-roll it. It is applied only as the lid flies off, so nothing gives it away early. A chest closed mid-show opens again to the same reward.
- While a boost runs, a badge under the chest shows it with its time left, and the map's edges glow in its rank's color. A boost keeps counting for the part of the time away it overlapped. Rebuilds keep the chest's timer and boost.
- Reduced-motion settings replace the show with a still reveal.
- Saves migrate to v21 with the chest ready to open.

**v23** – Tutorial.
- A new game starts with a coach card in the sidebar that walks through the early game in eight steps: chop, hire, grow to five villagers, build a House, a connected Farm, a Lumber Camp and its first axe upgrade, then find a relic and learn a skill.
- Each step finishes when its goal is met, and the button or counter it means pulses. The camera glides back to the Town Center for the first hire.
- **Skip tutorial** (two clicks) ends it for good. Progress is kept in the browser, not the save, so existing saves never see it.

**v22** – Pack mules.
- A Trading Post no longer takes a villager: it comes with its own pack mule, which loads gold, carries it to the nearest Market and walks back. It keeps to the roads (and across the Town Center or Outpost), taking another way only if the roads don't reach.
- The mule wears a red saddle blanket and carries gold-topped packs while loaded, with a gold tag over it when zoomed in. Gold per trip, Pack Mules and the Midsummer Fair work as before.
- A paused post, or one with no Market, keeps its mule waiting at home. A removed post's mule delivers what it carries, then leaves.
- Saves migrate to v20: traders go back to lumberjacking, and the gold they were carrying is banked.

**v21** – Tax collectors.
- A Tax Office now takes a villager as its tax collector, in a navy coat and top hat. Connected houses owe gold (0.2 gold/s each, up to 60 s of it) instead of paying it straight in, and the collector walks the roads house to house to fetch it. The gold counts only once the collector is back at the office, carrying it in a strongbox.
- Houses no longer need to be within 4 tiles of an office: the collector reaches any house it can walk to along the roads, the Town Center or the Outpost. A far house takes longer to reach, so a second office near it helps.
- **Satchel** (bought at the Tax Office): houses per round go from 1 to 2, 3 and 5.
- **Deputies** (Trade, after Tax Collectors): each Tax Office sends out a second collector. Collectors never head for the same house.
- The Tax Office panel shows its collectors, how much gold the houses owe, and the houses per round. It can be paused like a workplace.
- Saves migrate to v19 with the Satchel at level 0 and houses owing nothing.

**v20** – Achievements.
- 42 achievements with 100 tiers, and no rewards: ladders for gathering and the town (trees felled, each resource, taps, population, land, buildings, upgrades, relics, skill levels, winters, Guild Contracts, rebuilds), a first-building achievement for each building plus the first road, feats, and six secrets shown as ??? until earned.
- A toast drops in for each one with a confetti burst and the medal spinning into place; ladder toasts show the tier pips with the new one popping in. The bigger the achievement, the bigger the show: tier 1s are plain, later tiers and feats are gold with rays turning behind the medal, and tier 4+, a ladder's last tier and secrets ("Mastered!", "Secret found!") throw a second burst, flash the map gold, wobble, glow and stay longest. Reduced-motion settings turn the effects off. Tap a toast to open the list.
- Each toast plays a bell chime, synthesized in the browser with no sound files: two notes for rank 1, a rising run for rank 2, and a fanfare with a held chord and sparkles for rank 3. Toasts that appear together play only the biggest chime. Sound starts after your first tap or key press (a browser rule); the speaker button in the menu mutes it, remembered in this browser.
- Background music, generated as it plays so it never repeats the same way twice and synthesized with no audio files. Each season has its own chords, tempo, lead and ambience, all in C major so the chimes fit on top: spring is a kalimba with birdsong (C · G · Am · F, 72 bpm), summer is brighter and busier (Fmaj7 · C · G · Am, 84 bpm), autumn is slower and lower with a breeze (Am · F · C · G, 64 bpm), and winter is sparse glass bells over the wind (Am · Em · F · C, 54 bpm). It crossfades as the season turns, pauses while the tab is hidden, and the note button in the menu turns it off or on.
- The sidebar shows the achievement you are closest to, with a progress bar. **Achievements** in the menu lists every one by group, with tier pips and progress.
- Achievements and lifetime counters are kept across rebuilds. Gathering, trees, taps, relics and winters add up over all runs; population, land, buildings, upgrades and skill levels count your best run.
- Saves migrate to v18 with an empty record, and on first load you are quietly credited with everything you already qualify for.

**v19** – Building guide.
- A **Guide** button opens a list of every building: what it does, its size, workers, what it takes as a drop-off, and whether it needs a road. Locked buildings are dimmed and name the skill (and track) that unlocks them.
- Escape no longer cancels placing or road mode while any window is open (it already didn't for Skills).

**v18** – Later-game skills wait for their track; Felling Crews.
- **Felling Crews** (Forestry, after Teamwork): three villagers can work the same flagged tree. Unflagged trees still take two.
- Six skills are offered only once enough levels are learned in their track, on top of their parent: **Orchards** and **Greenhouses** (4 Farming), **Cotton Fields** (5 Herding), **Teamwork** (4 Forestry), **Tax Offices** (3 Trade) and **Guild Contracts** (5 Trade). Their lock text shows the progress, e.g. "Requires Tailoring and 5 levels in Herding (2/5)".
- Cotton Fields now sits under Tailoring rather than Sheep Farms.
- Saves load unchanged; skills already learned stay learned.

**v17** – Settlement and Trade skills, Frontier Outpost, Guild Contracts, Merchant Caravans.
- Settlement: Swift Feet → Big Baskets → **Errand Runners** (empty-handed villagers walk +25% per level), **Well Fed** (gathering ×1.2 while there are 10 food in stock per villager; a green badge on the plaque); → Roomy Houses → Recruiters, Master Builders → **Surveyors** (+1 road per house per level).
- Trade: Markets → Trading Posts → Pack Mules, **Toll Roads** (0.1 gold per road tile walked, per level); → Tax Offices → Tax Collectors, **Guild Contracts**; → Shrewd Traders → **Midsummer Fair** (all summer: no Market commission, Trading Posts ×1.5).
- Masteries:
  - **Frontier Outpost** (Settlement): unlocks one Outpost, a second hub that takes every resource, hires villagers and roots its own road network. Houses and Markets can be built against it.
  - **Merchant Caravans** (Trade): as winter begins a caravan offers three deals (buy a resource at half its value, or sell one at double, sized to about 10 minutes of production). One may be taken; it leaves at spring.
- **Guild Contracts**: three contracts sized to 3–6 minutes of the town's average production; each pays the market value of what it asks for, and a new one replaces it when claimed.
- Saves migrate from v16 with an empty contract board and no caravan.
- Every skill in a track has its own icon (29 new ones), and the Outpost has a sprite: a stockade with a watchtower.

**v16** – Tailor, skill graph, Forestry, Farming, Herding and Mining skills.
- Twenty new skills, each changing a rule rather than a number. Bonuses, jackpots and combos show as text rising from the map, and the HUD counts their goods under **Skill bonuses**:
  - Forestry: **Sweeping Strike** (a tap also hits the choppable trees around it for half), **Momentum** (taps under 1 s apart build a combo, +10% each, up to +50% per level), **Keen Eyes** (see 1 more ring into the forest and relics come 10% sooner, per level), **Heartwood** (10% chance per level that a felled tree pays half its wood again).
  - Farming: **Crop Rotation** (+25% harvest per touching farm, up to +100%), **Farmhands** (+1 farmer per farm per level), **Root Cellars** (food upkeep −15% per level), **Greenhouses** (farms and orchards harvest at half speed in winter).
- **Masteries** cap a track and are offered once 8 levels are learned in the rest of it. They sit under the track with a gold ring:
  - **Timber!** (Forestry): a felled tree topples onto a neighbouring tree for half its wood, and falls can chain.
  - **Harvest Festival** (Farming): as winter begins, farms and orchards deliver a minute of autumn harvest at once, and villagers walk ×1.25 all winter.
  - **Grazing Flocks** (Herding): each Sheep Farm grazes the visible trees within 4 tiles, nearest first, as fast as 3 lumberjacks.
  - **Dynamite** (Mining): a Blast button on the Quarry pays 30 s of its stone at once and hits every tree within 2 tiles like 100 taps; once per 90 s per quarry.
  - Grazing and blasts damage trees rather than felling them, so the big outer trees still take their full wood.
- Forestry: Sharp Axes → Power Swing → Sweeping Strike, Momentum; → Camp Crews → Teamwork; → Keen Eyes → Heartwood. Farming: Green Thumbs → Wells → Deep Wells, Crop Rotation; → Farmhands → Orchards; → Root Cellars → Greenhouses.
- Herding: Sheep Farms → **Open Pastures** (+1% wool per level per open grass tile within 2 tiles) → **Shearing Day** (a minute of wool as spring begins); → Fertile Herding → **Golden Fleece** (3% chance per level a delivery is worth 10× the cloth); → Tailoring → **Weavers** (+4% cloth per Tailor upgrade level); → Cotton Fields.
- Mining: Quarrying → Stonecutters → Quarry Crews, **Deep Shafts** (mining ×1.5 in winter, never slowed by cold); → Masons → **Cobblestone** (+20% walk speed along roads per level); → **Rich Veins** (+2% stone per level per tile from the Town Center, up to 30) → **Geodes** (2% chance per level a delivery brings 25 gold per stone).
- Skill tracks are trees instead of chains: a skill can unlock several others, and false dependencies are gone (Trading Posts no longer waits on Tax Collectors, Orchards on Deep Wells, Cotton Fields on Fertile Herding). Six tracks, one per economy:
  - Forestry, Farming, Herding and Mining: see the new skills above.
  - Settlement (was Villagers and Buildings): Swift Feet → Big Baskets, and → Roomy Houses → Recruiters, Master Builders.
  - Trade: Markets → Trading Posts → Pack Mules, → Tax Offices → Tax Collectors, and → Shrewd Traders.
- The skill tree fills the window and can be panned (drag or swipe) and zoomed (wheel, pinch, or the corner buttons). A skill's stats show in a popup beside it on hover or tap, in place of the side panel; on phones an offered skill is learned with a second tap. Saves are unchanged.
- New **Tailor** building (2×2, wood and cloth), unlocked by the new **Tailoring** skill in the Herding track, between Sheep Farms and Fertile Herding.
- The Wheelbarrow is split in two at the Tailor: **Shoes** (walk speed ×1.05 per level) and **Backpack** (+2 flat carry per level). Each costs about two thirds of the old track, with cloth from the first level.
- **Coats** moved from the Town Center to the Tailor. The Town Center now only hires villagers.
- Saves migrate from v15 with Shoes and Backpack both at the old Wheelbarrow level, so stats are unchanged. Further levels need a Tailor.

**v15** – Legacy (prestige).
- Learn 15 skill levels to unlock a **rebuild**. Rebuilding starts a new run on a new map and wipes buildings, villagers, resources and skills. You keep your Legacy perks. Each rebuild raises the requirement by 5 levels, up to every skill maxed.
- Each rebuild takes one perk from the Legacy tree and adds 10 starting roads. The tree starts with Master Harvest (villagers gather ×3) and Swift & Strong (walk ×3, carry ×3), then forks:
  - City: Urban Core (base population 20, villagers −50%, 10×10 starting clearing), then Prosperous City (buildings −50%, start with 10 villagers who need no food or firewood).
  - Commerce: Trade Guilds (lumberjacks chop ×2, and each profession speeds up with its headcount, toward +300%), then Royal Bank (tax and trade gold ×3, half the market commission).
- Both branches lead to Relic Hunters (relics twice as often, one more skill per pick). After that, Legacy ×2 (every gather rate ×2) can be taken at every rebuild.
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

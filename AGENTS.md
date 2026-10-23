# Repository Guidelines

## Project Structure & Module Organization
This is an idle forest-clearing game built with Vite and TypeScript, with no runtime dependencies.
- `src/core/`: DOM-free simulation, state, commands, economy, pathfinding, and saves; worker logic lives in `systems/`.
- `src/render/`: canvas rendering, camera, sprite grids, and sprite baking.
- `src/ui/` and `src/input/`: interface and pointer controls; `src/main.ts` wires the game loop and autosave.
- `src/config.ts`: gameplay tunables; `src/style.css`: visual styling.
- `src/assets/fonts/`: bundled Silkscreen fonts and license.
- `tests/`: Vitest suites and shared helpers.
- `docs/MECHANICS.md`: reference mechanics; `dist/`: generated build output, excluded from Git.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Vite, normally at `http://localhost:5173`.
- `npm run typecheck`: check source and tests with strict TypeScript rules.
- `npm test`: run all Vitest tests once.
- `npx vitest run tests/stone.test.ts`: run one suite.
- `npm run build`: typecheck and generate `dist/`.
- `npm run preview`: serve the production build locally.

## Coding Style & Naming Conventions
Use two-space indentation, single-quoted strings, and semicolons. Follow existing camelCase function, variable, and module names, PascalCase types, and uppercase constants. Use type-only imports where appropriate. TypeScript rejects unused locals and parameters. No formatter or linter is configured.

Keep core randomness seeded through `rand(s)`; never use `Math.random` in simulation code. Route UI actions through validated functions in `src/core/commands.ts`. Read effective production values through `getStats(s)`.

## Testing Guidelines
Name suites `tests/<feature>.test.ts` and use descriptive `describe`/`it` cases. Reuse `smallWorld` and `clearArea` from `tests/helpers.ts`. No coverage threshold is configured. For simulation changes, check determinism, resource conservation, and equivalent behavior with live and offline timestep sizes. Persistent state changes require a save version bump, migration, and migration test. Run tests and the build before submitting.

## Commit & Pull Request Guidelines
History uses short, descriptive subjects such as `Skill choice popup` and `Alpha v5: stone, quarries, wells`; follow that style. Pull requests should explain the behavior change, link relevant issues, and report validation commands. Include screenshots for visual changes. Keep README Controls, Layout, and Changelog current when affected; add a changelog entry for each version.

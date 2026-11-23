# city-sim - the city builder

The game at https://peeps.land: found a city, build from the catalogue, lay
roads, shape the ground. Only this game's own part lives here: its start-up,
screens, saves server, ground shaping, border, deploy. How the world works
(buildings going up and coming down, traffic, painting, city generation) is
isometrica's: look there, and put such changes there.

## Where things are

- `src/main.jsx` starts it. `src/game.js` - what the game is (tick length,
  save keys `city-sim.v1.*`, the `/api` server).
- `src/play.js` - its part of isometrica's client: ground shaping, the city
  border, the town's limits. `src/client/` - those: `terrainman.js` (the
  terrain mode), `cityborder.js`, `cityarea.js`, `pace.js` (how often the
  world is drawn).
- `src/initialcity.js` (Peepsville, a new player's city), `src/peepstown.js`
  (the big one, isometrica's `data/initialcity`).
- `src/ui/` - React + Tailwind (`app.css`), routes in `router.jsx` (`/<id>`,
  `/<id>/catalogue[/<code>]`, `/<id>/city`):
  - `session.js` puts the world together and opens the city in the address
    (`startGenerated` for generated cities).
  - `bridge.js` + `store.js` (zustand) - what isometrica's client says
    through the `ui` it was handed, for the screens to read.
  - `world/` - `GameScreen.jsx`, `Hud.jsx` (top bar and menu, 26 KB),
    `WorldHud.jsx` (bottom buttons), `Splash.jsx`, `Welcome.jsx`,
    `Prompt.jsx`, `UpdateReady.jsx`, `DebugPanel.jsx`, `WorldMap.jsx`.
  - `catalogue/`, `city/` (the city screen), `kit.jsx` (layout and
    controls), `install.js` (home screen), `updates.js` (new release).
  - `icons/` - generated (see below), denied for reading.
- `worker/` - the Cloudflare Worker: serves the build and `/api/cities/<id>`
  (`saves.js`, a Durable Object per city). Merging clashing saves is
  isometrica's `core/persistence/citysync.js`.
- `public/sw.js` (Service Worker, offline), `public/manifest.webmanifest`.
- `tools/` - `precache.js` (the build writes the file list into sw.js),
  `genlogo.js` (logo and home-screen icons), `icons.js` + `genicons.js` (UI
  icons → `src/ui/icons/`).

City generation itself is isometrica's `src/citygen`: skill `citygen` in
`isometrica/.claude/skills/citygen`. Here are only the menu rows that start
it (`Hud.jsx`) and `session.js startGenerated`.

## Commands (here, or `-w city-sim` at the root)

- `npm run dev` - Vite, saves in the browser only.
- `npm run build` - into `dist/`, isometrica built first.
- `npm run dev:worker` - built and served by the Worker with its saves,
  http://localhost:8787
- `npm run generate:logo`, `npm run generate:icons` - write checked-in files.
- Deploy: `.github/workflows/city-sim.yml`.

## Docs

`README.md` - what the player sees and how it is put together (grep it).
`docs/` - the design (`README.md`), `cities.md`, `economy.md`,
`multiplayer.md`, `references.md`.

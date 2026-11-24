---
name: ui
description: city-sim's own side - its React screens (HUD, bottom bar and card, catalogue and Replace, splash, welcome, city screen, debug panel, world map), how isometrica's client talks to them (bridge, zustand store), its border and ground shaping, offline play (Service Worker, precache, updates, install), the saves Worker, its icons and logo. Load before changing city-sim/src, worker, public/sw.js or tools.
---

# city-sim: screens, offline, saves

The world is isometrica's; city-sim puts its own part into isometrica's
client (`src/play.js`) and its screens over the world. How buildings, roads,
traffic or painting behave is isometrica's skills (buildings, generators,
traffic...) - change those there, not here.

## Where

- `src/main.jsx` starts it; `src/game.js` - what the game is: five minutes a
  tick, saves under `city-sim.v1.*` in localStorage and on the server at
  `/api`, catching up while away (catchUp).
- `src/play.js` - its part of isometrica's client: ground shaping, the city
  border, the town's limits. `src/client/`: `terrainman.js` (the terrain
  mode), `cityborder.js` + `cityarea.js` (the border), `pace.js` (fewer frames
  while less goes on).
- `src/ui/` - React + Tailwind (`app.css`), routes (`router.jsx`): `/<id>`
  the world, `/<id>/catalogue[/<code>]`, `/<id>/city`, `/<id>/replace/<tile>`.
  - `session.js` - puts the world together once (engine, isometrica's
    client, `play.js`, the city opened), draws it into `WorldCanvas`;
    `startGenerated` for generated cities. `?worker=on` runs the world on a
    worker (isometrica `client/host` OnWorker; its skill `buildings`,
    server.md), in the page otherwise.
  - `bridge.js` + `store.js` - isometrica's client tells the screens what to
    show through the `ui` it was handed (`ui.gameScreen().worldScreen()`: a
    hint, the buttons of what it is doing, a word asked for, the world given
    back); the bridge puts that into the zustand store the screens read.
  - `kit.jsx` - LayeredLayout, Container, Icon, buttons, screens.
  - `world/` - `GameScreen.jsx`, `Hud.jsx`, `WorldHud.jsx`, `Splash.jsx`,
    `Welcome.jsx`, `Prompt.jsx`, `UpdateReady.jsx`, `DebugPanel.jsx`,
    `WorldMap.jsx`, `worldaction.js`.
  - `catalogue/` (`Catalogue.jsx`, `Building.jsx`, `Preview.jsx`,
    `buildings.js`), `city/` (`CityScreen.jsx`, `stats.js`).
  - `install.js`, `updates.js` - home screen, new releases.
  - `icons/` - generated, do not edit (denied for reading).
- `src/initialcity.js` (Peepsville), `src/peepstown.js` (isometrica's
  `data/initialcity`, Peepstown here) - saves opened under a fresh id.
- `worker/` - the Cloudflare Worker: the build, and `/api/cities/<id>`
  (`saves.js`).
- `public/sw.js`, `public/manifest.webmanifest`; `tools/` (precache, icons,
  logo).

## Must hold

- Over the world nothing takes a click unless it says so: the layer over it
  is `pointer-events-none`, anything clickable `pointer-events-auto`.
- The screens read the store; isometrica's client never imports React or
  city-sim - it only calls the `ui` it was handed.
- Every address is the page: the Worker serves `index.html` for any it has
  no file for (`wrangler.jsonc` not_found_handling); `<base href="/">` has
  isometrica's `gfx/` fetched from the top.
- The Service Worker keeps one build whole; `sw.js` must keep
  `var BUILT = null;` for `tools/precache.js` to fill (the build fails
  without it). `/api` is never cached.
- Generated files (`src/ui/icons/`, `public/logo.png`, `public/icons/`) are
  written by their tools and checked in; change the tool, run it again.

## Testing

- `npm run dev` (saves in the browser only), `npm run build`,
  `npm run dev:worker` (built, served by the Worker with saves,
  http://localhost:8787).
- `?debug=on` or the menu's Debug panel; the HUD's map button.
- Deploy: `.github/workflows/city-sim.yml` - `prod` (https://peeps.land)
  from a `city-sim/vX.Y.Z` tag, `dev` (https://dev.peeps.land) from main,
  previews from other branches, each with saves of its own.

## More

- [screens.md](screens.md) - what each screen shows and does.
- [offline-and-saves.md](offline-and-saves.md) - Service Worker, precache,
  updates, install, the saves API.
- [icons-and-logo.md](icons-and-logo.md) - drawing icons, painting the logo.

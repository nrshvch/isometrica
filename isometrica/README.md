# isometrica

The world the games are played in (`city-sim`, `food-rider`): the terrain,
what stands where - buildings, roads, the surfaces they stand on - the
traffic on the roads, the light it is all drawn in, and the generators that
paint every picture of it. It has no game of its own and no screens: a game
starts it up and puts its own over it (see the games' `src/main.js`).

- `src/core` - the world itself: terrain, the climate (`climate.js`, see the
  generators skill), buildings and roads, cities, the clock, saves.
- `src/client` - the world on screen: chunks streamed in round the camera,
  building and road views, traffic (`traffic.js`, `carman.js`), the WebGL
  renderer and lighting (`glview.js`, `lighting.js`), the sprite cache and
  the generator worker (`generator.js`).
- `src/shared/gen` - the generators: ground, roads, buildings, trees,
  vehicles, stones, smoke - everything there is to see; nothing is drawn by
  hand - and the sounds and the music (`sounds.js`, `music.js`, see the
  sound skill), which share what they are made with (`dsp.js`).
- `src/data` - what can stand in the world, and the city both games start
  on (`initialcity.js`).
- `src/citygen` - cities generated afresh out of a seed: a small town, a
  city of Peepstown's size or Peepsopolis, built up all of it somewhere in
  the world, as a save a game starts a new city on (`index.js` generate; see
  [generated cities](../city-sim/docs/cities.md#generated-cities); the
  engineering notes for working on it are the `citygen` Claude skill,
  `isometrica/.claude/skills/citygen`) - and the city bench to look at them on (see
  Benches).
- `npm run build` writes `dist/gfx`: the manifests of what every generator
  will paint.
- `vite.mjs` - the Vite plugin a game uses to serve and ship `dist/gfx`.
- `docs/performance.md` - where a frame, a click and a tick go, the debug
  panel that shows it, and what is left to make faster.
- `lab/` - pages to look at the world without a game: `npm run dev` here
  opens them all from `/` - every sprite the generators paint, lit or at
  night, at `/sprites.html`, the sounds to listen to at `/sounds.html`, the
  music at `/music.html`, the woods map at `/woods.html`, the traffic
  testbed at `/traffic.html`, the building bench at `/buildings.html`, the
  demolition bench at `/demolition.html`, the replacement bench at
  `/replace.html` - a building put up in the place of itself, another look
  of it, or of whatever else covers its ground, coming down and going up
  again the game's way, its site as fast as asked - the explosion bench at
  `/explosion.html` - a building blown up, pieces torn off it in a
  fireball and the rest of it coming down a tile at a time, dust hanging
  over it, its rubble left lying till the bulldozers clear it and its
  yard wrecked; or two of it side by side, a pile each, on the flat or on
  a slope; or with its neighbours round it, the blast bringing down the
  ones next to it and across the road and knocking about the one further
  off -
  the fire bench at `/fire.html` - a building set on fire, spreading
  floor by floor and tile by tile, black smoke rolling up off it, and left
  gutted, a roofless shell or fallen in, by what it is built of, a
  burnt-out ruin, a day of it as fast as asked, by day or at night - the
  climate bench at `/climate.html` - every zone of the climate on one
  island, how each gives way to the next, the water freezing over - the
  city bench at `/cities.html`, and the lighting bench at `/lighting.html`. Everything is painted and
  played in the page, nothing made beforehand.
  Each page is an HTML file that mounts a React component - its folder
  holds it and whatever the page works with (`sprites/` the gallery and its
  painting workers, `woods/` the map, `lighting/` the bench...) - styled
  with Tailwind; what they share is in `lab/ui` (the look in `lab.css`, the
  buttons and fields in `kit.jsx`, the list of pages in `pages.js`).
  `npm run build:lab` builds them into `lab/dist`, and
  `.github/workflows/isometrica.yml` puts that up on Cloudflare Workers
  (`wrangler.jsonc`): a `lab/vX.Y.Z` tag → the `isometrica-lab` Worker,
  main → `isometrica-lab-dev`, any other branch → a Preview of it,
  `https://<branch>-isometrica-lab-dev.<subdomain>.workers.dev`.

A game depends on it by path (`"isometrica": "file:../isometrica"`) and
imports its modules as `isometrica/<path under src>`, e.g.
`isometrica/client/main`, `isometrica/core/terrain`. It is drawn with the
engine in `engine/`.

### How each part works

Written down for working on it, as Claude skills in `.claude/skills/` - a
`SKILL.md` each, and the notes it points to:

- [buildings](.claude/skills/buildings/SKILL.md) - buildings and roads going
  up and coming down: building sites, clearing ground, roads being laid,
  surfaces, demolition, blasts, fire, ruins and rubble; and the city they
  make - its area and road network, people, jobs, water, saves.
- [citygen](.claude/skills/citygen/SKILL.md) - cities generated afresh.
- [traffic](.claude/skills/traffic/SKILL.md) - how the traffic drives: lanes,
  junctions, routes, one-way roads, roundabouts, buses; how many cars and
  why; the traffic testbed and `npm run test:traffic`.
- [rendering](.claude/skills/rendering/SKILL.md) - how the world is drawn:
  the WebGL renderer and its light - the sun, shadows, the night's lamps and
  windows - the weather, the wind, the sea, the camera turning and zooming,
  and what is drawn over the city.
- [generators](.claude/skills/generators/SKILL.md) - how every picture is
  painted: the painting worker and the manifests, buildings out of boxes,
  the ground and the climate's zones, trees, stones, roads, vehicles, smoke.
- [sound](.claude/skills/sound/SKILL.md) - the sounds and the music, made
  from numbers, and what the game plays when.

### Benches

- `lab/buildings.html` (`npm run dev` here, or the lab deployed) is the
  building bench, a unit test of a building coming down: the game's own
  drawing and nothing else (`lab/bench/stage.js` - its engine, pictures,
  light and camera, over ground of its own laid flat the way a save lays
  it, `src/core/terrain.js` load: no world ticking, no city, no
  bulldozers), a patch of grass two tiles wider than the building all
  round, and one building of any kind on it, whole, put together out of its
  parts the way the game puts it together (`lab/buildings/stand.js`).
  "random" gives it another look, "any" picks any building, it turns on its
  ground; "demolish" brings it down the way it comes down in the game - the
  game's own `Demolition` (`src/client/demolition.js`), fenced off and every
  tile of it told to come down at once - and "restore" puts it back up.
- `lab/demolition.html` is the demolition bench: the game's own client and
  world out in the open sea (`lab/bench/world.js`), of all of it only its
  own patch of flat grass drawn, a city of nobody on it, no traffic; a few
  buildings, trees planted and a road along them
  (`lab/demolition/scene.js`). "destroy" clears it all the way the game
  clears ground - fenced off, the bulldozers coming, a building coming down
  a tile at a time as they get to it, the trees going over, the road broken
  up, one price floated over the lot - "reset" puts it up again once they
  are done, and "again" does both.
- Both go as fast as asked, down to a tenth, or stopped, at ten in the
  morning in clear weather, nothing saved or heard, and turn round or are
  seen from above. `window.bench` in the console. Their ground is as warm
  as the green of the world (`src/core/climate.js` setHeat), wherever the
  world's own climate would have it: grass.
- `lab/climate.html` is the climate bench: every zone of the climate on one
  island, on the same world as the demolition bench (`lab/climate/
scene.js`) - the desert at one end, then the savannah, the green and the
  arctic, the north at the other, each a stretch of it as long as the others,
  its temperatures from its one edge to its other spread along it: what the
  world spreads over thousands of tiles pressed into a dozen or so, the bench
  laying the climate out its own way (setHeat), so that every border can be
  seen at once - the zones mixed in patches, the ground of the one spilling
  over the edges of the other. A river winds
  from one end to the other through every zone, deep in its middle, and the
  sea is all round, so every zone has its shore: a sand beach, and out in
  the cold the water frozen over, the ice closing over open water from its
  edges, frost for a beach. Hills stand in every zone for its ground on the
  slopes, and the trees and the stones are the ones the world puts there by
  itself: the savannah's cacti and dried-out trees, the woods of the green,
  the snowy firs and pines, the pines dying off, then the firs, then only
  dead trunks, and in the desert and the north nothing. Warmer or colder moves every zone along it;
  it turns, is seen from above, and goes nearer or further - "all" the
  whole island.
- `lab/cities.html` is the city bench, for how a generated city
  (`src/citygen`) is laid out and nothing else: the bench's own world
  (`lab/bench/world.js`), a patch of flat grass as big as the window the city
  was planned in, and the city generated on ground as flat as that - no
  water, no hills (generate's `flat`) - put up as a save would have it, its
  roads laid in what they are laid in and going the way they go, every
  building facing its street (`lab/cities/scene.js`). A small town, a city of
  Peepstown's size or Peepsopolis; a small town's layout - along a road,
  round a crossroads, a tee or a green - or any; the seed, the one before,
  the one after or any - each a new city in the place of the last at once,
  the size and the seed kept in the address (`#size=city&seed=7`). Down the
  side, how it came out: its blocks, squares and roundabouts, its roads by
  what they are laid in and how many go one way, its buildings by kind, and
  how long it took to generate and to put up. Nobody lives in it and no
  traffic drives it. While a city is put up or taken down a building at a
  time, the roads are drawn plain and only work out their pieces once at
  the end: each building would have the roads by it ask whether they are
  the city's streets, worked out for the whole city every time.
- `npm run test:cities` (`tools/citytest.mjs`) generates cities headless -
  twelve of every size, `--size=town,city,metropolis` `--seed=N --seeds=N`
  for which, `--at=x,y` for where about - and says how each came out, and
  fails if anything in one is not the way the game wants it: roads side by
  side that do not meet, a part of the roads the traffic cannot get to
  (`lab/cities/check.js` drivable), and, the city opened in the world as a
  game opens it, every building asked what it goes without, as the game asks
  it over the world (`src/client/worth.js` wantOf) - cut off, no road, no
  water. `--map` draws each in letters (`lab/cities/check.js` map: `#`
  asphalt, `%` cobbles, `:` gravel, arrows one way, `~` water; the buildings
  by what they are, the tile each stands on in capitals).

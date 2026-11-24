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
  `isometrica/.claude/skills/citygen`) - and the city bench to look at them on.
- `npm run build` writes `dist/gfx`: the manifests of what every generator
  will paint.
- `vite.mjs` - the Vite plugin a game uses to serve and ship `dist/gfx`.
- `docs/performance.md` - where a frame, a click and a tick go, the debug
  panel that shows it, and what is left to make faster.
- `lab/` - pages to look at the world without a game: `npm run dev` here
  opens them all from `/` - every sprite the generators paint, the sounds
  and the music, the woods map, the traffic testbed, and the benches that
  run the game's own client: a building, demolition, replacement, explosion,
  fire, the climate, generated cities, the lighting. `npm run build:lab`
  builds them into `lab/dist`, deployed to Cloudflare Workers (see the lab
  skill).

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
- [lab](.claude/skills/lab/SKILL.md) - the lab's pages and benches, how to
  add one, and how the lab is built and deployed.

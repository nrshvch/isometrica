---
name: buildings
description: Buildings and roads going up and coming down - sites, clearing and bulldozers, roadworks, surfaces, demolition, blasts and health, fire, ruins, rubble, replace - and the city they make (area, road network, people, jobs, water, saves); the core's one clock, seeded chance, names that last and commands, and test:core; the world as a local server (core/server, mirror, serve, client/host, in the page or on a worker). Load before changing core/city*, core/building*, core/logic, core/commands, core/construction, core/server, core/mirror, client/host, client/buildman, demolition, explosion, fires, clearworks or roadworks.
---

# Buildings and the city

The world (`core/`) decides what stands, what state it is in and what is
saved; the client (`client/`) draws it going up and coming down. Everything
that plays out over time is worked out from the game's time and a start kept
in the save, so a reload lands where it would have been. The bulldozers are
the world's records (`core/works.js`), saved and brought up to date; what is
only drawn - crews, debris, dust, a demolition's falling floors - is never
saved.

## Where

`isometrica/src/` unless a path says otherwise:

- `core/city.js` - every change to a city: `clearTile` (demolish, clear
  ground), `tileDown`, `replace`, `blast` / `explode` / `hit`, `fireUp`,
  `terraform`, `quoteFounding`. Hub: read in ranges.
- `core/city/` - `citybuildings.js` (buildBuilding, save rows),
  `cityroads.js` (area, network, cut off), `citypopulation.js`,
  `cityjobs.js`, `citywater.js`, `citystats.js`.
- `core/building.js` - one building: `fire`, `health`, `down`, `yards`,
  `smoke`, `demolishing`, `ignite` / `burn` (BURNS, REMAINS, SMOULDERS),
  `damage`, `hazards`, `fallsLater`. `core/burning.js` - what it burns down
  to. `core/construction.js` - going up, `awaitClearing`.
  `core/replacement.js` - what may go up in its place and turned which way.
- `core/works.js` - the bulldozers as records: clearing, sweeping a site,
  bringing a demolition down a tile at a time; stepped, saved, caught up.
- `core/surface.js`, `core/rotation.js`, `core/terrain.js` (`beingCleared`,
  `REGROWS`, `bareFor`), `core/persistence/` (saves).
- `core/logic.js` (the clock: `advance`, ticks, `catchUp`, `away`; `chance`,
  `name`, `command`), `core/commands.js` (what the player does, as plain
  objects).
- `core/server.js`, `core/mirror.js`, `core/serve.js`, `client/host.js`,
  `client/server.worker.js` - the world as a local server: commands in,
  frames out, a copy the client reads (server.md).
- `client/buildman.js` - building views and their lifecycle on screen
  (`found`, `hold`, `demolitionOf`, `onDemolish`, `explode`, `fireUp`,
  `replace`, `showConstructionCost`). Hub: read in ranges.
- Going up: `client/buildingview.js` (addFoundations),
  `compoundbuilding.js` (parts, sites), `siterenderer.js`, `worklights.js`,
  `roadworks.js`, `roadman.js`, `roadview.js`.
- Coming down: `client/clearworks.js`, `felling.js`, `demolition.js`,
  `explosion.js`, `collapse.js`, `fires.js`, `ruin.js`, `burnt.js`,
  `rubble.js`, `yards.js`.
- Painting they use: `shared/gen/sites.js`, `foundations.js`, `stones.js`
  (rubble, pile), `smoke.js` (dust, debris), `trees.js` (FALLS),
  `vehicles.js` (bulldozer, excavator, lorry), `isobox.js` (setRuin).
- Words over the world: `client/serviceman.js`, `client/worth.js`.

## Must hold

- core stays headless: nothing in `core/` imports the client nor reaches for
  a browser, and it goes on in node (`npm run test:core`; core.md).
- One clock: what plays out over time goes by `Logic#clock` (or the game's
  time it ticks), never `Date.now`; chance in the world by `Logic#chance`,
  never `Math.random`; what the player does by a command, through the
  host (core.md) - the client never writes to the world itself
  (server.md).
- Being demolished, a building is the bulldozers' alone: no blast, no fire,
  no hazards; a fire on it is put out; only Replace and Demolish offered.
- A building put up waits for its ground to be cleared (at most a tenth of
  the way up till then); one put up by Replace starts on cleared ground.
- Saved: the world's `seed` and last name given (`named`); a building's `id`,
  `fire`, `health`, `smoke`, `down`, `yards`,
  `demolishing`, `surface`, `look`; the terrain's `bareFor`; the bulldozers
  out and the tiles waiting for them (`works`). Not saved: the city's area
  and network (worked out again), anything only drawn.
- What a bulldozer does - a tile cleared, a tile of a building down - is
  done by its record (`core/works`), seen or not; a view may only say how
  long what it shows takes.
- A surface: flat for a building, flat or a ramp for a road; concrete under
  it a step deep at most, never under the ground, never in the water, flat
  on the shore. Roads join only where they meet level.
- Turning the camera, whatever is coming down is down at once.

## Testing

- Lab benches (`npm run dev -w isometrica`): `/buildings.html`,
  `/demolition.html`, `/replace.html`, `/explosion.html`, `/fire.html`, all
  on `lab/bench/world.js` - the game's own way, time as fast as asked.
- `npm run test:cities` opens generated cities in the real core (cut off,
  wants, network). `npm run test:core` plays one in node, twice the same,
  and over the protocol (in this thread, and on a worker thread).
- In the game: city-sim, tap a building - Replace, Demolish, Blow up, Fire up.

## More

- [going-up.md](going-up.md) - sites, clearing and the bulldozers as
  records (core/works), roads being laid, surfaces,
  shaping the ground, work lights.
- [coming-down.md](coming-down.md) - demolition, blasts, collapse, fire,
  ruins and rubble, health.
- [core.md](core.md) - the core in node: one clock, seeded chance, names
  that last, commands; `test:core`.
- [server.md](server.md) - the world as a local server: the host in the
  page or on a worker, frames, the copy the client reads; `world:worker`.
- [city.md](city.md) - founding, area and network, people, jobs, water,
  services, catching up, the clock, saves.

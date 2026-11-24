# The traffic as agents: by region and tier

The game's cars are records kept by region and stepped by one system, not
game objects that tick themselves; a car's game object is only its view.
The libraries are `shared/` (skill `world` there): `shared/interest` for the
levels, `shared/schedule` for the tiers, `shared/typed` Store and
`shared/spatial` GridIndex for the cars by region. The testbed and
`tools/traffictest.mjs` do not go through any of this - they drive `Traffic`
and `Driver` themselves, and must give the same output to the byte.

## The records (`client/carman.js`)

- `CarAgent` - a car: its `Driver` (`client/traffic.js`) and what it is out
  for (purpose, route choice, lost, breakdowns, bus rounds, leaving). Kept as
  objects, not columns: the driver's way (waypoints, junctions granted,
  overtaking) and the agent's errand are lists and links that every part of
  `traffic.js` reads off neighbouring drivers; moving them to columns would
  touch all of it for little, and the testbed runs that same code.
- `Carman.store` - a row a car: its region (key), the traffic clock at its
  last step (`at`), the frame it was last stepped (`stamp`); `bySlot` the
  agent by its row; `index`, a GridIndex of cars by the tile they are on,
  cells a chunk across, so a region's cars are one cell (`carsIn`).
- `Carman.agents` - every car, awake or asleep, for saving and for sound;
  `Carman.cars` - the views there are, for lighting and the preloader.

## Regions and tiers

- Regions are the chunks, the leaves of tilesman's quadtree
  (`Tilesman#regionOf`); levels are its `Interest`, which has a coarse ring
  for the traffic (entered three chunks beyond the view, left beyond four;
  rendering, chunks.md). `Tilesman#listen` tells carman of every level
  change (`levelChanged`), and once of every level there is already.
- VIEW and NEAR: FULL - every frame, `Driver` steps of 50 ms, smoke, lamps.
  COARSE: every 250 ms (`COARSE_EVERY`), steps of 100 ms (`COARSE_STEP`,
  `Driver#update`'s `most`), no smoke, within 1 ms a frame (`COARSE_BUDGET`,
  the scheduler's budget). Below: DORMANT - not stepped at all.
- `stepRegion` is the scheduler's one system: each car of the region by the
  time since its own last step, once a frame however many regions it drives
  through (`stamp`), then `track`: its tile into the index, asleep if its
  region is dormant, a view if it is in view, none if not.
- Asleep: `Traffic#sleep` takes the driver out of `traffic.drivers` (nothing
  sees it or waits on it, its junctions let go of); `Traffic#wake` puts it
  back. Waking, `CarAgent#advance(ms)` brings what it was waiting out up to
  date - a breakdown, a bus's stand, fading away - and its driving takes up
  where it stopped; it is not played over.
- Views (`Car`, a game object with a `VehicleRenderer`, nothing ticking) are
  made as a car's region comes into view or the car drives into one, let go
  of as it leaves, and put where the car is once a frame (`CarAgent#place`).
  `orient` (indicators, brake lights) only while it has one.

## Roads and how many

- The traffic drives on the core's roads (`client/coreroads.js`): every
  finished road in the world, loaded or not, as `traffic.js` reads a road
  (`data` the core model, `typeCode` its ramp or flat, `surface()`), so a car
  out of sight drives on and nothing is taken off for a chunk let go of.
- How many: as many as the city's road tiles in the chunks drawn call for -
  the core's (`CityRoads#networkTiles`, sorted by region in
  `CoreRoads#cityTiles`) in `tilesman.list` - counted against the cars in
  those regions (`counted`, `Carman.out`); new ones are put on there.
  Destinations are there too, so a car that wanders off heads back in.
  What is found in the chunks drawn is kept a couple of seconds, and found
  again at once when one is drawn or let go of (`Tilesman#version`):
  counted against the roads of where the camera was, a town come back to
  would lose its cars to the rule that takes off more than the roads take.
- Panning away and back finds the same cars: those left behind go coarse,
  then asleep where they were, and wake as the camera comes back. The cars
  of every region visited stay, asleep.

## Kept

By the save's regions (skill `buildings`, saves.md), not the chunks: a
car's in its row (`kept`), marked whenever it is stepped, put down or taken
off - so `Carman#save` (every 5 s, when the page has a moment) writes only
the regions whose cars drove, never those asleep. A region's cars are a
frame (`shared/replica`): a car's numbers, the rest JSON, its way packed.
Restored all at once, waiting for their roads; a save of before (one row of
every car) is put back and kept by region from then on.

## Measuring

`npm run world:traffic` (`tools/world/traffic.mjs`, docs/world.md
Measuring): the same cars after going away and back, and what the traffic
costs a frame over the town, beside it, away and far out. The debug panel:
`traffic: full|coarse|views` and the counters `cars`, `cars awake`, `cars
stepped`, `cars stepped coarse`, `car views`.

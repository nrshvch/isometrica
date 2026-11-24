# Saving a region at a time

Step 8 of `docs/world.md`: a city's save is a small header and a record a
region, and a save writes only the regions changed since the last. The
whole save - what the server keeps, what `CityPersistence#snapshot` makes,
what `data/initialcity` and citygen are - is the two put together, the same
to the byte.

## Where

- `core/persistence/regions.js` - the regions (`regionOf`, `regionOfTile`:
  a quadtree's leaves 24 tiles across, the root every tile there can be -
  the chunks of a big screen, whatever the screen), a region's frame
  (`encode`, `decode`), the whole save taken apart and put together
  (`split`, `assemble`, `splittable`), and `CityRegions`, the world's
  regions as they are saved.
- `shared/records` - `Records`: versioned records by key, a set of the keys
  marked changed, what was written last of each (a write only when a record
  came out different); `toText` / `fromText` (base64). Shared's skill
  `world`.
- `core/persistence/citystore.js` - the rows; `citypersistence.js` - when.
- `client/carman.js` - the cars, kept by the same regions (below).

## A region

Its terrain edits (grid points moved, tiles cleared, bare ground still
growing over), the buildings standing on it (by the tile they were put down
on; `CityBuildings#row`, as the whole save has them), who lives in each
house, and the bulldozers in it and the tiles waiting for them - each with
its place in the works' own order, so put together they are stepped in the
order they were. A frame of `shared/replica`: numbers as Int32 or Float64
columns, a building's name, code, tile and turns as numbers and the rest of
its row as JSON. Nothing at all: no record.

The header: the save's version, id, `savedAt`, the game's time, `seed`,
`named`, the city's own (name, tile, money, research, who is on the way in,
what waits to replace what), the view; `form: "regions"`, `size: 24`.

## Rows (localStorage, or the storage a world is given)

- `<saves>.city.<id>` - the header (a whole save, from a build before).
- `<saves>.regions.<id>` - the keys of the regions there are; written when
  one comes or goes.
- `<saves>.region.<id>.<key>` - `<version>:<base64 frame>`, the version
  counted up whenever it is written.
- `<saves>.traffic.<id>` - `{version: 2, keys}`; `<saves>.traffic.<id>.<key>`
  a region's cars (version 1, from before: every car in that row).

`CityStore#read` puts a city together whole (`assemble`) - for opening it
and for its server; `#write` takes a whole save apart (`split`) - one from
the server, one handed in - or, for one of an older shape (no names on its
buildings, a head count for its people), keeps it as one row; `#regions`
says what is written already; `#writeRegions` writes a save by region:
regions, the list, then the header, which makes it the city's.

## What is marked

`Logic#touch(tile)` marks a tile's region; `CityRegions` keeps the marks
(`shared/records`). Who calls it:

- `Terrain` - `modify`, `clear`, `fell`, `bare`, `load`.
- `Buildings` - `build`, a building removed, a state changed; and
  `Building`'s saved fields (`look`, `fire`, `health`, `smoke`, `down`,
  `yards`, `demolishing`, `surface`) are setters that mark it, whoever sets
  them (`City#tileDown` pushes to `down`, so marks it itself).
- `CityPopulation` - people moving in or out of a house.

Made again every save without a mark (`CityRegions#live`): a region with a
building going up (its `progress` goes with the clock) or bare ground (it
grows over), and the regions the bulldozers are in now or were in last
time (they move every step; `Works#save` is small, and gone through
whole). A region made again but come out the same is not written.

Anything of a region's that changes without one of these is lost at the
next reload: `npm run test:core` puts together what storage holds every so
often over 36 game hours and compares it with the world, to the byte.

## When

- `CityPersistence#save` - every five ticks and on the way out, as before:
  `CityRegions#save` (the marked and live regions made, compared, the rows
  of those changed), then `#writeBatch`. On a worker the batch is posted
  and the page writes it (server.md). A write that fails has its regions
  written again whole next time.
- Opening: the header and every region, put together (`#read`) and
  restored as before - all of it at once: the city's sums (its people, its
  jobs, its road network) are of the whole city, so a region left unloaded
  would be missing from them. What is written already (`#regions`) is
  known to `CityRegions`, and marked: the first save writes only what came
  out different.
- A save of a build before (one row) is moved over as it is opened
  (`CityPersistence#open`): written by region at once, not counted as a
  change for the server.

## The cars

`Carman` keeps a `Records` of its own: a car's save region in its row
(`kept`), marked whenever the car is stepped or put down (the one it left
too) or taken off - so a region whose cars are asleep is never written
again, however many there are. `#save` every 5 s (when the page has a
moment): the marked regions' cars (`index` over the region's tiles) as
frames - a car's numbers, the rest as JSON, its way packed (tiles, x and y,
ways in and out, lanes) - and the list when a region came or went.
Restored all at once as before, waiting for the roads.

## The server

`CitySync` still keeps a whole save: up goes `CityStore#read` (the regions
put together), down comes one taken apart (`#write`). The Worker never
looks into a save, so nothing of it changed; saving by region on the
server is step 9.

## Measuring

`npm run world:saves` (`tools/world/saves.mjs`, docs/world.md Measuring):
bytes and rows written a save and a minute, with the camera still and
panning, a save's ms on the main thread, reading back, and what storage
holds against the world; `--dump` / `--migrate` a save made mid-demolition
by one build, opened by another.

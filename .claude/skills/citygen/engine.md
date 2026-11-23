# Engine facts city generation relies on

## Tiles and the seam

- Tile index = `(y << 16) ^ x` (core/terrain `convertToIndex`), signed 32 bit.
  From y = 32768 indices are negative. `core/tileiterator` now wraps (it used
  to never terminate on a footprint spanning y 32767 -> 32768), but other
  `tile + Terrain.dy` sums still do not wrap, so keys can miss across the
  row. `site.js clearOfSeam` keeps the whole window plus margin on one side.
- Terrain heights are deterministic noise (`core/terrain calcZ`), integers;
  `<= 0` corners = water. Overrides go in `gridPoints`, saved as
  `terrain.points`. `Ground.level` mirrors `planLevel`: neighbours within one
  step, refuses to flip land/water, caps drag at 400 points.

## Buildings

- Anchor = corner with least x, y. `rotation` 0..3; odd swaps
  sizeX/sizeY. Front (core/replacement FACES): 0 faces -y, 1 -x, 2 +y, 3 +x.
  Data `sizeX` = frontage, `sizeY` = depth. `lots.js FACING[side]` maps the
  street's side to rotation.
- A building stands flat at the highest corner of its footprint, each tile
  within one step (`core/surface fits`). Restore does no validation, so the
  generator must not overlap or build on water.
- Leave `look` out of the save: the client picks one when it first draws it.
  Leave `surface` out for buildings (computed at init); roads need theirs.
- `requires` (data): road material minimum (`gravel < cobble < asphalt`,
  any side of the footprint, `cityroads alongside`) and water. Village houses,
  parks, squares, church, old town need neither.

## Roads

- Surface options as `client/road surfaces`: flat at top, or ramps. Two road
  tiles join for traffic only if `roadrules.meets` (level, full edge). Ramps
  only on straight runs (`grade.js` filters by neighbours).
- One-way: `look.way` 0..3 = -x,-y,+x,+y. `roadrules.goes`: perpendicular moves
  always allowed, opposite blocked; checked on both tiles (traffic
  `canDrive`). Junction tiles can be one-way too.
- Any tile with 3+ joins is a junction for traffic, so two one-ways side by
  side = junction every tile. Boulevards therefore have a 1-tile median, crossed
  only where streets come in. Right-hand traffic: along x the -x carriageway
  is on the low-y road; along y the +y one is on the low-x road.
- Roundabout = one-way loop <= 12 tiles (traffic `loopOf`). Ours: 8-tile ring
  round a 1x1 island, ways copied from Peepstown's: top +x, right +y, bottom
  -x, left -y (corners take the way they are left by).
- A road is the city's only where it links building areas (`core/city/
cityroads`, radius 2); dead ends past the last house are fine.

## Water, jobs, people

- Water reaches by anchor tile, Euclidean <= `waterRadius` (tower 6, pump 18;
  pump upkeep 4x for 9x area). Source must be linked (within reach of the
  town) and finished.
- Jobs go to the oldest businesses, beds of houses that need jobs get jobs
  oldest first (`cityjobs`, `citypopulation survey`). Warning only when a
  building gets none: `noWorkers` if population < cumulative jobs, `noJobs` if
  job-needing beds > jobs. `balance.js` keeps `needBeds <= jobs <= needBeds +
0.8 * villageBeds`.
- Save `population` = villageBeds + min(needBeds, jobs); the core settles it
  oldest-first. Building order in the save = age: roads, then town hall
  (`first`), then by distance from the middle.

## Save

`{version:1, id, savedAt:0, time, terrain:{points, cleared}, city:{name, tile,
resources:{money}, population, research, buildings:[{code, tile, rotation,
look?, surface?}]}, view:{turns, at:[x,y]}}`. `cleared` = every occupied tile
plus downtown block cells (no wild trees there). Opened via
`CityPersistence.open(id, save)` as a fresh city (no catch-up).

## Bench / client performance

Adding buildings to a live client is O(n^2): each one makes nearby roads
recompute `Roadman.paved`, which recomputes the whole `CityRoads` network.
The game never hits it (saves load before the client draws). The bench wraps
bulk put/wipe in `scene.js quietly` (paved stubbed, roads re-profiled once):
Peepsopolis 60 s -> 0.4 s. Bench worlds also log a pre-existing
`Tilesman.start` TypeError (not ours).

# The city

## Founding

A town is founded with whatever goes up first (`City.quoteFounding`,
`client/buildman.js` found): the player puts it down, names the city, and it
goes up out of what the city starts with. Before that, a roll of the dice
takes the camera to another spot with room for a town hall
(`client/cityman.js` roll). It puts up a town hall once grown into a town.
It has no borders: all land is the city's (`Construction#getCity`).

## Area and road network (`core/city/cityroads.js`)

- Every building has an area round it: within RADIUS (two tiles,
  middle to middle, rounded - along a row two out and one to either side of
  those, corner to corner one) - AREA. Where two areas share a tile they
  hang together (REACH): three tiles between two buildings along a row and
  they do, four and they only touch. A village holds together by its houses;
  a road reaches what stands further off.
- A road has no area of its own: only where a way along it (tiles side by
  side, never over a tile twice) goes from one building's area into
  another's does it have one, each tile as a building's (prune, by the
  blocks of a graph of roads and buildings, ringsWith); both branches
  between two villages count. Out in the country, outside every area, a road
  is the city's only on the shortest way between two villages (country).
  A road leading nowhere is abandoned; a lane into the country is the city's
  to the edge of the last house's area, the area going on two tiles along it.
- Only finished things hold it together (not a house going up, a road being
  laid); a tree is the world's.
- Of the parts that hang together, the city is the one with the town hall,
  else the bigger (road tiles plus building ground), then more people, then
  the oldest building (`CityRoads#detached` the rest). Its roads are the
  road network. Worked out again whenever anything goes up, comes down or is
  finished - never saved; `CityRoads#plan` for what would hang together with
  something put down, without putting it down.
- Every building wants to be part of it (#linked). One that is not is cut
  off: costs and earns nothing, waters nothing, its people move out, "cut
  off" over it. A road a building wants (`data/buildings` requires) must be
  right alongside, no tile between - and may need to be cobble or asphalt
  rather than gravel; off them a town house holds nobody
  (`Building#citizenCapacity`).
- A game draws the border itself (city-sim does), told what is being put
  down (its play's `placing`) and looked at (`inspecting`); outlines come
  from `client/components/tileareaborderrenderer.js`. The city's name hangs
  over its town hall or its middle (`City#center`).

## People, jobs, water

- `core/city/citypopulation.js`: each house keeps how many live in it (saved
  by its tile; an old save with a head count only fills oldest first). The
  city grows into the room its houses have - beds, while they have a road,
  water, and (for houses whose people work in town) jobs - oldest first,
  more a tick the more room, only while it is pleasant enough (Ecology).
  Over capacity, one a tick moves out. A part cut off loses one a tick till
  empty; joined up again it is the city's with whoever is left.
- `core/city/cityjobs.js`: jobs are a count, not a reach - any citizen works
  anywhere; the oldest businesses fill first, so empty shops show.
- `core/city/citywater.js`: a tower waters everything within its radius
  (its building data, also shown while placing). Coverage only, nothing
  banked. A building counts by the tile it was put down on.

## Services on screen

`client/serviceman.js`: a red word over what goes without, "no road" before
"no water" (the least road wanted on its card, `client/worth.js` describe);
a tower's reach outlined when tapped, and following one being placed; a
tapped building outlined and what it is worth handed to the game's screens
(its play's `inspecting`). Labels live and die with the building views. A
tap on nothing, nothing looked at, puts the words and the grid away; the
next brings them back.

## Time, catching up, the start

- `core/vtime.js`: the clock moves every second - five minutes a tick in
  city-sim (a day in under five minutes), a minute in food-rider (a day in
  24).
- `core/logic.js` catchUp (city-sim only): opened again or back in sight,
  the world plays out the missed ticks at once - as many as seconds went by,
  a game day at most - by the shorter of the browser's and the server's
  clock (`CitySync#awayFor`).
- `data/initialcity.js` (Peepstown, denied for reading - 179 KB): built
  entirely of generated buildings, each facing its street.

## Saves (`core/persistence/`)

- `citystore.js`: a localStorage row per city, `<prefix>.city.<id>`, and a
  directory row `<prefix>.cities` (which key per id, which city opens when
  the address names none). Each game has its own prefix, so one never opens
  the other's. Ids are 12 chars of [0-9A-Za-z] (older ones 6). With a
  server, the directory also keeps the server revision each save was made on
  and whether it changed since.
- `citypersistence.js` `open`: a saved id → load it; an unknown id → blank
  city under it; no id → the active city, else the initial city under a
  fresh id; "start from the initial city" → under the named or a fresh id.
  `prepare` first settles server vs local. Saves every few ticks and on the
  way out; a city never founded is never written.
- `citysync.js` (a game with a server): the browser save is still the one
  played; it goes up half a minute after a change, when the page is put
  away, and when back online, on top of the server revision it was made on,
  taken only if that is still the latest; otherwise the player picks.
  `reconcile` on the way in: nothing here → server's; server empty → here,
  up as new; here on the latest → here; here unchanged, server moved →
  server's; both changed → the player chooses. The last save sent as the
  page closed with no answer is recognised as ours (#ours).

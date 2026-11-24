# The core: one clock, chance, names, commands

`core/` is the world with no browser in it: `npm run test:core`
(`tools/coretest.mjs`) runs it in node - a generated town opened, the clock
moved on a frame at a time for game hours with commands sent on the way,
twice, and the two saves the same to the byte - and fails if anything of
`client/`, or `window`, `document`, `localStorage`, is reached for.

## One clock

- `Logic#clock`, ms, moved on by `Logic#advance(ms)` and nothing else. It
  goes as the game goes: `client/vkaria.js` CoreClock, the first thing
  stepped every frame, hands it the engine's frame time (`time.dt`: at most
  200 ms a frame, a bench's speed with it); with no client driving it
  (`Logic#driveBy` not called) the world's own timer moves it a tick at a
  time; a node tool moves it as fast as it likes.
- On it: a building going up (`core/construction.js` `_startedAt`, `_dueAt`;
  finished by `Buildings#due`, a `shared/typed` Heap of when and the
  building's name - an entry for one set going again since is passed over);
  a tile being cleared (`core/terrain.js` startClearing, CLEARING_MOST);
  research (`core/city/laboratory.js`); the bulldozers (`Works#tick`, moved
  on by `advance` - `works.clock` is their count of it, kept apart only so a
  save opened again can bring them on alone).
- A tick of the world (`events.tick`: VTime, the cities, saving) every
  `Config.tickDelay` of the clock - none while paused (`Logic#pause`: the
  page out of sight, a bench), though the clock still goes on if moved.
- Real time only says how long the world was away: `Logic#realNow` (Date.now,
  or the `now` option), for `pause`/`resume` and a save's `savedAt`. Back in
  sight, `resume` plays the ticks missed (a game whose city goes on,
  `catchUp`, a day at most), moves the clock on the rest of the time
  (what was going up goes on as it would have), and brings the bulldozers on
  (`Works#catchUp`) - before step 6 they stood still while the page was
  hidden. Opened from a save, `CityPersistence` catchUp plays the ticks with
  the clock a tick at a time between them (`Logic#catchUp`), the bulldozers
  brought on by `Works#load`. Either way the tiles still being cleared are
  counted from then (`Terrain#restartClearing`).
- Headless, the game draws two frames a second: the engine's 200 ms cap then
  has the clock, ticks and all, go at 0.4 of real time (the bulldozers
  always did). A frame rate under 5 a second slows the world the same way.

## Chance

- `Logic#chance(where, what, when, salt)`: `shared/random` toss of the
  world's seed, a tile, a record's name and a time - the same played again,
  in any order. Used for a building's hazards (`building.js`: tile, name,
  game time; salts 1 collapse, 2 fire), a variant picked in the world
  (`CityBuildings.variantIn`, salt 3: buildBuilding, replace, rubble) and a
  rubble pile (`city.js` bringDown, salt 4).
- The seed (`Logic#seed`) is saved with the city (`seed`); a save without
  one, and a new city, take it from the save's id (FNV-1a,
  `citypersistence.js` seedOf), so it is the same every time it is opened.
- Left on `Math.random`, as the player's or the drawing's, not the world's:
  what the client picks and sends (a variant and a look for a building
  about to go up, `buildman`, `compoundbuilding`; a new city's name and
  spot, `cityman`); the save's id (`citystore` newId); the traffic
  (`carman`: cars are the client's records still, step 7 moves them); and
  everything only drawn - dust, debris, sparks, fires, a demolition's
  falling floors, the delay of a fall after a blast, lamps' phases, sounds.

## Names that last

- `Logic#name()` gives the next name, counting on from `Logic#named`, which
  is saved with the world (`named`); `keepName(n)` keeps one given before.
  Every building (`Construction` init) and bulldozer (`works` row `name`,
  saved as its 11th field) has one; a save's are kept, and saves from
  before (no `id` on a building row, no `named`) get new ones, saved from
  then on.
- A city's id is the world's own count from 0 (`CityService#nameCity`),
  saved with the city (`id`): saves from before are city 0, as the client's
  `getCity(0)` expects.

## Commands

- What the player does to the world goes through `Logic#command({type,
...})` (`core/commands.js`): `build` (code, tile, rotation, look,
  surface), `clear` (tiles: ground and buildings, the bulldozers sent;
  gives `{cleared, cost}`), `replace` (tile, code, rotation, look), `explode`
  (tile, yards: the tiles that are only yards, as drawn), `fire` (tile),
  `terraform` (tiles, direction), `found` (tile, name); `city` names the
  city, the first otherwise. Plain objects, done there and then, so a
  worker or a server can be sent them later (step 7).
- The client sends them: `buildman` (build, replace, demolish, explode,
  fireUp, founding), `clearworks.clear(command)` (sends and lets out the
  dust of what had no view), city-sim's `terrainman` (clear, terraform), the
  lab's bench. What it asks of the world without changing it (quotes,
  `blast`, `falls`) it still calls directly.

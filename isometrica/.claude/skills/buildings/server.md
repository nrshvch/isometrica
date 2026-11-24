# The world as a local server

Step 7 of `docs/world.md`: what the player does goes to the world as
commands, and the world moved on comes back as frames that a copy plays -
the protocol the saves by region and the server will use. Two hosts behind
one interface (`client/host.js`); the client reads the copy, a `Logic` of
the same shape as ever (buildman, terrain, clearworks, the games' screens
read it as they always did).

## Where

- `shared/replica` - frames of records (numbers and bytes, a kind each) in
  one ArrayBuffer, versions (`Replica`: a frame on top of the version a copy
  has, or a snapshot), `Table` (rows whose changes go into frames),
  `Published` (the last copy whole, through a SharedArrayBuffer). Shared's
  skill `world`.
- `core/server.js` - `Server(world)`: the only thing that moves the world
  on (`run(ms)`), does commands sent as JSON (`receive(text, id)`), pauses
  and resumes it; writes it all into a frame (`flush`). `digest(world,
table)`: the numbers a copy is checked by.
- `core/mirror.js` - `Mirror(world, same)`: plays frames onto a world;
  answers commands (`waiting`, by id); checks the digest after every tick.
- `core/serve.js` - the server on a worker: messages in, frames and saves
  out. `client/server.worker.js` puts it on a Web Worker;
  `tools/coreworker.mjs` on a node thread (`test:core`).
- `client/host.js` - `InThread` (default), `OnWorker`, `Still` (a lab
  stage with no world). `client/vkaria.js` makes the host (or is handed
  one), `CoreClock` gives it the real ms a frame, `look` sends a look.

## A frame

Records, in the order things were done: `STEPS` [n, ms] - n steps of
`Logic#advance(ms)`; `AWAY` [ms] - `Logic#away`; `PAUSE`; `RESUME` [ms
away] - `Logic#resume(away)`; `COMMAND` [id] + the command's JSON; `DIGEST`
rows (row 0 the world: clock, last name, game time, buildings, bulldozers,
tiles waiting; a row a city: id, money, people, buildings) - the rows
changed, after any tick. The first frame is a snapshot (from -1) with all
of them. A copy is the same world because it is opened the same way and
does the same things in the same order: the world is deterministic (one
clock, seeded chance, names that last: core.md), so what goes over is what
moved it on, not what it came to - a few hundred bytes a second.

## The clock

- The world goes by real time, in fixed steps (`STEP` 50 ms, shared/schedule
  `Clock`): `CoreClock` hands the host the real ms since the last frame,
  however few frames there are (headless, two a second), so the world keeps
  up with the real clock (before step 7 it followed the engine's frame
  time, capped at 200 ms, and went slower than real time under 5 frames a
  second). More than `MOST_STEPS` (5 s) at once is made up for as time away
  is (`Logic#away`: the ticks played out, a day at most, the clock moved on
  the rest, the bulldozers caught up) - the same as a page back in sight.
- A lab bench sets `vkaria.frameClock`: the world goes by the game's time,
  its speed and all (`lab/bench/world.js`, `stage.js`).
- Page out of sight: `host.pause` / `resume`, recorded, so a copy is paused
  and caught up by the same ms.

## In the page (InThread, the default)

The server's world is the client's: `frame(ms)` runs the steps and plays
the frame (nothing to play twice - only versions and answers); a command is
sent as JSON and done there and then, `done(result)` called before
`command` returns. The client's code paths are the protocol's, with the
same results at the same moments as before.

## On a worker (OnWorker, `?worker=on` in city-sim)

- The page opens its city as ever (`CityPersistence#open`), which keeps
  what it opened from (`opened`: id, the save, whether it was the player's,
  the real time) - `host.open()` hands that to the worker, which puts the
  same city into a world of its own (`CityPersistence#put`) at the same
  time: the two are the same from there. The worker's world moves on by
  its own timer (`STEP`); every frame is posted (transferred) and played
  on arrival.
- The page's world is a copy: `Logic#follows`. It has no timer and does not
  save on ticks; the client does not write to it: clearworks does not step
  its bulldozers (the frames' `Works#tick` does, so they move a second at a
  time), `Works` knock takes no view's time (`KNOCK_MS`, as the worker has no
  view), a fire's view does not burn a building down (the tick does).
- Saves: the worker's world saves (`persistence.saver`) and posts the
  regions changed and the header (saves.md); the page writes them
  (`writeBatch`, its storage, its server sync). The
  camera's view (`setView`) is sent to the worker for its saves.
- A command's `done` comes as its frame is played, a frame later: callers
  pass `done` (buildman build, replace, demolish, explode, fireUp, found;
  clearworks clear; city-sim terrainman). What `buildSelection` hears from
  the world (tile errors) is listened to until the last of its builds is
  answered; an explosion's trees are held (`root.blasted`) till then.
- `host.check()` - the worker's save against the copy's (savedAt left out):
  `world:worker`.

## Must hold

- Nothing changes the world but the server: anything the client used to
  write to it is a command (`look`: a block's parts picked, a bus stop) or
  done in the core (a site's bulldozers: `citybuildings` buildBuilding
  sweeps). A write to the world outside a command makes the copy differ -
  the digest says so (`Mirror#diverged`, a warning in the console).
- A command is plain JSON; its result is the world's own object in the
  copy (a building, a city).
- `npm run test:core` plays the town over the protocol in this thread and
  with the server on a worker thread: the copy's save the server's, to the
  byte, no digest off.

## Not yet

- The copy plays every step, so the main thread does the world's work all
  the same; what leaves it is saving (the regions changed, every 5 ticks). Frames of
  state by region (a Table a region, `Published`) are for when the regions
  hold their state in typed tables (steps 8, 9).
- Cars are the client's still (traffic, agents.md): they read the copy.
- On a worker, the bulldozers in sight move a second at a time, and a
  demolition in sight comes down a tile each `KNOCK_MS`, not at its fall's
  pace; a command's effects show a frame later.

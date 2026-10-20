# city-sim

The city builder: found a city, build it from the catalogue, lay its roads,
shape the ground under it and buy land for it to grow into. The city the
other games start on is built here, and handed over from the city screen.

- The catalogue opens with what a game starts with - what needs neither a
  road nor water, the houses, the old town, the water tower and the pump
  station first, then the parks - and then everything else: houses, then
  shops, a tier at a time, the cheaper first within one.
- Shaping the ground picks tiles straight away, and clears, raises or lowers
  them as toggled on along the bottom - priced over them as they are picked,
  done with the tick, and started out on what was toggled on last time.
- Shaping the ground starts on the building that was being looked at, if
  any - its tiles picked rather than the one in the middle of the screen -
  and a building tapped while shaping picks the tiles it stands on.
- A road is laid in whichever of gravel - a village's lanes, and the
  default - cobbles or asphalt is toggled on along the bottom while it is
  being laid: the selection is up to be dragged out from the start, and the
  preview of all of it changes with the toggle. Gravel laid next to the old
  town comes out cobbled (`isometrica/src/client/road.js` materialAt). What a road
  is laid in is kept with it, in the save.
- Toggled on again, it goes one way only, again the other way round - with
  no need to drag the selection out again the other way - and again both
  ways; the one that is on shows which, with the arrows a road of it has.
  The next road starts out the way the last one was laid, till the page is
  left. A one-way road looks like
  any other, but both its lanes go its way: a car keeps to the right one
  whenever it can, and takes the left to turn left, when the right is busy
  - out of a queue, if the left is clear and emptier - or to overtake, and
    goes back into the right as soon as that is clear; it changes lanes only
    along the road, never in a junction, its indicator on as it goes across. Two side by side go through a junction
    together where their ways do not cross. Buses keep to the right for their
    stops, and a car broken down in the left lane drives on till it can pull
    over on the right (`isometrica/src/client/traffic.js` planLanes). Nothing
    goes against it: no car drives along it the other way, into it or out of it,
    though one can come into it from a side road and go the way it goes, and
    leave it at a junction. It goes the way it is dragged, from the end it
    was started at on to the finger and on round every corner on the way, or
    the other way round, toggled so; a single tile goes along the road it
    carries on
    (`isometrica/src/client/buildman.js` flowOf). Each
    tile of it keeps the way it goes in the save (`isometrica/src/client/road.js`
    wayOf, goes). Its straight pieces have no line down the middle but an
    arrow the way it goes - white on asphalt, darker stones on gravel, pale
    ones among cobbles - and its ramps no dashes.
- A road is not there the moment it is laid: it is dug out, then given a
  bed of stone, before it is finished - closed off with barriers the while,
  an excavator and a lorry working along it, beacons going and work lamps on
  after dark. Nothing drives on it, and nothing counts it as on the road
  network, till then (see the isometrica README).
- The catalogue offers only what the game paints for itself - which is
  everything there is: nothing is drawn by hand. While a building is being
  placed, the dice next to turning it round picks another of the same kind
  for every footprint of the selection, the selection staying as it is.
- The weather changes over the days - clear, overcast, fog, rain, storms -
  shown by the time in the top right corner; W goes round the kinds of it to see
  each, and back to the game's own (`isometrica/src/client/weather.js`).
- The city screen (a click on the money) has the city's budget, its people
  and its services - and at the bottom of it, "Download as the initial
  city": the city as it stands, as `initialcity.js`, the city every new
  player of either game starts on - to be saved over
  `isometrica/src/data/initialcity.js` (`src/ui/city/export.js`).

### Running it

```
npm run dev          # in city-sim/ - or npm run dev:city-sim at the root
npm run build        # into city-sim/dist, isometrica built first
npm run dev:worker   # built, and served by the Worker with its saves, http://localhost:8787
```

### Saves

A city is saved in the browser (localStorage) as it is played, offline or
not, and from there kept on the server too - half a minute after it changes,
when the page is put away, and when the browser is back online - so that its
address, `/<id>`, opens it anywhere (an address of before, `/#/<id>`, is
taken as `/<id>`). The id is twelve characters, made up
by the browser: anyone with the address can open the city and save over it.

The server is the game's own Worker, `worker/`: the game's files are served
as they are, and `/api/cities/<id>` is the saves (`worker/saves.js`) - a
Durable Object for every city, keeping its last ten saves, gzipped, and
taking a new one only on top of the latest. A save made on top of anything
else means the city was saved from somewhere else meanwhile, and the player
chooses which to keep (`isometrica/src/core/persistence/citysync.js`); the
same when it is opened. `npm run dev` has no Worker behind it, and saves in
the browser only.

The page is kept by a Service Worker (`public/sw.js`), so that it opens
without a connection too, from whatever was fetched while there was one.

Its own: `src/main.jsx` starts it, `src/game.js` says what it is (five
minutes a tick of the clock, its saves under `city-sim.v1.*` in
localStorage and on the server at `/api`), `src/play.js` adds land and
ground shaping to the world, `src/client` is those, `src/ui` its screens;
`worker/` is its Worker, the saves. The world is isometrica's.

### Its screens

React, styled with Tailwind (`src/ui/app.css`, the game's teal blocks and
outlined Courier), found by the address (`src/ui/router.jsx`): `/<id>` the
world, `/<id>/catalogue` (`/<id>/catalogue/<code>` one building of it),
`/<id>/city` the city screen (`/<id>/city/map` a tab of it). Every address is
the page - the Worker serves `index.html` for any it has no file for
(`wrangler.jsonc` `not_found_handling`), and `<base href="/">` has
isometrica's `gfx/` fetched from the top whatever the address.

The world is drawn under everything else, the two laid one over the other
(`src/ui/kit.jsx` LayeredLayout): the world kept in sight as the page
scrolls, and floating over it - kept to the middle of a wide screen
(Container) - the logo in the top left, the time and the city's money in
the top right with the menu next to them (the sounds, the day and the
night going by, the view from above, back to the city), the world's
buttons along the bottom, and how close the camera is while it zooms
(`src/ui/world/Hud.jsx`, `WorldHud.jsx`). A screen - the catalogue, the
city screen - is a window over the world dimmed behind it; one taller than
the window scrolls the page as any page does. Over the
world nothing takes a click unless it says so: the layer over it is
`pointer-events-none`, so a tap, a drag or a pinch goes through to the
world's canvas, and anything to be clicked - a button, a screen covering
the world - is `pointer-events-auto` itself.

isometrica's client tells the screens what to show through the `ui` every
game hands it - `ui.gameScreen().worldScreen()`: a hint, the buttons of what
it is doing, a word asked for, the world given back - and here that goes
into a zustand store (`src/ui/bridge.js`, `src/ui/store.js`) the screens
read. `src/ui/session.js` puts the world together, once, and starts the
city in the address on it.

### Its logo

Painted by a script, to be changed there and painted again - what it
paints is checked in and goes into the build as it is:

```
npm run generate:logo    # tools/genlogo.js → public/logo.png
```

A little town out of the game's own pieces - a house, a pine, a water tower
on a slab of ground, painted by isometrica's generators - in a ring, the
tower too tall for it and breaking out through the top: 128 pixels square,
shown at 64 (and as the page's icon).

### Its icons

isometrica's icon kit (`isometrica/src/shared/icons`, see the isometrica
README): pixel art on a 16 by 16 grid, one colour, `currentColor`, shown
by `<Icon name="road" className="size-6" />` (`src/ui/kit.jsx`).
`src/ui/icons.js` says which of them each of the game's buttons is,
isometrica's road toggles among them.

Deployed by `.github/workflows/city-sim.yml` to the Workers in
`wrangler.jsonc`: `prod` (https://peeps.land) from a `city-sim/vX.Y.Z`
tag, `dev` (https://dev.peeps.land) from main, previews from any other
branch - each with saves of its own. The splash says which: a release its version, from the tag; dev,
a preview or a build of your own `dev` and the commit (`vite.config.js`).
See [Deploying](../README.md#deploying).

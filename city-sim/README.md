# city-sim

The city builder: found a city, build it from the catalogue, lay its roads
and shape the ground under it. There are no borders and no land to buy -
anything can go up anywhere - but a house, a shop or an office works only
with a road alongside it that joins the city's roads, and roads cost to lay
(dearer as they go from gravel to cobbles to asphalt), so a town built close
together costs less than one spread thin. The city the other games start on
is built here.

Where it is going, and what has been settled on the way: [its design](docs/README.md).

What the player can do:

- Found a city with whatever goes up first - its first house, as often as
  not - out of the $100,000 it starts with, and name it. The dice takes the
  camera to another spot a town could go up. The town hall comes later, once
  it has grown into a town.
- Every building has an area round it, two tiles out; where areas share a
  tile they hang together, and the city is all of it that does, a dashed
  border round it. Whatever stands further off is cut off till a road - the
  cheap way across - or another building joins it up. While something is
  being put down the border shows how it would be, in amber what would stand
  apart. Where a road crosses the border the town's limit signs stand by it.
- Build from the catalogue - everything there is to build, all of it painted
  by the game itself: first what needs neither a road nor water (village
  houses, the old town, water towers, pump stations, parks), then houses and
  shops a tier at a time. The dice beside turning a building picks another
  of the same kind.
- Lay roads in gravel, cobbles or asphalt, both ways or one way only; a
  better road laid over a lesser one upgrades it. A road takes a while to
  lay, closed off with a crew at work along it.
- Shape the ground - clear, raise or lower tiles - priced as they are
  picked. Clearing is paid at once and done by bulldozers; bare earth grows
  back over in half a game day. A building put up waits for its ground to be
  cleared.
- Tap a building to see what it is worth - how far along, what it makes,
  who lives or works in it, what it goes without, its health - and Replace,
  Demolish, Blow up or Fire up it:
  - Replace - anything that fits its ground, the old one coming down and the
    new one going up on it.
  - Demolish - fenced off and brought down a tile at a time by the
    bulldozers, kept as far down as it came over a reload.
  - Blow up - there and then, for nothing; the blast brings down or knocks
    about what stands round it, trees go over, rubble and wrecked yards lie
    there till cleared.
  - Fire up - it burns through most of a game day and is left gutted, a
    roofless shell or fallen in, by what it is built of.
  - A building with little health left may catch fire or come down by
    itself.
- Start a new city on empty land, on Peepsville or Peepstown, or on one
  generated afresh - a small town, a city, or Peepsopolis
  ([generated cities](docs/cities.md#generated-cities)).
- The city goes on while the game is closed, up to a game day of it, and
  welcomes the player back with what it made. The weather changes over the
  days (W goes round its kinds). The city screen (a click on the money) has
  the budget, the people and the services.

How the world does all of this is isometrica's - its skills in
`isometrica/.claude/skills/` (buildings, generators, citygen...). How this
game's own screens, saves and offline play work is its `ui` skill,
`.claude/skills/ui`.

### Running it

```
npm run dev          # in city-sim/ - or npm run dev:city-sim at the root
npm run build        # into city-sim/dist, isometrica built first
npm run dev:worker   # built, and served by the Worker with its saves, http://localhost:8787
```

The generated cities are checked by isometrica's `npm run test:cities`
(`npm run test:cities` at the root), and looked at on its city bench.

### Saves

A city is saved in the browser as it is played, offline or not, and kept on
the server too, so that its address, `/<id>`, opens it anywhere - anyone
with the address can open the city and save over it. A city saved from
somewhere else meanwhile has the player choose which to keep. `npm run dev`
has no server behind it and saves in the browser only. It is an app to be put
on the home screen as well, and plays offline from the first time it was
opened; a new release is found while the game is open, to be reloaded on.

### Its own

`src/main.jsx` starts it, `src/game.js` says what it is, `src/play.js` adds
ground shaping and the border to the world, `src/client` is those, `src/ui`
its screens (React, Tailwind, zustand), `worker/` its Worker and the saves,
`public/sw.js` the Service Worker. The world is isometrica's.

### Its logo and icons

Painted and drawn by scripts; what they write is checked in and goes into
the build as it is:

```
npm run generate:logo    # tools/genlogo.js → public/logo.png, public/icons/
npm run generate:icons   # tools/icons.js → src/ui/icons/svg/, src/ui/icons/index.js
```

Deployed by `.github/workflows/city-sim.yml` to the Workers in
`wrangler.jsonc`: `prod` (https://peeps.land) from a `city-sim/vX.Y.Z`
tag, `dev` (https://dev.peeps.land) from main, previews from any other
branch - each with saves of its own. The splash says which: a release its version, from the tag; dev,
a preview or a build of your own `dev` and the commit (`vite.config.js`).
See [Deploying](../README.md#deploying).

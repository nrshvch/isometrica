# city-sim

The city builder: found a city, build it from the catalogue, lay its roads,
shape the ground under it and buy land for it to grow into. The city the
other games start on is built here, and handed over from the city screen.

- The catalogue opens with what a game starts with - what needs neither a
  road nor water, the houses, the old town, the water tower and the pump
  station first, then the parks - and then everything else: houses, then
  shops, a tier at a time, the cheaper first within one.
- Shaping the ground starts on the building that was being looked at, if
  any - its tiles picked rather than the one in the middle of the screen -
  and a building tapped while shaping picks the tiles it stands on.
- A road is laid in what the player picks before laying it, the way the
  ground is shaped by picking what to do to it first: gravel - a village's
  lanes, and the default - cobbles, or asphalt. Gravel laid next to the old
  town comes out cobbled (`isometrica/src/client/road.js` materialAt). What a road
  is laid in is kept with it, in the save.
- Then whether it goes both ways or one way only. A one-way road looks and
  is driven like any other, cars keeping to their lane, but nothing goes
  against it: no car drives along it the other way, into it or out of it,
  though one can come into it from a side road and go the way it goes, and
  leave it at a junction. It goes the way it is dragged, from the end it
  was started at on to the finger and on round every corner on the way;
  the turn button turns it round (`isometrica/src/client/buildman.js` flowOf). Each
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
- The city screen (a click on the money) has the city's budget, its people
  and its services - and at the bottom of it, "Download as the initial
  city": the city as it stands, as `initialcity.js`, the city every new
  player of either game starts on - to be saved over
  `isometrica/src/data/initialcity.js` (`src/ui/modules/city/js/export.js`).

### Running it

```
npm run dev        # in city-sim/ - or npm run dev:city-sim at the root
npm run build      # into city-sim/dist, isometrica built first
```

Its own: `src/main.js` starts it, `src/game.js` says what it is (five
minutes a tick of the clock, its saves under `city-sim.v1.*` in
localStorage, its screens and routes), `src/play.js` adds land and ground
shaping to the world, `src/client` is those, `src/ui` its screens - the
catalogue, the city screen, the building tools. The world is isometrica's.

Deployed by `.github/workflows/city-sim.yml` to the Workers in
`wrangler.jsonc`: `prod` (https://peeps.land) from main, `dev`
(https://dev.peeps.land) from develop, previews from any other branch.

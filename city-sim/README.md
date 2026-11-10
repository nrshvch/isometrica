# city-sim

The city builder: found a city, build it from the catalogue, lay its roads
and shape the ground under it. There are no borders and no land to buy -
anything can go up anywhere - but a house, a shop or an office works only
with a road alongside it that joins the city's roads, and roads cost to lay
(dearer as they go from gravel to cobbles to asphalt), so a town built close
together costs less than one spread thin. The city the other games start on
is built here.

Where it is going, and what has been settled on the way: [its design](docs/README.md).

- A city is founded with whatever goes up first - its first house, as often
  as not: with none yet, the button along the bottom opens the catalogue on
  everything there is to build, and the one picked is put down as any
  building is; Done asks for the city's name, and it goes up in it, out of
  the $100,000 the city starts with. The dice next to the button takes the
  camera off to somewhere else a town could go up, about where it was when
  the dice was first rolled (`isometrica/src/client/cityman.js` roll). The
  town hall comes later, when it has grown into a town; where it stands is
  the city's middle (see the isometrica README).
- Every building has an area round it, two tiles out, rounded - five tiles
  across with its corners cut - and where two areas share a tile they hang
  together: the city is all of it that does, and a dashed line goes round its
  area, along the tiles' edges - the city's border (`src/client/cityborder.js`,
  `cityarea.js`). Whatever stands further off is cut off, with no border
  round it, till a road - the cheap way across - or another building joins it
  up. A road has an area only where it joins buildings - where a way along
  it, never over the same tile twice, goes from inside one building's area
  to inside another's, both branches where two go from one village to
  another, and out in the country only where it is the shortest way from one
  village to another - a loop on the road between them is not: one that
  leads nowhere is just a road, abandoned - a tile of it on its own, a loop
  that only leads back - and a lane off into the country is the city's only
  to the edge of a house's area, the border two tiles on along it from
  there. While something is being put down the border is
  drawn as it would be with it - a road out into nowhere adding nothing to
  it, one reaching a village further off taking it in; in amber what would
  stand apart - and the areas of whatever stands apart already, faintly; and
  something that stands apart, tapped, has the area of all that hangs
  together with it drawn in amber while it is looked at. Wherever a road
  crosses the border the town's signs stand by it,
  each on a post on the verge, no words on them: the way in on the right of
  whoever comes in, the town's houses facing them; the way out across the
  road, on the right of whoever leaves, the houses struck through red. A
  building's area is the city's once it is finished. The border is put away
  with the words over the world, but while something is being put down; the
  signs are the road's, and stay.
- The catalogue opens with what a game starts with - what needs neither a
  road nor water, the houses, the old town, the water tower and the pump
  station first, then the parks - and then everything else: houses, then
  shops, a tier at a time, the cheaper first within one.
- The city goes on while the game is closed or out of sight, up to a game
  day of it: opened again, it plays out what it missed at once, what was
  going up going up with it - finished on the way, and earning from then on.
  What it made floats up over it once the splash is gone (`src/game.js`
  catchUp); after a minute or more away the player is welcomed back first,
  on a card saying how long they were gone and what the city made
  meanwhile, under its OK (`src/ui/world/Welcome.jsx`).
- A save sent up as the game closed, that the server took but whose answer
  never came back, is known for the game's own the next time: the city is
  not taken for one saved from somewhere else, and nobody is asked which to
  keep (`isometrica/src/core/persistence/citysync.js` ours).
- Shaping the ground picks tiles straight away, and clears, raises or lowers
  them as toggled on along the bottom - priced over them as they are picked,
  done with the tick, and started out on what was toggled on last time.
- Clearing is paid for at once - what it came to floated up once, over the
  ground picked - but takes a little while to do: bulldozers driving out
  from the city, by road in the traffic and over the ground the last of
  the way, and back again after (`isometrica/src/client/clearworks.js`
  setOut), sweep the tiles cleared, a tree going over the way it is
  pushed, lying a moment and gone
  (`isometrica/src/client/felling.js`), the stones going down in their dust,
  a road broken up as they drive over it, and leave the ground bare earth -
  which the grass grows back over in half a game day
  (`isometrica/src/client/clearworks.js`). A
  building is demolished whole, every tile of it paid for, is fenced off
  there and then with blue tarp on posts, and comes down a tile at a time
  as the bulldozers come up to it - floor onto floor, bursting into
  pieces, in a cloud of grey dust - into rubble for them to push away
  (`isometrica/src/client/demolition.js`); and nothing can be built on a
  tile till its bulldozer is done there. It takes as long as it takes, and
  what is done of it is kept: the building stands, out of service, nobody
  living or working in it, as far down as it has come - each tile down for
  good once its rubble is pushed away, the ground bare there
  (`isometrica/src/core/city.js` tileDown) - and fenced off all round till
  the last of it is gone. Reloaded halfway, it is there as far down as it
  had come, fenced off still, the bulldozers not sent yet: Demolish, or
  clearing any tile of it, sends them for the rest, paid for already.
- A building tapped - any building at all, a church, a water tower, the
  town hall - is outlined, and nothing is written over the world for it: the card over the buttons along the bottom says what it is and
  what it is worth, kept up to date as the city goes on - how far along it
  is going up, or what it makes a tick, who lives or works in it and what
  it goes without (`src/ui/world/WorldHud.jsx`,
  `isometrica/src/client/worth.js`) - and the bar has only what can be done
  to it, Replace, Demolish, Blow up and Fire up, its tools back once it is
  put away with a tap anywhere else. The words over the world stay as they
  are, the tapped one's too: how far along each site is, what each building
  goes without - in a word, "no road", the card saying what road it wants,
  "no road (gravel)" - nothing over one on fire or burnt down.
- Replace opens the catalogue on only what covers its ground, turned one
  way or another - a 1x2 for a 2x1 as well - each at what it would come
  to, clearing it away included, and the kind it is among them, for
  another look of it
  (`src/ui/catalogue/Catalogue.jsx`, `isometrica/src/core/replacement.js`).
  The one picked is a shortcut for clearing it away and building on its
  ground: all of it paid for there and then, the building fenced off and
  coming down as the bulldozers get to it, and the new one going up as a
  building site as soon as they are done - turned the way the old one
  faced where it fits so, or else the way with the most road along its
  front (`isometrica/src/client/buildman.js` replace). Its ground is kept
  for it meanwhile, and in the save: closed, it goes up on it as the game
  opens again (`isometrica/src/core/city/citybuildings.js` replaceLater).
- Demolish clears the building away the way clearing its ground does:
  one clearing charge for every tile of it, paid at once and floated over
  it, the building fenced off and brought down where it stands by the
  bulldozers, and the ground left clear (`isometrica/src/client/buildman.js`
  demolish) - one being demolished already, reloaded halfway, the
  bulldozers sent for the rest of it, for nothing. Replace waits for the
  last tile of the old one to be down before the new one goes up.
- A building is built inside as well as out, so a tile of it that comes
  down before the one behind it - the bulldozers bringing it down a tile
  at a time - leaves that one showing its rooms on that side, not a flat
  wall where it was cut: a bare concrete floor to every storey, plastered
  walls, a wall across where it is wide, its windows in them seen from
  inside, darker in there out of the sun - a storey all of glass an open
  floor inside its glass walls. And a building going up shows the inside
  of its shell through the openings left in its walls
  (`isometrica/src/shared/gen/isobox.js` interiors).
- Blow up blows the building up there and then, for nothing - no fence,
  no bulldozer: the charges going off at its foot, flashing, it shakes and
  goes up - a fireball bursting out of the building itself, not its yard,
  and pieces torn off every floor flung out and high, to fall all round -
  and what is left of it, blackened, comes down a tile at a time, one
  after another, floor onto floor (`isometrica/src/client/explosion.js`,
  `isometrica/src/client/collapse.js`). Any building at all - a church, a
  water tower, the town hall. A cloud of dust rolls out of it over
  everything round it and down the streets from it, a road at a time, and
  hangs there a long while. The blast comes off the building itself, not
  its yard, and hits a building round it a part at a time - a tile of what
  is the building, not its yard (`isometrica/src/core/city.js` blast, hit):
  a part next to it or across a road from it comes down, a moment later, the
  nearest first, no fence, no bulldozer, to a heap of rubble in the
  building's place, and a yard as near is wrecked; the rest of the building
  stands, open on its side where a part in front of it has come down, its
  health down by as much as it lost; with no part of it left standing it is
  all down. Further off a building is only knocked about, its health down.
  The trees within two tiles of it go over, away from it, the way a
  bulldozer pushes them, and lie there till they are cleared away
  (`isometrica/src/core/city/citybuildings.js` leaveFallen). A heap of
  rubble lies on every tile of what was a building - its heaps one pile,
  running on into each other along their sides and over the corners where
  four meet, but not into the pile of a building next to it, lying on the
  ground as it slopes (`isometrica/src/client/rubble.js`,
  `isometrica/src/shared/gen/stones.js` pile) - the blown-up one's
  smouldering a while, flames among it and smoke, then wisps. What was only
  a yard - a car park, a playground, a garden, a park all of it - is no
  rubble but the wreck of itself: painted run down, its asphalt and paving
  cracked and stained, its grass dried out, its trees dead, its swings and
  benches broken or gone, its pond murky, lumps of what was blown over it
  lying about, grey with the dust (`isometrica/src/shared/gen/isobox.js`
  setWorn); burnt down, the same but black. Kept in the save, heaps, wrecks
  and fallen trees are there till Clear has the bulldozers push them away
  for the clearing fee - the heaps round one a pile without it from then
  on - or anything is built over them (`isometrica/src/core/city.js`
  explode, `isometrica/src/data/buildings.js` rubble).
- Every building has its health, shown as a bar on its card, and how
  many of its parts still stand (`isometrica/src/core/building.js`
  getHealth, down): knocked out of it by a blast near it, burning away as
  it burns. The less of it there is, the likelier it is to catch fire by
  itself or to come down - with none left, within a few hours of the game's
  time, unless it is demolished first: all of it there is left comes down
  a tile at a time in its dust, no fence, no bulldozer (`hazards`,
  `isometrica/src/core/city.js` collapse). Its parts down, its health and
  which of its tiles are only yard are kept in the save.
- A tile of a building that comes down before the one behind it - a
  bulldozer at it, a blast, a fire - leaves that one open on its side:
  empty rooms where the wall between them was, a bare concrete floor to
  every storey, plastered walls, a wall across where it is wide. Painted
  as the building is, not drawn over it: the generators paint a part open
  on a side of its tile, its storeys hollow and the wall on that side gone
  (`isometrica/src/shared/gen/isobox.js` setOpen, `@o` after its key), and
  the demolition puts that in place of what stood as soon as it is painted,
  having asked for it as soon as the building was to come down, and brings
  it down in the same pictures, open as it falls
  (`isometrica/src/client/demolition.js` open,
  `isometrica/src/client/spritecache.js` openName). A building a blast has
  taken parts off stands open so (`isometrica/src/client/buildingview.js`
  damaged).
- Fire up sets the building on fire, for nothing, and it burns through
  most of a day of the game's time (`isometrica/src/client/fires.js`). It
  catches in a window of a floor low down, glowing within, and the fire
  spreads window by window - up faster than down, slower along a floor -
  till flames lick up out of every window, white-hot to orange to red, and
  off its roof; the wall over each is blackened, sparks fly, and the
  building chars all over as it goes on (`isometrica/src/client/burnt.js`
  char). Smoke pours out of its windows, and black smoke rolls up off the
  top of it - thicker the more of it burns, as big a column as the
  building is, billowing as it goes up and bending off the way the wind
  blows high up, a stream of it across the sky over the city
  (`isometrica/src/shared/gen/smoke.js` plume). After dark the fire lights
  the ground round it and the smoke over it. Seven hours on it comes down
  the way a building does, floor onto floor in a cloud of dust and smoke,
  no fence and no bulldozer - and what is left of it burns on among its
  charred walls, the smoke thinning, then smoulders, embers glowing, a
  wisp of smoke here and there, and by the end of the day is a cold ruin
  (`isometrica/src/client/ruin.js`): its ground floor's walls charred and
  broken off, the posts of its frame standing up out of them, its concrete
  base kept where it had one, and its yard, its car park, its playground
  sooted and strewn with what fell. It is out of service from the moment it
  catches - no one lives or works in it, nothing is made of it - and the
  card says it is on fire, then burnt down; the ruin stands till it is
  cleared, replaced or blown up. Kept in the save, the fire as far along
  after a reload as it would have been (`isometrica/src/core/building.js`
  ignite, burn).
- A building put up has its ground cleared first, bare or not - the trees,
  stones or rubble on it standing till a bulldozer gets there, driving out
  to it the same way - and only then goes up: the bulldozers are the first
  tenth of how far along it is, shown from the start
  (`isometrica/src/core/construction.js` awaitClearing).
- Shaping the ground starts on the building that was being looked at, if
  any - its tiles picked rather than the one in the middle of the screen -
  and a building tapped while shaping picks the tiles it stands on.
- A road is laid in whichever of gravel - a village's lanes, and the
  default - cobbles or asphalt is toggled on along the bottom while it is
  being laid: the selection is up to be dragged out from the start, and the
  preview of all of it changes with the toggle. Gravel laid next to the old
  town comes out cobbled (`isometrica/src/client/road.js` materialAt). What a road
  is laid in is kept with it, in the save. Laid over a road of something
  less - cobbles or asphalt over gravel, asphalt over cobbles - it takes
  that one's place where it lies, for the price of a road: dug up and laid
  again the way a new road is, closed to the traffic till it is finished
  (`isometrica/src/core/city/citybuildings.js` upgradeOf); over one of the
  same or more it is turned down, the tile taken.
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
  and its services.

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
localStorage and on the server at `/api`), `src/play.js` adds
ground shaping to the world, `src/client` is those, `src/ui` its screens;
`worker/` is its Worker, the saves. The world is isometrica's.

### Its screens

React, styled with Tailwind (`src/ui/app.css`: everything over the world on
cards of its own - sky white by day, night blue once the world is drawn at
night - corners all but square, colour kept for what it means), found by the
address (`src/ui/router.jsx`): `/<id>` the
world, `/<id>/catalogue` (`/<id>/catalogue/<code>` one building of it),
`/<id>/city` the city screen. Every address is
the page - the Worker serves `index.html` for any it has no file for
(`wrangler.jsonc` `not_found_handling`), and `<base href="/">` has
isometrica's `gfx/` fetched from the top whatever the address.

The world is drawn under everything else, the two laid one over the other
(`src/ui/kit.jsx` LayeredLayout), as high as the window: over the world -
kept to the middle of a wide screen (Container) - along the top the city's
money (opening the city screen) and what comes in a tick, under
it the city's name and how many live there (back to the city), the time and
the weather, the view from above and the menu (the sounds, the day and the
night going by, the grid over the ground - kept off, if switched off,
whatever a tap on the world puts away and brings back - the city's address
at https://peeps.land shared, or copied, a new city on empty land, or
starting over on the city new players start on (`src/initialcity.js`,
Peepsville) or on the big one (`src/peepstown.js`, the delivery game's,
isometrica's `data/initialcity`, called Peepstown here) - each under an id
of its own, the city left kept under its own - and under them the other cities
saved in the browser to go back to, the five played most lately), with
zooming in and out under them; along the
bottom, where a thumb is, the bar of the world's buttons - the city, the
catalogue, a road, the ground, or those of the action going on, its
tick faded while it cannot be pressed - and over it a line of what to do
(`src/ui/world/Hud.jsx`, `WorldHud.jsx`). On a phone the money and the time
take the top, the city's name and the buttons the line under it. A screen -
the catalogue, the city screen - is a card over the world dimmed behind it,
as high as the HUD leaves it: what it holds scrolls under its title, which
stays where it is. The city's name is not written over it in the world
too (`src/play.js`). Over the
world nothing takes a click unless it says so: the layer over it is
`pointer-events-none`, so a tap, a drag or a pinch goes through to the
world's canvas, and anything to be clicked - a button, a screen covering
the world - is `pointer-events-auto` itself.

The game opens under its splash (`src/ui/world/Splash.jsx`): "Denis
Narushevich's Peepsland", the maker over the name the way the nineties'
games had it - both in the middle, the maker's name small, the game's in
Chakra Petch, its corners cut like the world's pixels - a bar of how far along it is, and its release along the
bottom edge. The bar is the game coming up, then the
pictures of what is on screen painted, those the camera sees from where it
looks and not the other sides of the world painted ahead meanwhile
(isometrica's `SpriteCache#progress`). Once they are all painted and on the
pages, a couple of frames running, it fades away over the world drawn as it
should be - or after half a minute, whatever is still to come.

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
the page's icon.

### Its icons

Drawn by a script, to be changed there and written out again - what it
writes is checked in and goes into the build as it is:

```
npm run generate:icons   # tools/icons.js, by tools/genicons.js →
                         # src/ui/icons/svg/<name>.svg, src/ui/icons/index.js
```

Lines in one colour, `currentColor`, on a 24 by 24 grid: 1.5 wide, square
at their ends and mitred at their joins, to go with the world's pixels.
What is of the world - a plot of land to found a city on, raise or lower,
a road - is a flat tile of it, twice as wide as it is high; a road
is drawn on a grid 18 high, shown a third wider than the others and in
finer lines, laid in asphalt, gravel or cobbles and going both ways, one
way or the other (`-two`, `-one`, `-back`). Shown by
`<Icon name="asphalt" size={22} />` (`src/ui/kit.jsx`); isometrica's
client asks for its road toggles by these names too (`client/buildman`).

Deployed by `.github/workflows/city-sim.yml` to the Workers in
`wrangler.jsonc`: `prod` (https://peeps.land) from a `city-sim/vX.Y.Z`
tag, `dev` (https://dev.peeps.land) from main, previews from any other
branch - each with saves of its own. The splash says which: a release its version, from the tag; dev,
a preview or a build of your own `dev` and the commit (`vite.config.js`).
See [Deploying](../README.md#deploying).

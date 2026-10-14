# isometrica

The world the games are played in (`city-sim`, `food-rider`): the terrain,
what stands where - buildings, roads, the surfaces they stand on - the
traffic on the roads, the light it is all drawn in, and the generators that
paint every picture of it. It has no game of its own and no screens: a game
starts it up and puts its own over it (see the games' `src/main.js`).

- `src/core` - the world itself: terrain, buildings and roads, cities, the
  clock, saves.
- `src/client` - the world on screen: chunks streamed in round the camera,
  building and road views, traffic (`traffic.js`, `carman.js`), the WebGL
  renderer and lighting (`glview.js`, `lighting.js`), the sprite cache and
  the generator worker (`generator.js`).
- `src/shared/gen` - the generators: ground, roads, buildings, trees,
  vehicles, stones, smoke - everything there is to see; nothing is drawn by
  hand.
- `src/data` - what can stand in the world, and the city both games start
  on (`initialcity.js`).
- `npm run build` writes `dist/gfx`: the manifests of what every generator
  will paint.
- `vite.mjs` - the Vite plugin a game uses to serve and ship `dist/gfx`.
- `lab/` - pages to look at the world without a game: `npm run dev` here
  opens the lighting bench at `/lighting.html`.

A game depends on it by path (`"isometrica": "file:../isometrica"`) and
imports its modules as `isometrica/<path under src>`, e.g.
`isometrica/client/main`, `isometrica/core/terrain`. It is drawn with the
engine in `engine/`.

### Traffic

- Everything on the roads drives the same way (`isometrica/src/client/traffic.js`):
  in its lane, on the right, looking a couple of tiles along its way for
  whatever is on it. It brakes to keep a gap that grows with its speed and
  speeds up again a little at a time, so a queue sets off one car after
  another rather than all at once, and nothing ever drives through anything
  else.
- A one-way road has two lanes going its way. A car keeps to the right one
  whenever it can, and takes the left only to turn left - two tiles short
  of the junction - when the right is busy, or to overtake: coming onto the
  road, it takes the left if the right has two more in it ahead; stood in a
  queue in the right, it goes over into the left if that is clear alongside
  and has fewer ahead; and in the left, it goes back into the right as soon
  as that is clear a good way ahead (planLanes, Driver#switchLane). It
  changes lanes along the road only, never in a junction, its indicator on.
  The next stretch of its way is joined on a few tiles before the end of
  the one it is on, so it is in the lane for a turn at the start of it.
  Where two side by side do not cross each other's way through a junction,
  they go through it together. A junction is wherever three or four roads
  meet, one-way roads coming into it counted as much as those going out -
  and where a one-way road joins one both ways, where what is on that turns
  round across the way of what comes off the one-way road: they take their
  turns there as at any junction. Into a junction only with room on the
  far side for it and for everything already let in that comes out the
  same way, so none is left stood in the middle; and a car jammed at one
  goes another way out only where the lane it is in goes.
- A junction - a road tile joined three or four ways - is taken a turn at a
  time. The first car in each lane asks for it on the way up, and goes in
  once nothing in it is in its way - crossing its way (straight across, a
  left turn across what comes the other way, or into the same street) and
  not yet past where it does - nobody who has waited longer for a way that
  crosses it is ready (and not held up itself by what is going through: for
  a few seconds that one lets others go first, so two junctions close
  together do not each hold the other up), and there is room on the far side to come out into,
  or what is there is driving on away - nobody stops in the middle of a
  junction. Ways that never cross go through together: straight on from
  either side, two turning right, one turning right and one straight on
  into another street. Junctions next to each other are asked for
  together. So queues back up from a busy junction, into the junction
  behind it, and clear the way a jam does.
- A car stood first at a junction for a few seconds because the way it goes
  out of it is jammed, not just waiting for the traffic across it, goes
  another way out of it instead if one has its lane clear - never back the
  way it came - on a route picked from there (`carman.js` detour, `Driver`
  jammedAt). A bus keeps to its round.
- Nothing turns round in the middle of a street, across the lane coming
  the other way - that is what locked a small town's streets solid. A route
  only turns back at a junction, taking its turn there like anything else
  going through, or at the end of a road (`Traffic.route`); to get to a
  place behind it a car drives on to the next junction and comes back.
- There is a car for every four road tiles loaded through the day, and more
  in the rush hours - about one for every two and a half at eight in the
  morning and five in the evening (`isometrica/src/client/carman.js`). In the
  morning the light cars set out from the houses and are done when they get
  to work, in the evening the other way round; afterwards the ones more
  than the hour wants are done when they get where they are going. A car
  that has waited a minute in a queue that does not move turns off out of
  sight and is put on some other road - a queue behind a bus at its stop
  waits for it.
- A car keeps its way however the roads change under it
  (`carman.js` findWay): a road on its way pulled up, or made one way
  against it, it finds another from where it is; its road pulled up from
  under it, it drives slowly off the edge of it straight to the nearest
  road, its hazard lights going, and on from there; nowhere to go at all, it
  wanders about the roads it can get to, slowly, hazard lights going, till
  it finds its way again - or, after a minute and a half lost, is given up
  on.
- A car breaks down every so often: it pulls over to the kerb, out of the
  traffic's way, and stands there smoking for a while, then pulls back out
  once the lane behind it is clear. It only gives out on a street, clear of
  the junctions, where it can pull over - until then it crawls on.
- The buses run between the bus stops (a stop is a road with a shelter on
  each pavement, `isometrica/src/shared/gen/roads.js`; `Road#isStop`), each a round of a
  few stops near each other, standing at each for a few seconds in its
  lane. The traffic behind it queues; the first car to get to it goes round
  it through the other lane, once that is clear well ahead and there is no
  junction in the way, and the next only when that one is back in its lane.
  The bus waits for whoever is going round it before it moves off. A car
  stuck behind something driving on slower than it would - a lorry, a car
  about to break down - goes round that too, a good deal quicker than it
  would otherwise go, once it has followed it a moment, if the road is
  straight with no junction for as far as it takes to get past and the
  other lane clear for as far as what comes along it would get meanwhile. There is a bus for
  every two stops loaded, and none at night. The city a new player starts
  on has a few stops on its streets; a city with none is given a few as it
  is opened, on straight streets with something built along them.
- Cars are painted eight ways round: along x and y and half way between,
  which is how they cut the corner turning at a junction, swing round to
  turn back at a junction, pull over to the kerb and out again, and pull out
  round a bus at its stop.

### Sprites

- Nothing is drawn by hand: every picture there is - the ground, the roads,
  the buildings, the cars, the trees, the stones, the smoke - is painted by
  the game itself
  (`isometrica/src/shared/gen`), one picture at a time, the first time something draws
  it, in a web worker (`isometrica/src/client/generator.js`). At build time each
  generator describes what it will paint - every picture's name and size,
  and data such as car pivots - into `gfx/generated/<generator>.json`, so
  the game knows every sprite's size before it is painted. Nothing painted
  is kept between visits: painting a picture takes a few milliseconds, so
  each visit paints just what it draws. isometrica's build (`npm run build`
  in `isometrica/`, which each game's `dev` and `build` run first) writes
  those descriptions and `gfx/manifest.json` into `isometrica/dist/gfx`; a
  game's Vite serves that folder at `/gfx` and copies it into the game's
  build (`isometrica/vite.mjs`). After changing a generator while a dev
  server runs, run it again.
- The stones strewn over the land are painted too
  (`isometrica/src/shared/gen/stones.js`): a few rounded boulders to a tile -
  grey ones together in the thick of a rock field, brownish ones strewn
  about its edges - each lit by the buildings' sun in four flat tones, its
  top the lightest, with a short shadow on the ground.
- So is the smoke (`isometrica/src/shared/gen/smoke.js`): a puff in six sizes,
  white out of a chimney, black out of a car's engine - bigger, and coming
  out three or more times as often, rising twice as fast. A puff grows
  through them as it rises - slower and slower - drifts off the way the
  wind blows, the higher the more, and fades in as it comes out and away as
  it thins (`isometrica/src/client/components/smokeScript.js`). A chimney
  smokes only while there is a fire going in the house, which is most
  houses of a morning and an evening and few round the middle of the day
  and in the small hours, each making up its mind every few minutes - one
  thin wisp at a time (`smokesource.js`). However thin it is, it is not
  blended over what is behind it but dithered, the way the lamps' light is:
  each pixel of it there or not, by where it falls in a 4x4 pattern laid
  from the world's origin (`isometrica/src/client/glview.js`, a sprite
  renderer's `dither`). It is lit where it is, up in the air - by the sun,
  and at night by a lamp near it - not as the ground it is drawn over (a
  sprite renderer's `over`, how high over the ground it is).
- One wind blows over the whole city (`isometrica/src/client/wind.js`), all
  the smoke there is going with it at once: which way it comes from wanders
  round over a few minutes, and how hard it blows rises and falls over a
  minute or so, with gusts every few seconds - from near calm, the smoke
  going straight up, to a gale that bends it over low. The weather has it
  blow softer or harder: hardly a breath in a fog, a little on a clear day,
  a gale in a storm (`Wind.factor`).
- What is on screen is drawn from a few big canvas pages
  (`isometrica/src/client/canvascache.js`), not from the sheets: a sprite is copied
  there the first time it is drawn, and whatever has gone undrawn longest
  makes room when the pages are full. Something made of several pictures,
  like a shore tile, is put together there once
  (`sprites.getComposite([...])`); something that changes every frame, like
  a police car's lamp, is drawn over it as a sprite of its own.
- Housing and commerce each come in three tiers, and every tier on every
  footprint: 2x1 and 3x1 along the street, 1x2 and 1x3 end on to it, and
  2x2, 2x3 and 3x2 - the first number along the street, the second back from
  it - each with designs and options of its own, so no two need be alike.
  Housing: the village (cottages, farms, a croft - needing no road or
  water), town houses (bungalows, two-storey and terraced houses,
  semi-detached pairs) and then either villas - few people on a lot of
  land, paying a lot - or blocks of flats, a lot of people on little land.
  Commerce: small shops, stores (supermarkets, superstores, department
  stores, a shopping centre) and then either farmers' markets or office
  blocks. The catalogue keeps each tier together, its footprint on every
  card (`isometrica/src/data/houses.js`, `shops.js`, `flats.js`, `offices.js`).
- Blocks of flats and offices are put together out of parts the game
  paints - ground storey, upper storeys, roof, yard - in a style each
  (`isometrica/src/shared/gen/flats.js`, `offices.js`) on what all blocks share
  (`isometrica/src/shared/gen/blocks.js`). Each block picks its colours and details at
  random when it is first drawn and keeps the parts it is made of in the
  save (`isometrica/src/client/compoundbuilding.js`); the catalogue shows one of
  each kind (`isometrica/src/data/flats.js`, `offices.js`). A wall can be three
  sections long, the one in the middle neither end of it, with a row or two
  of yard in front - a car park, a playground, a plaza.
- Shops are painted the same way (`isometrica/src/shared/gen/shops.js`), but one
  catalogue entry per tier and footprint (`isometrica/src/data/shops.js`) stands for
  several designs: a 1x1 corner shop (flat, gable or shed roof, a firm's
  striped awning or none, fascia or side board), a 1x2 shop with a car park,
  parades of corner shops and rows of shops with car parks on the other
  footprints; a 2x2 superstore, superstores along the street or behind a
  car park three tiles long, department stores of two floors with a glass
  lantern on the roof, and a 2x3 shopping centre or covered market, the big
  ones with a pole sign; and farmers' markets - stalls under striped
  canopies on a cobbled square, in rows or round a fountain, a timber roof
  on posts over the stalls, or a glass market hall behind them, a farm's
  trailer of hay and pumpkins come in. Which design, colours and details a
  shop gets is picked when it is placed, so the ghost already shows what
  will be built. Car parks - the shops' and the blocks' - are filled with
  cars from the vehicle generator, different for every building.
- Houses are painted the same way (`isometrica/src/shared/gen/houses.js`), one
  catalogue entry per kind and footprint (`isometrica/src/data/houses.js`): village
  houses that need no road or water - a cottage on 1x1 with hens, a cow, an
  orchard or a well, a farmstead on 1x2 with a barn, a field or sheep, a
  croft on 1x3, hamlets of cottages or farmsteads side by side, a longhouse
  with its byre along the street, a farm round its yard with a barn and a
  paddock; town houses with hedges or picket fences - a bungalow with its
  garage on 2x1 (and set back on 2x2, 2x3 and 3x2, a car on the drive and a
  back garden), a bungalow end on to the street with a carport on 1x2 and
  1x3, a two-storey house end on to the street on 1x2 and 1x3, terraced
  houses along the street on 2x1, 3x1 and 3x2; semi-detached houses on
  2x2, and on 2x3 end on to the street with a back garden behind each
  half, each half with its own parking space and gate; and villas on every
  footprint behind a gate in a high hedge or a wall, with a fountain or a
  pool. Houses are
  built to the scale of the cars and roads - a car is about 4.5 m long, so
  a tile is about 10 m across and a storey 12 high - and what does not fit
  a footprint is left to a bigger one: the bungalow has a drive to its
  garage but no room to park on it; the two-storey houses on two and three
  tiles take the whole width of their plot, the car on a hard standing in
  the front garden, and keep their back gardens to themselves, out of their
  back doors. Smoke rises from the chimneys of houses lived in, when a
  fire is going in them. Whatever of a house stands in front of the cars on its
  drive is drawn again over them, so a car behind a hedge stays behind it
  whichever way the house is turned - and the front of a building site's
  fence over its digger and lorry the same way.
- The water tower is painted too (`isometrica/src/shared/gen/utilities.js`), in one
  of four European designs picked when it is placed: a concrete bowl on a
  shaft banded red and white, a slim steel tank on a steel column with a
  ladder up it, a square shaft of precast panels with three lens-shaped
  tanks stacked up its side, or a brick shaft with a wider tank of steel
  sheet on it. Each has a colour of its own and a band of blue round its
  tank; whatever is round is laid out in columns a unit across, so it keeps
  to the pixels like everything else. The pump station on 2x2 waters three times as far as a tower,
  at four times its upkeep: a Victorian brick engine house with its
  chimney stack and settling tank, a pump hall with two steel tanks, or a
  reservoir under a grassed mound with its valve house.
- Parks are painted too (`isometrica/src/shared/gen/parks.js`), one catalogue entry
  per footprint (`isometrica/src/data/parks.js`) - 1x1, 1x2, 1x3, 2x2 and 2x3 - each
  laid out as one of three kinds picked when it is placed: a sports park of
  courts and a skate spot (basketball, half a court on one tile, tennis on
  three, ramps, a box and a rail) inside a wire fence; a formal garden on a
  pattern of paved walks, a fountain where they cross and beds edged with
  box, of flowers or lawn with small trees; or a town park of gravel walks
  winding between trees, benches, bins and lamps, with a big fountain or a
  pond on the bigger footprints. Its lamps, and the floodlights at two
  corners of every court and skate spot, come on with the street lights
  and light the ground round them the way a street light does
  (`client/buildingview.js` lightsOf "park"). A park needs no road or water
  and earns nothing; the town pays its upkeep.
- The old town (`isometrica/src/shared/gen/oldtown.js`, `isometrica/src/data/oldtown.js`) is the
  commerce a village starts with, next to its cottages: it needs no road or
  water, and makes its money with the cottagers working in it. On 1x2 and
  1x3 a lane of craftsmen's houses - narrow, tall, their steep gables to
  the lane, half-timbered or rendered in ochre, rose, sky blue, sage or
  stone, the smith's, baker's, cooper's, potter's and weaver's signs
  hanging out over it and their wares out in front - or a yard with a
  smithy; on 2x2 a market square or a church in its churchyard; on 2x3 a
  square before a church or a street of craftsmen; on 3x3 all of it, with a
  guild hall and a fountain. All of it cobbled, nothing tall near its edges:
  two side by side are one town, a lane between them. Later on the town
  keeps it as its old town. It goes up the way it would have then: a
  masons' yard inside a timber rail - dressed stone and a banker, oak and a
  saw-horse, an ox cart come in with stone, the lime pit, a treadwheel crane
  - then footings of rubble, then oak frames on stone ground floors in
    scaffolding of poles.
- A wall goes round the old town (`isometrica/src/client/compoundbuilding.js`
  walled): along every edge of it with no old town beyond - so round all of
  it, however many pieces it was put down in, and never round the cottages
  - with a tower wherever two stretches meet, a gatehouse where a road
    comes up to it and in the middle of each piece's front. It is worked out
    as the town is drawn, and drawn again as anything goes up or comes down
    next to it.
- A tap on nothing - bare ground, a road, the sea - while nothing is being
  looked at puts away the words over the world ("no jobs", how far along
  one going up is, the city's name), the city limits drawn round it and the
  grid over the ground: the town on its own, for a picture of it. They stay away while the camera is dragged, zoomed or turned, and come
  back with the next tap on nothing - or with anything else: a tap on a
  building, placing or shaping the ground, a press on any button.
- A few firms turn up all over town (`isometrica/src/shared/gen/brands.js`): bolt the
  builders' merchant, orchard the grocer, pillar the bank, blaze the burger
  bar and amber the brewery. Each has its colours and an emblem - hazard
  stripes; stripes leaning forward and a round fruit; three columns; a bun;
  the sun going down over the sea - on the small shops' fascias, boards and
  awnings, the stores and superstores, the pole signs in their car parks,
  the billboards on the offices and the sides of delivery trucks and vans.
  Nothing anywhere has letters on it: at a pixel or two high they read as
  noise.
- Roads are painted too (`isometrica/src/shared/gen/roads.js`): a piece for every way
  a tile joins up with its neighbours and a ramp for every slope, each
  plain - asphalt with a dashed line and gravel edges - or paved, with
  kerbs, pavements and zebra crossings over junctions, and street lights
  along it. A light stands on every other tile, on the pavement of one
  side of the road in the world - so it stays where it is as the camera
  turns round - and on a bend or a junction in the corner between two
  joining roads, its arm reaching out over one of them. It is painted for
  each side and each corner and arm the way they are seen, and
  `isometrica/src/client/roadview.js` picks the one for the camera as it
  is. A road is paved where it is part of the city's road network
  and has a building next to it (`isometrica/src/client/roadman.js` paved); out in
  the country, or on a stretch that does not join the network, it stays
  plain, and it changes back and forth as buildings go up and come down.
- The ground is painted from nothing (`isometrica/src/shared/gen/terrain.js`): grass
  with lusher clumps, drier patches, blades, clover and the odd flower;
  water with its swell and ripples catching the light - the shallows along
  the shore and deep water further out, alike but for their blues, deep
  water spilling over the edges of the shallows next to it in a ragged,
  dithered contour (the terrain generator's diffuse tiles);
  and every tile's outline is its corners joined up, lit by the same sun as
  the buildings. The grid is not painted into the tiles but laid over them,
  see-through black round every tile, as the tiles drawn by hand had it. A
  shore tile has the water come a little way up it, then wet sand, sand and
  the grass, each line ragged with a grain of pixels along it the way deep
  water's edge over the shallows is - by how high the ground is, so a shore
  runs on unbroken from tile to tile.
- A building goes up on uneven ground the way it did in Transport Tycoon:
  level at the highest corner under it, on a concrete base cut to the
  ground (`isometrica/src/shared/gen/foundations.js`, `BuildingView` addFoundations) -
  as long as the ground falls no more than a step anywhere under it
  (`isometrica/src/core/buildings.js`). The base is picked as the tile is seen, so it
  turns with the camera. On the shore, where the water is painted a little
  way up the ground and so looks higher, the base is the same, marked where
  the water stands against it: wet and darker below that waterline, a line
  of weed along it and a tide mark above. A road on the shore is always
  levelled at the top on such a base - never laid on the sand as it is.
- Every building and every road stands on a surface of its own
  (`isometrica/src/core/surface.js`): how high it is at each corner of a tile, kept
  with it in the save. A building's is flat over every tile it stands on,
  at the highest corner under it as it goes up; a road's is its tile's,
  flat or a ramp - one side a step over the side across from it. Wherever a
  surface is over the ground it stands on concrete, a step deep at most and
  never under the ground (`isometrica/src/client/buildingview.js` addFoundations,
  `roadview.js` addBase, `isometrica/src/shared/gen/foundations.js`), so a road is
  levelled across a slope, climbs a step on a wedge, or ramps up from flat
  ground, and a building stands level on a slope. Never in the water; on
  the shore flat only, the concrete going down into the water. Two roads
  join, and cars drive from one to the other, only where they meet level,
  at the same height all along the edge between them - never over a step,
  nor onto the side of a ramp. A road up on concrete is drawn among the
  buildings rather than under all of them (`roadview.js` SINK), so the edge
  of a ramp stays over the yard of a house lower down behind it.
- A road takes a while to lay (`isometrica/src/data/buildings.js`
  constructionTime), in two stages: the earth dug out over the first half,
  then a bed of crushed stone rolled in (`isometrica/src/shared/gen/roads.js`
  works, the "dug" and "bed" pieces). Nothing drives on it, and it is no part
  of the city's network (`isometrica/src/core/city/cityroads.js`), till it is
  finished (`roadman.js` keeps the roads being laid apart from the ones the
  traffic drives on). Each stretch being laid that hangs together is closed
  off with barriers - striped boards on legs, an amber lamp blinking on each
  end - where it meets a finished road and across its ends (`roadview.js`
  barriersOf). A crew works along the whole of it
  (`isometrica/src/client/roadworks.js`): the excavator from one end to the
  other, stopping on every tile to turn and dig, a lorry a tile behind it;
  then back the other way, the lorry ahead tipping stone, the excavator
  behind it spreading it - a crew to every six tiles or so of a long stretch.
  Where they are is worked out from how far along the road is, so it is the
  same after a reload.
- A run of road the player drags is laid all at once (Road.plan): each new
  tile gets the surface that has the run join up the most - with itself,
  and with the roads already there, which stay as they are, joining those
  the run is dragged over counting double - and, as far as that goes, takes
  the least concrete. So a run across a slope is levelled along it, one up
  a slope ramps up it, one dragged onto a levelled road climbs up to it, and
  a road on its own follows the ground. The same run always comes out the
  same, so the preview is what gets built.
- Land can be raised and lowered under buildings and roads, the way
  OpenTTD shapes land under its foundations (`isometrica/src/core/city.js` terraform):
  whatever stands there stays where its surface still fits the ground as it
  will be, the concrete under it taking up the difference - ground raised
  to the top of a base replaces it, ground taken down from under one leaves
  it on concrete, a whole step over flat ground if need be. Anything whose
  surface would not fit - under the ground, more than a step over it, in the
  water, or a ramp on the shore - is still in the way.
- The trees are painted too (`isometrica/src/shared/gen/trees.js`), as pixel art: each
  kind's own shape - oak, beech, ash and alder, two of each - filled in with
  three flat greens and lit by the buildings' sun, every tone in patches
  rather than speckled - each painted from its four sides, so turning the
  camera shows another side of it, and a tree stands whichever way round
  its tile has it. The world grows each kind in stands
  (`isometrica/src/core/ambient.js`).
- A town starts without a town hall. Its name hangs over the middle of the
  land it owns, and its road network is the biggest stretch of its roads
  that hangs together - a building is on the road when it is next to that;
  a lane off on its own does not count. With no town hall to bill it to,
  the land is billed by the city itself.
- The backs of buildings are not left bare (`isometrica/src/shared/gen/blocks.js`
  backs): a shop has a steel door out to its bins - and a skip, behind a
  big one - the air conditioning's units on the wall, rain streaks, the odd
  tag sprayed on it and a wire fence round its service yard; blocks of
  flats have their bins out at the back and units on their end walls.
- While a selection is dragged about, the buildings in it keep the looks
  they were shown with; only a selection of another size picks again.
- Every building goes up on a building site - the same parts for all of
  them (`isometrica/src/shared/gen/sites.js`): bare earth, and on each tile one of an
  excavator, a lorry, a heap of sand, the site office or a tower crane,
  dealt out for each building (`isometrica/src/shared/gen/stacking.js`), and a blue
  tarp fence round it all. A small building's site - a park, a cottage or
  farm of the village, a house or shop on one tile - has no crane and a low
  timber rail round it instead (`client/compoundbuilding.js` smallSite). A
  block of
  flats or offices then grows its own structure from a quarter of the way,
  and its lower storeys finish under it from halfway; the crane, stacked
  out of steel lattice mast sections that shade each other, grows with it. The excavator drives, stops and turns
  to dig, and the crane's jib swings to and fro
  (`isometrica/src/client/siterenderer.js`); the lorry and the excavator are the
  vehicle generator's, and the excavator never drives the streets.
- What works has its lights on (`isometrica/src/client/worklights.js`): the
  excavators and lorries on building sites and road works an amber beacon
  blinking on the cab, and after dark their work lamps shining ahead; a
  building site a floodlight on a mast by its office and by its heap of
  sand; a tower crane a red light blinking on its peak and a floodlight
  under its cab, high over the site. Each is a pixel or two glowing whatever
  the light, hidden behind whatever stands in front of it, and at night it
  lights what is round it (`lighting.js` workLight).
- Any building can be turned four ways (`isometrica/src/core/rotation.js`). Blocks are
  painted from all four sides.
- The camera turns round the city a quarter turn at a time: two fingers
  twisted on a touch screen or trackpad, or Q and E. Nothing in the world
  moves - the engine's camera turns about the up axis, and draws things in
  the order it sees them in (`CameraComponent#depthAxes`). What changes is
  which picture each thing shows: `isometrica/src/client/view.js` says how the
  world looks from the side the camera is on, and the ground, roads,
  buildings, trees and cars each pick their picture by it - a tile's slope
  by its corners as seen, a building turned as many more times as the
  camera is, drawn from the tile of it nearest the camera's own corner.
  It turns at any time, in the middle of placing a building or shaping the
  ground too: what is being placed is drawn again from the new side.
- A pinch follows the fingers all the way (`client/cameracontrol.js`): the
  camera zooms by steps while they move, and in between what is shown is
  scaled up on the page the rest of the way, about the spot between the
  fingers; twisted, it is turned on the page with them - a little bigger, to
  cover the screen - clicking over to the next side of the world halfway
  there. Let go, it stays at the zoom they left it at, anywhere from 0.5 to
  2 - pulled onto 0.5, 1 or 2, where every pixel of the pixel art is the
  same size and sharp, when within 7% of one, as it is while they move
  (snapZoom) - and eases back to the nearest side. The engine finds the fingers where the canvas stands meanwhile, not
  where it is shown (`Viewport#restRect`).
- The city a new player starts on (`isometrica/src/data/initialcity.js`) is built
  entirely of generated buildings - houses, blocks of flats with their
  yards, office blocks, shops and superstores - each turned to face the
  street it stands on.
- The game's clock moves on every second (`isometrica/src/core/vtime.js`): five minutes
  in the city builder, a day going by in under five minutes, and a minute in
  the delivery game, a day going by in 24.
- The game is drawn at most 30 frames a second (`engine/engine/game.js`),
  and holds still - its clock and its drawing - while the page is out of
  sight (`isometrica/src/client/vkaria.js`).
- The city is drawn in WebGL and lit pixel by pixel as it is drawn
  (`isometrica/src/client/glview.js`, `isometrica/src/client/lighting.js`), by the hour of
  the game's clock: the sun comes up at five behind the walls looking one
  way, goes over and down at half past nine in the evening behind the walls
  looking the other - a long day and a short night - lower and redder
  towards either end of the day, and the shade goes from sky blue to the
  dark blue of night. The canvas only paints the pictures: every picture is
  painted once on a canvas of its own and handed over into its slot on a
  page of the canvas cache - the pages being the layers of one texture on
  the GPU (`isometrica/src/client/canvascache.js`). Every picture painted out of
  boxes - and the ground, the trees and the vehicles, which paint their own
  (`isometrica/src/shared/gen/looks.js`) - is painted as its colours with no light on
  them and which way every pixel of it looks, x, y and z in the red, the
  green and the blue (`isometrica/src/shared/gen/isobox.js` setMode, normalOf), so a
  sloped roof or a hill is lit by the way each pixel of it actually looks -
  and a tree's crown in the flat patches of its three greens, each patch
  looking the way its leaves do on the whole (`isometrica/src/shared/gen/trees.js`
  flatten). Which way a pixel looks and how high it stands are never mixed
  the way colours are: smoke, a shadow or a line laid over the grass leaves
  them as they are under it, unless it is mostly there. How near the eye
  every pixel of the lit city is goes into the depth buffer as it is drawn,
  worked out from where it is on the screen and how high it stands - over
  the ground its picture stands on, and that over the sea (glview depthOf):
  the pictures are still drawn in the order the engine sorts them, but what
  is drawn over them can be hidden behind whatever stands nearer - a car's
  indicators behind the house in front of it - and the courier's car shows
  through whatever hides it (glview xray). Every layer of the city is drawn as one batch of squares,
  a picture each, in the order the engine sorts them (`engine/engine`
  Canvas2dRenderer renderGL) - the lit ones into as many pictures of the
  screen at once, so whatever is in front hides what is behind it in all of
  them alike - and whatever a layer draws as lines, shapes and words, the
  lines round a city, a tile picked out or the price over a building, is
  drawn over its pictures in WebGL too (`isometrica/src/client/glcanvas.js`):
  with the same calls as on a canvas, a shape filled by counting round
  every pixel in the stencil as a canvas fills it, a line a pixel wide drawn
  as a line - never broken up on a slope - and words written on a canvas
  once and drawn from there for as long as they read the same. The frame is
  drawn straight onto the canvas shown on the page (`engine/engine`
  Viewport), nothing copied over to it, and no 2D canvas is drawn on from
  one frame to the next. A click is told what it falls on by the pixel
  itself, read back off its page.
- With them goes how high every pixel stands, a pixel a unit - a storey
  laid on another lifted by as much as it is laid higher
  (`isometrica/src/client/cachedsprite.js` Layers) - painted with its colours
  and the way it looks, a third picture side by side with them. From that,
  as a picture is put together, comes how high it stands over the ground
  under every pixel of it - a pixel h high stands over the ground h pixels
  further down the picture, so a roof stands over all the ground its
  building does and a wall over the ground at its foot (Layers finish).
- By day the sun casts shadows, wherever it is in the sky: every building,
  car and tree drawn - and whatever is drawn just off the screen, as far as
  a shadow reaches - stamps what it stands over into a map of the ground on
  the screen, the most of whatever stands over every bit of it
  (`isometrica/src/client/glview.js` stamp). Every pixel then looks along the
  way to the sun from where it is, a couple of pixels at a step over the
  ground under it and as much higher as the sun is - starting a little way
  out from the side of whatever it is on - and is out of the sun wherever
  something along it stands higher (glview LIT_FS shadowed). So a shadow is
  long in the morning and the evening and short at noon, falls across the
  road and up the wall of the house next door, moves with the cars and
  stays put as the camera turns; where it ends a long way off it frays,
  dithered as the lamps' light is. Everything is taken to stand solid down
  to the ground - a tree's crown casts its shadow as a column would - and
  a tree painted to be lit as it is drawn casts no shadow of its own any
  more. Nothing of it is worked out at night.
- At night two more pictures of the screen go with them: what shines (the lit
  panes of every window, the signs and billboards of the shops and offices
  in their own colours, a street light's lamp, a car's headlights white and
  its tail lights red, a parked car's none). Nothing round what shines is
  painted lit: every street light, every headlight and tail light and the
  flash of a police car - blue, then red - is a lamp, and so is what shines
  of a building. As a building is painted, its lit pixels are gathered into
  cells eight across, each a light where they are, as high as they stand,
  in their own colour and as bright as how much of the cell is lit and how
  brightly - rising quickly, so a single window throws its light and a whole
  lit glass front no more than so much more - one way for each of the two
  ways a building is lit and each of its two stages
  (`isometrica/src/client/generatorcore.js` lightsOf) - and every building lit on
  the screen adds those of the way it is lit just now
  (`isometrica/src/client/lighting.js` windowLights). So a shop front throws its
  colours on the pavement in front of it, a billboard on the roof under it,
  a home's lit windows on its garden, a car's tail lights the road red
  behind it, and a police car colours the road and the walls round it. A
  police car's lamp and a cab's sign glow in their own colours at every hour,
  never darkened by the dusk (glview GLOW). A car blinks its indicators amber at
  its corners on the side it turns to (`isometrica/src/client/traffic.js`
  Driver signal, lighting blinkers), throwing a little amber light round
  them at night: all the way to the next junction on its way, and through
  it, if it turns there and the road up to it is straight - nothing if it
  goes straight over, whatever it does at the next one, nothing round a
  bend or a turn where the road goes no other way, and nothing for the
  junction past a bend till it is round it; turning round left, unless at
  a dead end. Going round something it shows left as it pulls out and
  right as it is about to pull back in; out from the kerb or in to it, just
  before. A car broken down at the kerb, and the courier waiting at the
  side of the road, has all four going - its hazard lights. And a car on
  the brakes - slowing down, or standing in the traffic - shows its brake
  lights, a brighter red at the back of it than the tail lights painted on
  it, and at night throws more red light behind it (lighting brakeLights).
  Every lamp is a little square over just the pixels it
  can reach, lighting each by how far it is from the lamp in the world -
  worked out from where it is on the screen and how high it stands - and how
  squarely it faces it, the headlights in a cone ahead and a street light in
  a cone down under its shade - a pool on the road about as wide as the lamp
  is high, with a little of its light spilling out to the sides below the
  lamp and none up, so a wall by it is lit from its foot up, in one with the
  pool, never in a band of its own at the lamp's height. So a lorry passing
  under a street light is lit on its roof and the side towards the lamp, a
  wall by the street catches the light, a tree's crown is lit on the side
  facing the lamp, and the road under the lamp in its own colours. The light
  is put in steps of a third, at most a third over a pixel's own colours so
  nothing is lit white, dithered between them by where each pixel is from
  the world's origin, so it stays put as the city scrolls by - and a wall is
  dithered as finely as the ground, not a column at a time: pixel art, lit
  as the world would be.
- The weather (`isometrica/src/client/weather.js`) goes by the game's
  clock, the same whenever the game is opened at that time: the days go by
  in spells of eight hours - clear, overcast, fog, rain or a storm, picked
  by a hash of when it is, clear the likeliest - each going over into the
  next over an hour and a half. Rain comes and goes in showers; some
  mornings a fog lies over the city from before dawn till mid-morning; the
  ground stays wet for three hours after the rain stops. The weather is
  shown after the time in the top bar. `?weather=clear|cloudy|fog|rain|storm`
  holds it at one kind, and W goes round them and back to the clock's.
- It is drawn in the one pass that lights the city (`client/glview.js`
  LIT_FS), from what client/lighting makes of it (weatherSky):
  - under a heavy sky the sun is lost in the cloud and its light spread
    over the whole sky, grey: no shadows, colours duller; under a lighter
    one the clouds' shadows drift over the city with the wind;
  - a fog is thin where the eye is - the middle of the screen - and thicker
    away from it, over the ground more than up a tall building, dithered
    in steps; pale by day, all but black at night - and the lamps glow in
    it, their light blurred out into the air round them (the lamps' light
    is mipmapped every frame for the blur), for a noir night. Rain far off
    is a fog too, and in the rain the lamps glow a little whatever the fog;
  - wet, everything is darker, a road most; puddles lie on whatever is flat
    and grey - a road, a pavement, a car park - where noise laid from the
    world's origin says, more of them the wetter it is, with the sky's grey
    in them by day; and a wet road shines with the lamps over it, their
    light drawn out up it as a wet street's is;
  - the rain falls in streaks a pixel wide, two layers of them, slanting
    with the wind - grey by day, seen at night only where a lamp lights
    them - and drops splash up off the road;
  - at night the city's lights light the sky over it, and the sky what is
    under it - the city is never quite dark, more so under cloud or in a
    fog - while out in the woods the night is near black;
  - in a storm, lightning: everything lit up for a moment, flickering, and
    a jagged bolt down from the top of the screen.
- Gloomy enough - a heavy sky, a storm, a fog - the street lights come on
  by day too, a block at a time, and the cars put their lamps on.
- What stands tall has a red warning light on top, blinking each in its own
  time, by day and by night: an office tower on the telecom mast on its
  roof, and the water tower - anything tall that is no home, shop nor
  office - on its highest point. Flats and offices with nothing on the roof
  have none. Where it goes, and whether the top is a mast standing up off
  the roof, is read off the picture of how high each pixel of it stands
  (`client/cachedsprite.js` topOf, `client/lighting.js` beacons).
- Nothing fades - a light is on or off: every finished building puts a few
  of its lights on in the hour from half past eight, each at a time of its
  own, so the windows come on one by one all over the city, and more of them
  a while later - never all of them, every storey and every tile of a
  building lit one of two ways, a long run of glass pane by pane, so no two
  floors of a block are lit alike: about a third of the windows with the
  first of them, two thirds with more. A home and a shop keep them all on
  through the night, till the sun is up - a city at night, never a ghost
  town - an office only a few; a building still going up has none. The street lights
  go on about nine and off about half past five in the morning, a block of
  six tiles by six at a time, each block within twenty minutes either side
  of it; every car puts
  its lamps on and off up to three quarters of an hour after them, each in
  its own time. With `?light=0`, the city is drawn as it is painted, by the
  one sun of old; `lab/lighting.html` (`npm run dev` here) is the bench the ways of doing it with
  the canvas alone were weighed on.
- The sea moves: every tile of water, and the water up every shore, is
  painted in three frames, its ripples running on a wave across it and its
  glints flashing one after another (`isometrica/src/shared/gen/terrain.js` ripples),
  shown in turn for 440 ms each by `isometrica/src/client/animatedsprite.js` - the
  way Transport Tycoon's water moves, pixel for pixel.
- Whatever is painted out of boxes - buildings, roads, vehicles - keeps to
  the pixels the way a picture drawn by hand does (`isometrica/src/shared/gen/isobox.js`
  snap): every box is snapped to whole units before it is painted, so an
  edge along the ground is a clean step of two pixels across for one down
  and a stripe a unit wide a line a pixel thick, never one that is two
  pixels thick here, one there and broken into dots elsewhere. What is
  thinner than half a unit - a road marking, a pane of glass - is laid flat
  on what it is on; a pole or a rail is made a unit thick. Roofs and ramps
  are planes the boxes are cut by, not staircases of thin strips, and roofs
  are pitched half a unit up for one across, so their gable ends come out
  clean diagonals.
- Surfaces are made of something rather than speckled at random
  (`isobox.js` MATERIALS), laid out a pixel at a time and lined up with the
  tiles and storeys: brick courses, stone, siding and logs on the houses,
  precast panels on the flats, tiles, slates and thatch on pitched roofs,
  felt on flat ones, steel sheet on the superstores, asphalt, paving slabs,
  gravel, grass, sand and bare earth on the ground. A colour can be made of
  a material wherever it is used (`blocks.js` madeOf).
- To look at what the painting makes without starting the game, run
  `npm run generate:terrain`, `generate:vehicles`, `generate:stones` (the
  stones and the smoke) or `generate:buildings`. They run the same code the
  game does and write pictures to `isometrica/assets/terrain/terraingen` and
  `isometrica/assets/previews` (not committed).

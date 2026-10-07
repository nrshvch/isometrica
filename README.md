# Isometrica

This is JavaScript city building game prototype I've built around 2012.
In 2026 I've added more features and vehicles.
Keeping it alive for historical reference only.

![Isoville](public/miniville.gif)

### Live demo

https://peeps.land

### Features

- Procedurally generated, endless world
- Minimalistic hand-rolled canvas2d game engine

### How to run

- Install dependencies

> npm install

- Start a local dev server and open the game

> npm start

This runs Vite, rooted at `app/`, with the game served at `/`.

- Build an optimized bundle into `/dist`

> npm run build

- Preview the production build locally

> npm run preview

### Sprites

- Hand-drawn pictures live in `assets/sprites`, named by their path there
  (`buildings/shop.png`). `npm run build:sprites` (run before `start`, `dev`
  and `build`) packs them into `src/public/gfx`, grouping related pictures
  onto shared sheets, and writes `gfx/manifest.json` with every sprite's size.
  After changing a picture while the dev server runs, run it again.
- The ground, the cars and the stones are painted by the game itself
  (`src/shared/gen`), one picture at a time, the first time something draws
  it, in a web worker (`src/client/js/generator.js`). At build time each
  generator describes what it will paint - every picture's name and size,
  and data such as car pivots - into `gfx/generated/<generator>.json`, so
  the game knows every sprite's size before it is painted. Nothing painted
  is kept between visits: painting a picture takes a few milliseconds, so
  each visit paints just what it draws.
- What is on screen is drawn from a few big canvas pages
  (`src/client/js/canvascache.js`), not from the sheets: a sprite is copied
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
  card (`src/data/houses.js`, `shops.js`, `flats.js`, `offices.js`).
- Blocks of flats and offices are put together out of parts the game
  paints - ground storey, upper storeys, roof, yard - in a style each
  (`src/shared/gen/flats.js`, `offices.js`) on what all blocks share
  (`src/shared/gen/blocks.js`). Each block picks its colours and details at
  random when it is first drawn and keeps the parts it is made of in the
  save (`src/client/js/compoundbuilding.js`); the catalogue shows one of
  each kind (`src/data/flats.js`, `offices.js`). A wall can be three
  sections long, the one in the middle neither end of it, with a row or two
  of yard in front - a car park, a playground, a plaza.
- Shops are painted the same way (`src/shared/gen/shops.js`), but one
  catalogue entry per tier and footprint (`src/data/shops.js`) stands for
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
- Houses are painted the same way (`src/shared/gen/houses.js`), one
  catalogue entry per kind and footprint (`src/data/houses.js`): village
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
  back doors. Smoke rises from the chimneys of every
  house lived in. Whatever of a house stands in front of the cars on its
  drive is drawn again over them, so a car behind a hedge stays behind it
  whichever way the house is turned - and the front of a building site's
  fence over its digger and lorry the same way.
- The water tower is painted too (`src/shared/gen/utilities.js`), in one
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
- Parks are painted too (`src/shared/gen/parks.js`), one catalogue entry
  per footprint (`src/data/parks.js`) - 1x1, 1x2, 1x3, 2x2 and 2x3 - each
  laid out as one of three kinds picked when it is placed: a sports park of
  courts and a skate spot (basketball, half a court on one tile, tennis on
  three, ramps, a box and a rail) inside a wire fence; a formal garden on a
  pattern of paved walks, a fountain where they cross and beds edged with
  box, of flowers or lawn with small trees; or a town park of gravel walks
  winding between trees, benches, bins and lamps, with a big fountain or a
  pond on the bigger footprints. A park needs no road or water and earns
  nothing; the town pays its upkeep.
- The catalogue opens with what a game starts with - what needs neither a
  road nor water, the houses, the old town, the water tower and the pump
  station first, then the parks - and then everything else: houses, then
  shops, a tier at a time, the cheaper first within one.
- The old town (`src/shared/gen/oldtown.js`, `src/data/oldtown.js`) is the
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
- A wall goes round the old town (`src/client/js/compoundbuilding.js`
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
- Shaping the ground starts on the building that was being looked at, if
  any - its tiles picked rather than the one in the middle of the screen -
  and a building tapped while shaping picks the tiles it stands on.
- A few firms turn up all over town (`src/shared/gen/brands.js`): bolt the
  builders' merchant, orchard the grocer, pillar the bank, blaze the burger
  bar and amber the brewery. Each has its colours and an emblem - hazard
  stripes; stripes leaning forward and a round fruit; three columns; a bun;
  the sun going down over the sea - on the small shops' fascias, boards and
  awnings, the stores and superstores, the pole signs in their car parks,
  the billboards on the offices and the sides of delivery trucks and vans.
  Nothing anywhere has letters on it: at a pixel or two high they read as
  noise.
- Roads are painted too (`src/shared/gen/roads.js`): a piece for every way
  a tile joins up with its neighbours and a ramp for every slope, each
  plain - asphalt with a dashed line and gravel edges - or paved, with
  kerbs, pavements and zebra crossings over junctions, and street lights
  along it. A road is paved where it is part of the city's road network
  and has a building next to it (`src/client/js/roadman.js` paved); out in
  the country, or on a stretch that does not join the network, it stays
  plain, and it changes back and forth as buildings go up and come down.
- A road is laid in what the player picks before laying it, the way the
  ground is shaped by picking what to do to it first: gravel - a village's
  lanes, and the default - cobbles, or asphalt. Gravel laid next to the old
  town comes out cobbled (`src/client/js/road.js` materialAt). What a road
  is laid in is kept with it, in the save; a road from before is asphalt,
  paved or plain as above.
- The catalogue offers only what is painted: the hand-drawn houses, shops,
  offices, flats, town hall, trees and cliff are kept for the cities that
  already have them, but no longer offered.
- The ground is painted from nothing (`src/shared/gen/terrain.js`): grass
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
  ground (`src/shared/gen/foundations.js`, `BuildingView` addFoundations) -
  as long as the ground falls no more than a step anywhere under it
  (`src/core/buildings.js`). The base is picked as the tile is seen, so it
  turns with the camera. On the shore, where the water is painted a little
  way up the ground and so looks higher, the base is the same, marked where
  the water stands against it: wet and darker below that waterline, a line
  of weed along it and a tide mark above. A road on the shore is always
  levelled at the top on such a base - never laid on the sand as it is.
- Every building and every road stands on a surface of its own
  (`src/core/surface.js`): how high it is at each corner of a tile, kept
  with it in the save. A building's is flat over every tile it stands on,
  at the highest corner under it as it goes up; a road's is its tile's,
  flat or a ramp - one side a step over the side across from it. Wherever a
  surface is over the ground it stands on concrete, a step deep at most and
  never under the ground (`src/client/js/buildingview.js` addFoundations,
  `roadview.js` addBase, `src/shared/gen/foundations.js`), so a road is
  levelled across a slope, climbs a step on a wedge, or ramps up from flat
  ground, and a building stands level on a slope. Never in the water; on
  the shore flat only, the concrete going down into the water. Two roads
  join, and cars drive from one to the other, only where they meet level,
  at the same height all along the edge between them - never over a step,
  nor onto the side of a ramp. A road up on concrete is drawn among the
  buildings rather than under all of them (`roadview.js` SINK), so the edge
  of a ramp stays over the yard of a house lower down behind it.
- A run of road the player drags is laid all at once (Road.plan): each new
  tile gets the surface that has the run join up the most - with itself,
  and with the roads already there, which stay as they are, joining those
  the run is dragged over counting double - and, as far as that goes, takes
  the least concrete. So a run across a slope is levelled along it, one up
  a slope ramps up it, one dragged onto a levelled road climbs up to it, and
  a road on its own follows the ground. The same run always comes out the
  same, so the preview is what gets built.
- Land can be raised and lowered under buildings and roads, the way
  OpenTTD shapes land under its foundations (`src/core/city.js` terraform):
  whatever stands there stays where its surface still fits the ground as it
  will be, the concrete under it taking up the difference - ground raised
  to the top of a base replaces it, ground taken down from under one leaves
  it on concrete, a whole step over flat ground if need be. Anything whose
  surface would not fit - under the ground, more than a step over it, in the
  water, or a ramp on the shore - is still in the way.
- The trees are painted too (`src/shared/gen/trees.js`), as pixel art: each
  kind's own shape - oak, beech, ash and alder, two of each - filled in with
  three flat greens and lit by the buildings' sun, every tone in patches
  rather than speckled - each painted from its four sides, so turning the
  camera shows another side of it, and a tree stands whichever way round
  its tile has it. The world grows each kind in stands
  (`src/core/ambient.js`); the two trees drawn by hand are the first oak and
  beech now, so cities that had them keep their trees.
- A town starts without a town hall. Its name hangs over the middle of the
  land it owns, and its road network is the biggest stretch of its roads
  that hangs together - a building is on the road when it is next to that;
  a lane off on its own does not count. With no town hall to bill it to,
  the land is billed by the city itself.
- The backs of buildings are not left bare (`src/shared/gen/blocks.js`
  backs): a shop has a steel door out to its bins - and a skip, behind a
  big one - the air conditioning's units on the wall, rain streaks, the odd
  tag sprayed on it and a wire fence round its service yard; blocks of
  flats have their bins out at the back and units on their end walls.
- While a selection is dragged about, the buildings in it keep the looks
  they were shown with; only a selection of another size picks again.
- Every building goes up on a building site - the same parts for all of
  them (`src/shared/gen/sites.js`): bare earth, and on each tile one of an
  excavator, a lorry, a heap of sand, the site office or a tower crane,
  dealt out for each building (`src/shared/gen/stacking.js`), and a blue
  tarp fence round it all. A small building's site - a park, a cottage or
  farm of the village, a house or shop on one tile - has no crane and a low
  timber rail round it instead (`client/compoundbuilding.js` smallSite). A
  block of
  flats or offices then grows its own structure from a quarter of the way,
  and its lower storeys finish under it from halfway; the crane, stacked
  out of steel lattice mast sections that shade each other, grows with it. The excavator drives, stops and turns
  to dig, and the crane's jib swings to and fro
  (`src/client/js/siterenderer.js`); the lorry and the excavator are the
  vehicle generator's, and the excavator never drives the streets.
- Any building can be turned four ways (`src/core/rotation.js`). Blocks are
  painted from all four sides; a building drawn by hand shows its front for
  its back and its side for the other side.
- The camera turns round the city a quarter turn at a time: two fingers
  twisted on a touch screen or trackpad, or Q and E. Nothing in the world
  moves - the engine's camera turns about the up axis, and draws things in
  the order it sees them in (`CameraComponent#depthAxes`). What changes is
  which picture each thing shows: `src/client/js/view.js` says how the
  world looks from the side the camera is on, and the ground, roads,
  buildings, trees and cars each pick their picture by it - a tile's slope
  by its corners as seen, a building turned as many more times as the
  camera is, drawn from the tile of it nearest the camera's own corner.
  It turns at any time, in the middle of placing a building or shaping the
  ground too: what is being placed is drawn again from the new side.
- The city a new player starts on (`src/data/initialcity.js`) is built
  entirely of generated buildings - houses, blocks of flats with their
  yards, office blocks, shops and superstores - each turned to face the
  street it stands on.
- The city is lit as it is drawn, by the hour of the game's clock
  (`src/client/js/lighting.js`): the sun comes up at six behind the walls
  looking one way, goes over at noon and down at eight in the evening behind
  the walls looking the other, lower and redder towards either end of the
  day, and the shade goes from sky blue to the dark blue of night. Every
  picture painted out of boxes is painted as its faces side by side too - what
  of it looks one way, the other, and up, black where a pixel looks another
  way (`src/shared/gen/isobox.js` setMode) - and the ground, the roads and the
  buildings are drawn into one canvas for each face (`vendor/engine`
  Canvas2dRenderer drawLit), each multiplied by the light falling that way
  and the three added up: drawImage, multiply and lighter only, so nothing
  leaves the fast path and what is half see-through still comes out right.
  The ground, the trees and the vehicles, which are not painted out of boxes,
  paint their own faces (`src/shared/gen/looks.js`): every quarter of a
  slope of the ground by which way it looks, every pixel of a tree on the
  face it looks most towards in its tone - so a hill and a tree's crown catch
  the morning sun on one side and the evening sun on the other - a car by the
  face of it the ray went in through; only the stones, painted from pictures
  drawn by hand, are lit as if they looked up. At night a fourth canvas holds
  what shines: the lit panes of every window, the signs and billboards of the
  shops and offices in their own colours, a street light's lamp and the pool
  it throws on the road, a car's headlights shining white with their beams
  on the road ahead (`src/client/js/glow.js`) and its tail lights red -
  black wherever anything else stands, so what is in front hides it - added
  in over the dark; every building puts its lights on of an evening and out
  late at night at hours of its own. `?light=0` draws the city as it is painted, by the one sun of old;
  `/lab/lighting.html` is the bench the ways of doing it were weighed on.
- The sea moves: every tile of water, and the water up every shore, is
  painted in three frames, its ripples running on a wave across it and its
  glints flashing one after another (`src/shared/gen/terrain.js` ripples),
  shown in turn for 440 ms each by `src/client/js/animatedsprite.js` - the
  way Transport Tycoon's water moves, pixel for pixel.
- Whatever is painted out of boxes - buildings, roads, vehicles - keeps to
  the pixels the way a picture drawn by hand does (`src/shared/gen/isobox.js`
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
  `npm run generate:terrain`, `generate:vehicles`, `generate:stones` or
  `generate:buildings`. They
  run the same code the game does and write pictures to `assets/terrain/terraingen`
  and `assets/previews` (not committed).

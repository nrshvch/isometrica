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
- Blocks of flats and offices are put together out of parts the game
  paints - ground storey, upper storeys, roof, yard - in a style each
  (`src/shared/gen/flats.js`, `offices.js`) on what all blocks share
  (`src/shared/gen/blocks.js`). Each block picks its colours and details at
  random when it is first drawn and keeps the parts it is made of in the
  save (`src/client/js/compoundbuilding.js`); the catalogue shows one of
  each kind (`src/data/flats.js`, `offices.js`).
- Shops are painted the same way (`src/shared/gen/shops.js`), but one
  catalogue entry per footprint (`src/data/shops.js`) stands for several
  designs: a 1x1 corner shop (flat, gable or shed roof, striped awning,
  sign or side board), a 1x2 shop with a car park, a 2x2 superstore and a
  2x3 shopping centre or covered market, the big ones with a pole sign.
  Which design, colours and details a shop gets is picked when it is
  placed, so the ghost already shows what will be built. Car parks - the
  shops' and the blocks' - are filled with cars from the vehicle
  generator, different for every building.
- Houses are painted the same way (`src/shared/gen/houses.js`), one
  catalogue entry per kind and footprint (`src/data/houses.js`): village
  houses that need no road or water - a cottage on 1x1 with hens, a cow, an
  orchard or a well, a farmstead on 1x2 with a barn, a field or sheep;
  town houses with hedges or picket fences - a bungalow with its garage on
  2x1, a two-storey house end on to the street on 1x2 and 1x3;
  semi-detached houses on 2x2, and on 2x3 end on to the street with a back
  garden behind each half, each half with its own parking space and gate; and villas on 2x2 and 3x2 behind a
  gate in a high hedge or a wall, with a fountain or a pool. Houses are
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
- The water tower is painted too (`src/shared/gen/utilities.js`): the
  American small-town kind, a round tank on four braced steel legs with a
  catwalk, a ladder and the riser pipe down into the ground.
- The catalogue offers only what is painted: the hand-drawn houses, shops,
  offices, flats, town hall, trees and cliff are kept for the cities that
  already have them, but no longer offered.
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
  tarp fence round it all. A block of
  flats or offices then grows its own structure from a quarter of the way,
  and its lower storeys finish under it from halfway; the crane, stacked
  out of steel lattice mast sections that shade each other, grows with it. The excavator drives, stops and turns
  to dig, and the crane's jib swings to and fro
  (`src/client/js/siterenderer.js`); the lorry and the excavator are the
  vehicle generator's, and the excavator never drives the streets.
- Any building can be turned four ways (`src/core/rotation.js`). Blocks are
  painted from all four sides; a building drawn by hand shows its front for
  its back and its side for the other side.
- To look at what the painting makes without starting the game, run
  `npm run generate:terrain`, `generate:vehicles`, `generate:stones` or
  `generate:buildings`. They
  run the same code the game does and write pictures to `assets/terrain/terraingen`
  and `assets/previews` (not committed).

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
- While a block goes up it is drawn as a building site of its own shape: a
  digger or a lorry on each tile, then its structure with a tower crane by
  it from a quarter of the way, then its lower storeys finished under the
  structure from halfway (`src/shared/gen/stacking.js`). The machines - the
  vehicle generator's lorry and excavator, which never drive the streets -
  shift back and forth as they work, and the crane's jib swings to and fro
  (`src/client/js/siterenderer.js`).
- Any building can be turned four ways (`src/core/rotation.js`). Blocks are
  painted from all four sides; a building drawn by hand shows its front for
  its back and its side for the other side.
- To look at what the painting makes without starting the game, run
  `npm run generate:terrain`, `generate:vehicles`, `generate:stones` or
  `generate:buildings`. They
  run the same code the game does and write pictures to `assets/terrain/terraingen`
  and `assets/previews` (not committed).

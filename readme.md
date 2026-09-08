# Isometrica

### About
This is a JavaScript based city building game with retro graphics.

### How to run
* Install dependencies
> npm install

* Start a local dev server and open the game
> npm start

This runs Vite, rooted at `app/`, with the game served at `/`.

* Build an optimized bundle into `/dist`
> npm run build

* Preview the production build locally
> npm run preview

### Dependencies
Third-party libraries come from npm and are pinned to exact versions; the game is 2014
code written against those specific APIs, so don't upgrade them casually.

The project's own libraries — the engine, events, reactive-property, object-pool and a
few small helpers — live in `vendor/`, one directory per package. Each is compiled by
r.js into a single committed file in that package's own `dist/`. They rarely change, so
that build is run by hand:

> npm run build:vendor

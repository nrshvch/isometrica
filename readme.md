# Isometrica

### About
This is a JavaScript based city building game with retro graphics. 
The goal is to make a tribute game to all of the old-school classical city building games, strategy games and tycoons with single codebase for multiple platforms.

### How to run
* Install dependencies
> npm install

* Start a local server and open the game
> npm start

The server is rooted at the repository, not at `app/`, and the game is served from
`/app/`. It has to be served over HTTP — RequireJS loads modules by XHR, so opening
`app/index.html` from the filesystem will not work.

* Optional: build an optimized bundle into `/dist`
> npm run build

### Dependencies
Third-party libraries come from npm and are pinned to exact versions; the game is 2014
code written against those specific APIs, so don't upgrade them casually.

The project's own libraries — the engine, events, reactive-property, object-pool and a
few small helpers — live in `vendor-src/`, one directory per package. Each is compiled by
r.js into a single committed file in that package's own `dist/`. They rarely change, so
that build is run by hand:

> npm run build:vendor

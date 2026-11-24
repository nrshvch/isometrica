# engine - the engine and its small packages

Every directory here is a package of its own: `engine/`, `events/`,
`namespace/`, `reactive-property/`. Packages never reach into isometrica or
the games, and nothing game- or world-specific belongs here.

- The sources are AMD (`define(function (require) {...})`), with `main.js`
  the entry of each package. `build.js` compiles each one with r.js + almond
  into a self-contained ES module in that package's `dist/` (not committed).
  A package depending on another lists it as `external` in `build.js`.
- `engine/engine/`:
  - `game.js` (the loop, 30 fps at most), `world.js`, `gameobject.js`,
    `component.js` + `components/` (transform, camera, sprite, text and
    animated-sprite renderers).
  - `viewport.js`, `canvas2drenderer.js`, `graphics.js`, `spritemanager.js`,
    `time.js`, `coroutine.js`, `stats.js`.
  - `lib/` - octree, AABB, bounding box, asset manager.
- The WebGL renderer and the lighting are isometrica's (`client/glview.js`,
  `client/lighting.js`), not here.

## Commands

- `npm run build` - here (isometrica's and the games' builds run it first).

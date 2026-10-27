# Performance

Where a frame, a click and a tick go: what was found, what has been done
about it, and what is left. The world's side (the engine and isometrica) and
the game's (city-sim) are kept apart, as the code is.

Every point is marked:

- **Done**: changed, with the game looking and playing as it did.
- **Later**: worth doing, not started - see the roadmap at the end.

## The debug panel

The menu's **Debug panel**, or `?debug=on` (`?debug=off` puts it away),
remembered in `localStorage` as `isometrica.debug`. It lives in city-sim
(`city-sim/src/ui/world/DebugPanel.jsx`); the world only keeps the numbers,
in the engine's `Stats` (`engine/engine/stats.js`, `Engine.Stats`).

- **At the top**: frames a second and the most there may be, **fewer
  frames** - why fewer are drawn just now (see Battery) - the time between
  frames, and **script** and **GPU, ms a second**: how long of every second
  each is kept at it, which is what the battery goes on.
- **CPU a frame**: the frame, its update and its render, and the render's
  parts (slots, cull, layers, sort, light, present, preload) - avg and worst
  over the last 60 frames.
- **Layers**: what drawing and submitting each layer takes, a line each, in
  the order they are drawn.
- **Now and then**: what comes between frames - a pick, the city's tick and
  catching up, the traffic saved, sprites painted, the HUD read and drawn.
- **Tickers**: what each kind of ticking component takes a frame (cars,
  traffic, smoke, chimneys...). Timing every ticker costs a little itself,
  so it is a switch.
- **A frame**: game objects, tickers, what is drawn, draw calls, sprites
  batched, overlay ops and corners, lamps, pixels read back, cars.
- **GPU**: the lit city, the light and what goes over it, ms - only where
  the browser times it (`EXT_disjoint_timer_query_webgl2`). Script can
  only time the CPU; elsewhere the switches under **Draw** are how to see
  what the GPU takes: **Shadows**, **Lamps**, **Lines and words** off, and
  **As often as the screen**, which lifts the 30 frames a second cap so the
  frame rate shows what is left.
- **Memory** (Chrome only): the heap, how fast it fills, how often it
  drops (a collection), and the sprite pages.
- **Save the battery**: off, every frame there is whatever is going on, to
  compare.

Every line stays where it is from one read to the next - in the order the
frame goes in, never by what costs most - and is there whether or not
anything was counted on it (a dash, dimmed); each figure has a column of its
own. A figure is green while it is easy on a phone and red once it is too
much (`LIMITS` in the panel: a frame at 30 a second has 33 ms, most of which
the script should leave to the GPU, the browser and the page); only the
lines that say most are ever green, the rest only ever red.

Put away, nothing is timed: `Stats.begin`/`end` return after one branch, and
every switch is back as it was.

`Stats` itself: `section(name)` and `counter(name, gauge)` register once and
give an id; `begin(id)`/`end(id)`, `add(id, ms)`, `count(id, n)` and
`gauge(id, v)` are what goes in a hot path; `frame()` rolls them into the
ring; `snapshot()` is what the panel reads. All of it is typed arrays.

## Measured

Scripted runs in headless Chromium on a software GPU (SwiftShader,
1280x800): a still camera for 8 s, a pan, a water tower dragged about while
placing it (240 moves), a road dragged out (300 moves). Before: the commit
that added the panel, before any of the fixes; after: all of them. The same
machine, one run after the other.

|                         | still         | pan           | water tower      | road             |
| ----------------------- | ------------- | ------------- | ---------------- | ---------------- |
| Picks made              | -             | -             | 7 → 188          | 250 → 250        |
| Picks, all of them      | -             | -             | 77.5 s → 67 ms   | 197.5 s → 106 ms |
| Worst pick              | -             | -             | 16.8 s → 4.2 ms  | 17.1 s → 10.7 ms |
| GPU readbacks           | 0 → 0         | 0 → 0         | 26 → 0           | 1,438 → 0        |
| An input event, avg     | -             | 1.0 → 0.25 ms | 296 → 4.5 ms     | 603 → 4.2 ms     |
| Allocated a second      | 6.1 → 2.3 MB  | 4.1 → 1.3 MB  | (stalled before) | (stalled before) |
| Overlay corners a frame | 5,141 → 3,943 | 5,658 → 4,359 | 6,365 → 5,335    | 5,526 → 4,155    |

What it says:

- A drag while placing waited on picks, each with up to five `readPixels`
  stalls of the GPU - seconds a pick on a slow GPU, so slow that before,
  only 7 of the water tower's picks got through in the whole run. Now a
  pick reads the slots and the CPU masks: no stall, well under a
  millisecond mostly.
- On this GPU a frame is the light pass, the 32-step shadow march and the
  lamps: 350-470 ms of GPU a frame here. On a real GPU it is far less, but
  it is still the biggest thing the GPU does - see the roadmap.
- The script's frame was already small, 10-13 ms here, and its frame rate
  goes by the GPU: on a software GPU sharing the CPU, the same build swings
  by 30% from run to run, more than these changes move it. The still camera
  run four times each, turn about: 1.50 frames a second before, 1.87 after.
  What was taken off the script's frame is mostly garbage - arrays and
  objects made every frame - and what goes over the city.

## The world: engine and isometrica

### Picking: the missed clicks and the slow placement

- **Done.** `CameraScript#pickGameObject` went through every game object
  with two matrix transforms each, and for every box under the pointer read
  a pixel back off the GPU (`GLView.alphaAt` → `gl.readPixels`), a stall
  every time - up to five picks a click while placing. Now it reads the
  slots the frame culls by (`Canvas2dRenderer.under`, the same maths and
  rounding as the cull) and a 1-bit alpha mask per sprite page kept on the
  CPU as the page is painted (`CanvasCache#alphaAt`). No GPU stall.
- **Done.** A pick tested the plain sprite, painting and uploading it if it
  was not on a page, and missed whenever the frame's paint budget was spent
  or the pages were full - often while panning. A lit layer draws a
  sprite's deferred layers, not the sprite. Now it tests what is drawn
  (`CachedSprite#hitAt`: the deferred layers' albedo in a lit layer), and
  never paints: what is not on a page is not drawn, so it is not hit.
- **Done.** `AreaSelector#outlineAt` searched 33x33 tiles with string keys
  and about 2,000 small arrays a pick; now it is typed scratch arrays with a
  stamp. `select()` built a sorted signature on every move; now it returns
  early when nothing moved.
- **Done.** A click turned into a pan when the hand moved 2 viewport pixels
  - 1 screen pixel at zoom 0.5. Now 6 screen pixels for a mouse and 10 for
    a finger, whatever the zoom; the move so far is carried into the first
    step of the pan, so the map stays under the pointer.
- **Done.** A double tap zoomed for a mouse too: two quick clicks on nearby
  tiles were swallowed. It is a finger's only now (`Viewport` marks touch
  events).

### Drawing

- **Done.** `GLCanvas` (`isometrica/src/client/glcanvas.js`), what every
  line, shape and word over the city goes through - the grid, borders,
  hilites, price tags - made an object per `moveTo`, a slice per stroke,
  arrays through closures for every dash and strip, a new colour array per
  call, an op per draw, a joined string per word per frame, and looked up
  uniform locations per op. Now the path is flat typed arrays, strokes and
  fills are written straight into the vertex buffer, ops are pooled, and
  uniform locations kept.
- **Done.** A stroke segment off the screen (padded by its width) emits
  nothing, its dash phase still carried on so the dashes do not move. The
  grid, the city border and the hilites drew their whole length every
  frame.
- **Done.** `GLView` (`glview.js`): about 40 uniform lookups a frame, a
  closure for the weather, `drawBuffers` arrays, buffers re-allocated
  every frame. Now uniform locations are kept, the arrays made once, and
  the streams uploaded with the offset/length form of `bufferData` - only
  what is used.
- **Done.** `Lighting` (`lighting.js`) made an object for every lamp every
  frame - windows, street lights, headlights, beacons, work lights - and
  colour and aim arrays for a police car's. Now each is written straight
  into the lamps' `Float32Array` (`GLView#lamp`); the cars are walked
  without `concat`.
- **Done.** `TileAreaBorderRenderer` took every point of its outline
  through the camera every frame just to cull it. Now what the outline
  spans is kept for the camera's turn and zoom, and a pan only moves it -
  bit for bit the same answer.
- **Done.** `tileoutline` keyed edges by `"from:to"` strings; now numbers in
  a `Map`, and no arrays per corner. The rings come out the same, in the
  same order.
- **Later.** The grid (`terraingridrenderer.js`) keeps its geometry, but
  every frame takes it through the camera and tessellates it again in
  script; the borders do too. Static GPU buffers, moved by a uniform.
- **Later.** The cull is over every game object every frame (about 6,700
  here), typed as it is: cull by chunk first.

### The GPU

- **Later.** The light pass (`LIT_FS`) marches 32 steps of shadow with a
  texture fetch each for every sunlit pixel, and with day and night off it
  is always ten in the morning. Fewer or longer steps, or a half-size
  shadow pass.
- **Later.** `generateMipmap` on the full-size light texture every frame:
  draw the lamps into a half-size target.
- **Later.** Three MRT targets (four at night) and `gl_FragDepth` written
  everywhere; normal and height could share one.
- **Later.** The overlay clears the full-screen stencil per layer and
  stencils every line: once a frame would do.

### The tick

- **Done.** The traffic's frame (`traffic.js`): `ahead()` made a 7-number
  array per segment of every car's path, 3-5 times a car a frame; the
  index a new array per tile; the junctions two `filter` closures each. Now
  pooled arrays and plain loops, and `npm run test:traffic` gives the same,
  byte for byte.
- **Done.** `carman.js groundHeight` worked out the ground under a car -
  four grid point heights, 11 noise samples each - and threw it away when
  the car was on a road, nearly always. Now the road is looked at first.
- **Done.** `View.heading` built an array and strings per car per frame; now
  a table, worked out once for each of the camera's four turns.
- **Done.** The traffic was saved - `JSON.stringify` of every car and a
  `localStorage` write - in the middle of a frame every 5 seconds; now when
  the page has a moment (`requestIdleCallback`).
- **Done.** `tilesman.js` wrote to the console on every camera move.
- **Later.** Traffic as structs of typed arrays: the drivers, their way
  ahead, the index as a hashed grid, road ids instead of boxed tile keys
  (tiles are about 1.78e9, past a small integer), a typed A*.
- **Later.** Smoke: a game object a puff, each working out the wind and a
  matrix a frame - one particle buffer.
- **Later.** Heights: a per-chunk `Int16Array` instead of noise worked out
  again.
- **Later.** The city's tick (`core/logic.js`): `city.missing()` 3-5 times a
  building a tick; `catchUp` replays up to 288 ticks at once when the tab
  comes back; a full `JSON.stringify` save every 5 ticks.
- **Later.** `pathfinding/pathman.js` builds a graph on every building
  loaded, and nothing searches it.
- **Later.** Chunks are made in the pointer's handler, all at once: a few a
  frame.

## The game: city-sim

- **Done.** The HUD (`Hud.jsx useWorld`) read everything again on every
  pointer move while panning - the budget too, two loops over every
  building. Now the camera moving reads the view alone, and whatever asks
  is read at most once a frame.
- **Done.** The open menu read the saved cities - `localStorage`, parse,
  sort - every time the HUD drew; now once each time it opens.
- **Done.** The city screen (`CityScreen.jsx`) drew again every tick; now
  only when a figure on it changed.
- **Done.** The city border (`client/cityborder.js`) planned the city and
  traced three outlines of the whole of it on every step of a placement,
  several a frame while edge-panning. Now once a frame at most, and the
  plan is kept for the same placement on the same roads.
- **Later.** The hilites, previews and price tags of a placement are game
  objects made and destroyed on every step: pool them, draw them batched.
- **Later.** `CityRoads.plan`, the area and the outlines worked out again
  for the whole city on every step: incrementally, on a typed tile grid
  with dirty regions, or in a worker.
- **Later.** `cityarea.js` sets as `{}` and `Object.keys().map(Number)`. Not
  changed here: the order the tiles come in sets where a ring starts, and
  so where its dashes fall.
- **Done.** Full-screen screens blur the live canvas over a world that was
  still drawn 30 times a second: now 10 (see Battery).

## Battery

The 30 frames a second cap (`Game#fps`) is there for a phone's battery, and
so is everything here.

Already so:

- Out of sight - another tab, another app, the phone locked - the game
  stops: the drawing, the world's clock and the audio
  (`client/vkaria.js pauseHidden`, `audio/soundman.js`).
- The canvas is CSS pixels over the zoom (`engine/engine/viewport.js`), never
  the device's pixel ratio: a phone draws a quarter or a ninth of the pixels
  it has, the cheapest there is.
- Whatever moves - the traffic, the cars, smoke, water - goes by the time
  gone, not by the frames: drawn fewer times a second, it moves as far,
  only less smoothly.

- **Done.** Getting the world ready for a turn (`client/preloader.js`)
  looked everything over again from the other three sides every second -
  every tile, tree, building and car, a few hundred milliseconds of work
  done a frame's share at a time, which never ended before the next began:
  3-4 ms of every frame, a still screen too. Now all of it is looked over
  only once the camera, the light or the look of anything in the world has
  changed (`client/looks.js`, counted where tiles, trees, buildings and
  roads are drawn again), or every 30 s whatever; in between, the cars every
  second, and what is ready kept on the pages as it was. With the camera
  still: survey work in 164 frames of 755 rather than all of them, 0.55 ms
  a frame rather than 3.4 - and a turn after it finds as much ready, the
  frame after it the same to the pixel.
- **Done.** By day, with no lamps lit, the lamps' light was still cleared
  and its mipmaps made every frame (`glview.js light`); left black from
  the frame before, nothing is done to it.
- **Done.** With the music and the sounds both off, the audio was kept going
  silent - the context running, its loops playing at nothing, the silence an
  iPhone loops playing. Now it is put to sleep once it has faded out
  (`audio/wake.js sleep`), and woken by the tap that turns either back on.
- **Done.** The frame rate goes by what is going on (`city-sim client/pace.js`,
  the fewest frames any reason asks for):
  - a screen over the world, only seen dimmed and blurred behind it - a
    blur redone every frame the world is drawn: **10** a second;
  - left alone 10 s - no touch, click, key nor wheel, and nothing held down,
    an edge pan with a finger kept still: **20**, back to 30 on the next
    input;
  - a battery running low (20%), not charging, where the browser tells
    (`navigator.getBattery`, Chrome): **20**.

  Each is a commit of its own, and the debug panel tells which is kept to
  and can turn them off.

- **Later.** `requestAnimationFrame` comes as often as the screen does - 120
  times a second on some phones - and skips three frames out of four to keep
  to 30: a wake-up every time, for nothing.
- **Later.** The shadows (`LIT_FS`, 32 steps a sunlit pixel) worked out
  again every frame while the sun, the camera and what stands in the light
  have not moved: kept from frame to frame, with the cars' own drawn over.
- **Later.** The city that stands still drawn once into a texture while the
  camera does not move, and only what moves drawn over it every frame.
- **Later.** Smoke as one buffer of particles, not a game object a puff.
- **Later.** Fewer render targets: normal and height in one.

## Notes

- Moves are not coalesced to a frame in `CameraScript`: its only listener,
  `TileSelector`, is never made, and browsers already send mouse moves once
  a frame.
- `sun()` and `weatherSky()` still make a few small arrays a frame.
- Noticed on the way, not fixed here: `core/city/citystats.js`
  `calculateResourceConsumption` adds each building, not its `demanding`;
  `engine/engine/gameobject.js` `getUpdatableComponents` writes
  `result.push[component]`, and nothing calls it.
- Every drawing change was checked frame by frame against the frame before
  it: the same pictures drawn in the same places, pixel for pixel.

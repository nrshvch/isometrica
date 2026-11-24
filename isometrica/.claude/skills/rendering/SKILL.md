---
name: rendering
description: How isometrica's world is drawn - the WebGL renderer and its one lighting pass (sun, shadows, night lamps, windows, beacons, dithering), weather (clouds, fog, rain, wet), wind, the sea, the camera (turning a quarter at a time, the smooth turn, pinch zoom, edge drag), lines and words over the city, the grid, ground chunks, frame rate. Load before changing client/glview, lighting, weather, wind, turner, view, cameracontrol, glcanvas or canvascache.
---

# Rendering

The engine sorts what is drawn; isometrica draws it in WebGL and lights every
pixel in one pass. Pictures come painted unlit from the generators (generators
skill): colours, which way each pixel looks, how high it stands, and what
shines at night.

## Where

`isometrica/src/client/` unless a path says otherwise:

- `glview.js` - the renderer: batches, depth (depthOf), the lit pass
  (LIT_FS), shadows (stamp, shadowed), GLOW, dither, xray, readHeights,
  bare. Hub: read in ranges.
- `lighting.js` - what the light is at any time: sun by the hour, night,
  windows (windowLights, windowsOn), street lights (cityOn), car lamps
  (lampsOn, blinkers, brakeLights), beacons, work lights (workLight),
  weatherSky, clouds (CLOUDS, unturned), setDayNight, STILL, onFrame, calm.
- `weather.js` (Weather.at, WEATHER, LIGHTNING), `wind.js` (Wind.factor).
- `canvascache.js` (pages = layers of one texture), `spritecache.js`,
  `cachedsprite.js` (Layers: heights; topOf, footOf, glQuad).
- Camera: `view.js` (how the world looks from the camera's side), `turner.js`
  (the smooth turn, COMMIT), `cameracontrol.js` (pinch, ZOOMS, snapZoom,
  edge drag), `components/camerascript.js`, `vkaria.js` (turnView, pause
  out of sight).
- Over the city: `glcanvas.js` (canvas-2D calls in WebGL),
  `components/terraingridrenderer.js` (the grid), `tileoutline.js`,
  `components/tileareaborderrenderer.js`, `serviceman.js` (words).
- Ground: `terrain.js` (shapeTile, showGrid), `groundchunk.js`,
  `chunkman.js`, `tilesman.js` (Tilesman#hold), `animatedsprite.js` (the sea).
- Engine side: `engine/engine/canvas2drenderer.js` (renderGL, cull),
  `viewport.js` (Viewport#restRect), `components/cameracomponent.js`
  (depthAxes), `game.js` (30 fps at most).

## Must hold

- Pixel art: light in steps of a third, at most a third over a pixel's own
  colour, dithered by world position (stays put as the city scrolls). Nothing
  fades: a light is on or off.
- Which way a pixel looks and how high it stands are never blended like
  colours; overlays leave them as they are unless mostly there.
- Nothing in the world moves when the camera turns: only which picture each
  thing shows (`view.js`). Clouds, fog banks and puddles go by the world, not
  the screen.
- Everything goes by the game's clock (weather by a hash of when it is), so
  it is the same whenever the game is opened at that time. Nothing of it is
  saved.
- The frame is drawn straight onto the page's canvas; no 2D canvas is drawn
  on frame to frame. A click is told what it falls on by the pixel, read back
  off its page.

## Testing

- Keys and flags: N or ☾ (day and night; `?daynight=on`, kept in the
  browser), W (weather kinds) and `?weather=clear|cloudy|fog|rain|storm`
  (while weather is on), `?light=0` (as painted, the old single sun), Q and E
  (turn), `?debug=on` (city-sim's debug panel: frame costs, switches for
  shadows, lamps and overlays).
- Lab: `/lighting.html` (the bench the canvas-only ways were weighed on),
  `/sprites.html` lit and at night. `docs/performance.md` - where a frame
  goes.

## More

- [light.md](light.md) - the lit pass, heights, shadows, night, lamps,
  windows, beacons.
- [weather.md](weather.md) - weather, clouds, fog, rain, wind, the sea.
- [camera.md](camera.md) - turning, zoom, edge drag, what is drawn over the
  city, ground chunks, frame rate.

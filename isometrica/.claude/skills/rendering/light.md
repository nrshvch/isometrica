# Light

## The lit pass

- The engine hands every layer to the renderer (`engine/engine`
  Canvas2dRenderer renderGL); each layer is one batch of squares, a picture
  each, in the engine's order (`client/glview.js` collect). Lit layers draw
  into several pictures of the screen at once (colour, normal, height, and at
  night what shines and the light thrown round a foot - `cachedsprite.js`
  glQuad), so whatever is in front hides what is behind in all of them. Then
  `light`: the sun on every pixel by the way it looks, every lamp on every
  pixel it reaches, what shines added over the dark. Layers over the city go
  on top as painted.
- Pictures are painted once on a canvas each and handed into slots on pages
  of the canvas cache - the layers of one texture on the GPU
  (`canvascache.js`). Normals are x, y, z in red, green, blue (`isobox`
  setMode, normalOf); a tree's crown is lit in flat patches (`trees.js`
  flatten).
- Depth: how near the eye every pixel is goes into the depth buffer, from
  where it is on screen and how high it stands over its ground and that over
  the sea (glview depthOf) - pictures still drawn in sorted order, but what
  is drawn over them can be hidden behind what stands nearer (a car's
  indicators behind a house). The courier's car shows through what hides it
  (glview xray).
- Heights (`cachedsprite.js` Layers): a third picture beside colours and
  normals, a pixel a unit, a storey laid on another lifted by as much; as a
  picture is put together, how high it stands over the ground under every
  pixel (a pixel h high stands over the ground h pixels further down -
  Layers finish).

## The sun

By the hour of the game's clock: up at five behind the walls facing one way,
down at half past nine behind the other - a long day, a short night - lower
and redder towards either end, the shade from sky blue to night's dark blue.
Only when asked for (`lighting.js` setDayNight: N, ☾ in the top bar,
`?daynight=on`, kept in the browser); else always ten in the morning
(STILL), the clock and everything on it going on. `?light=0`: drawn as
painted, by the one sun of old.

## Shadows

By day every building, car and tree drawn - and what is just off screen, as
far as a shadow reaches - stamps what stands over the ground into a map of
the ground on screen (glview stamp). Every pixel then looks along the way to
the sun, a couple of pixels a step over the ground and as much higher as the
sun is, starting a little out from its own side, and is in shadow wherever
something stands higher (LIT_FS shadowed). Long morning and evening, short at
noon, across the road and up the next wall, moving with cars, staying put as
the camera turns, fraying dithered far off. Everything is taken as solid down
to the ground (a crown shadows as a column). None at night.

## Night

- What shines: lit panes, shop and office signs and billboards in their
  colours, street lamps, headlights white, tail lights red (a parked car
  none). Every street light, headlight, tail light and police flash (blue,
  then red) is a lamp, and so is what shines of a building: as it is painted
  its lit pixels are gathered into cells eight across, each a light where it
  is, as high, in its colour, as bright as how much of the cell is lit -
  rising quickly - per way the building is lit and per stage
  (`generatorcore.js` lightsOf); every building lit on screen adds those of
  how it is lit now (`lighting.js` windowLights).
- Every lamp is a little square over just the pixels it can reach, lighting
  each by distance in the world (from screen position and height) and how
  squarely it faces it: headlights in a cone ahead, a street light in a cone
  down - a pool about as wide as the lamp is high, a little spilling to the
  sides below it, none up - so a wall is lit from its foot, never in a band.
- Police lamps and cab signs glow in their colours at every hour (glview
  GLOW). Indicators blink amber at the corners on the side a car turns to
  (`traffic.js` Driver signal, lighting blinkers) - the traffic skill says
  when; hazard lights for a broken-down car or the courier waiting; brake
  lights brighter red than the painted tail lights, more red light behind at
  night (lighting brakeLights).
- When: every finished building puts a few lights on in the hour from half
  past eight, each at its own time, more a while later - never all: every
  storey and tile lit one of two ways, a run of glass pane by pane, about a
  third of the windows first, two thirds with more. Homes and shops keep them
  on till sunrise, offices a few; a building going up has none (windowsOn).
  Street lights on about nine, off about half past five, a block of six by
  six tiles at a time within twenty minutes either side (cityOn); car lamps
  up to three quarters of an hour after, each in its own time (lampsOn).
  Gloomy enough (heavy sky, storm, fog) street lights come on by day, a block
  at a time, and cars put their lamps on.
- Beacons: what stands tall has a red warning light on top blinking in its
  own time, day and night - an office tower on its roof mast, the water
  tower or anything tall that is no home, shop or office on its highest
  point; read off the heights picture (`cachedsprite.js` topOf,
  `lighting.js` beacons). Flats and offices with nothing on the roof have
  none.
- Work lights: the buildings skill (`worklights.js`, lighting workLight).

# Camera, overlays, ground, frames

## Which side (`client/view.js`)

The camera turns round the city a quarter turn at a time (0 to 3,
`Vkaria#turnView`): a finger dragged in from the left or right edge, or Q
and E. Nothing in the world moves - the engine's camera turns about the up
axis and draws things in the order it sees them (`CameraComponent#depthAxes`).
What changes is which picture each thing shows: `view.js` says how the world
looks from the camera's side, in the camera's own terms (the way the world
would have to go unturned to look the same) - a tile's slope by its corners
as seen, a building turned as many more times as the camera, drawn from its
tile nearest the camera's corner. It turns at any time, mid-placing or
shaping too: what is being placed is drawn again from the new side.

## The smooth turn (`client/turner.js`)

- Shown as one smooth turn about the ground under the middle of the screen,
  however high it stands, so it keeps its place. The camera itself turns
  about the sea's level under the middle and is moved for that each side.
- For the while a picture is laid over the game (under the buttons and the
  top bar), the game going on unseen: the side the camera is on and the
  sides it turns to, each drawn zoomed out to take in half as much again
  (OVER) and bare - no cars, no rain, no lightning, no grid, names or signs -
  with the picture of how high each pixel stands (`GLView#readHeights`). Each
  is laid over a mesh lifted that high (the land over the sea, as
  `Carman.groundHeight`), turned about the up axis through the spot, in a
  WebGL canvas of its own: what stands up stays upright and swings round,
  further the taller. Each side into a target of its own, the two mixed, one
  over into the other halfway: what stands up outweighs the ground, the
  ground outweighs a picture's drawn-out edge, all blurred, so where one has
  nothing the other shows. Each side taken once, again if some of it was
  still to be painted.
- Chunks are held while it turns (`Tilesman#hold`), caught up the frame
  after (chunks.md). Done,
  the camera is on the new side, the spot where it was on screen, and the
  picture fades into the game. Q and E turn quickly then ease out, and add
  up. Only hooks into the game: told when a frame is drawn, the city drawn
  bare for a frame, heights handed over (`Lighting#onFrame`, `calm`,
  `GLView#bare`), driven by `cameracontrol.js`.

## Fingers (`client/cameracontrol.js`)

- Pinch: zooms by steps while the fingers move, scaled on the page the rest
  of the way about the spot between them - zoom only, no turning. Pulled onto
  0.5, 1 or 2 (every pixel sharp) within 7% (snapZoom); let go, it settles on
  the nearest of ZOOMS 0.5, 0.667, 1, 1.5, 2 (1x to 5x in the top bar). The
  engine finds fingers where the canvas stands meanwhile
  (`Viewport#restRect`).
- Edge drag (onDragStart): a drag starting within 32 page pixels of the left
  or right edge turns the world - the ground nearest the eye goes with the
  finger, a quarter turn for half the screen's width, back again as it goes
  back - so a turn begun by mistake is undone. Let go: the next side if 30°
  or more round, else back (`turner.js` COMMIT); a second finger does
  nothing. Safari outside a home-screen app may take a very-edge swipe as
  back or forward.

## Over the city

- `glcanvas.js`: the part of a canvas 2D context the drawers use, drawn in
  WebGL into the layer (`glview` flush), in order, over the layer's
  pictures: shapes filled as a canvas fills them (winding counted in the
  stencil; a convex one straight away), lines as strips along each edge,
  dashed as a canvas dashes, every pixel once, never broken on a slope;
  words written on a canvas once, drawn from there while they read the same.
- The grid (`components/terraingridrenderer.js`): lines along every tile edge
  over the ground's pictures, not painted in, so showing or hiding it
  (`terrain.js` showGrid) paints nothing. Through the tiles' corners at their
  heights (water flat at its surface), worked out for the tiles on screen
  and a MARGIN, redrawn only when the camera moves past that, turns, zooms,
  or a tile changes.
- `tileoutline.js`: the outline of a set of tiles - shared edges cancel, the
  rest walked into rings (a ring per piece and per hole; a corner-only touch
  read as two shapes touching), riding the terrain's points, drawn a little
  inside its own area so two areas sharing a border show two lines. A water
  tower's reach, the city's border.
- Words over the world (`serviceman.js`): a tap on nothing (bare ground, a
  tree, the sea) while nothing is looked at puts away the words ("no jobs",
  how far along, the city's name) and the grid - the town on its own, for a
  picture; they stay away while dragging, zooming or turning, and come back
  with the next tap on nothing or anything else (a building tapped, placing,
  shaping, any button).

## Ground and frames

- `groundchunk.js`: a stretch of ground drawn at once (a chunk as it comes
  into view, chunks.md) is one gameObject with its tiles in typed arrays, like a
  tilemap: off screen one test, on screen each tile culled and drawn as a
  sprite would be, in the same order (the ground is not depth-sorted; what
  is drawn over what on a hillside goes by that order). What a tile shows is
  `terrain.js` shapeTile's to say.
- Its tiles are a `shared/draw` draw list (where, to the float as a
  Float32Array kept it; the tile's index as the tag) and a table of pictures
  of its own, one a slot (a slot may show its own `Meanwhile`); the cull is
  `Visible`'s, the engine's to the pixel, and what is on screen is handed
  to the engine's `picture` the last first. A change to it is checked with
  `world:fingerprint`/`world:compare` (IDENTICAL) and `world:chunks`.
- Frame rate: at most 30 a second (`engine/engine/game.js`); the clock and
  the drawing hold still while the page is out of sight (`vkaria.js`). A game
  may draw fewer (city-sim's pace).

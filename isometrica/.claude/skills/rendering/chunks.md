# Which chunks are drawn (`client/tilesman.js`)

The ground is drawn a chunk at a time (`Config.chunkSize` tiles a side: 24,
12 on a small screen; `groundchunk.js`, camera.md Ground and frames). Which
chunks are drawn is worked out with `shared/interest` (skill `world` in
`shared/`) - not round the camera's chunk, and never while the camera is on
its way somewhere.

- **Regions are the leaves of a quadtree** (`shared/spatial` Quadtree), root
  at the world's 0, 0, as deep as it takes for a leaf to be one chunk: 24
  tiles, 12 levels. The leaf is the chunk because the chunk is what is
  drawn, made and let go of; a bigger leaf (the design's 64 tiles) would draw
  more than is seen, and a server's share is a node further up either way. A
  key gives the chunk: `cellX`, `cellZ` times the chunk size. Tiles below 0
  are outside the root and never drawn.
- **The camera is an observer**, its box what it sees of the ground at sea
  level: from the side, the screen's corners along the tiles' axes (they run
  corner to corner across it), so a square that a quarter turn leaves as it
  is; from above, the screen itself, smaller. Heights are not allowed for.
- **Rings**: view entered at 0 (a chunk the box touches), left beyond a
  chunk; near entered at a chunk, left beyond two. A chunk is drawn
  (`tileLoad`, `terrain.draw`) as it comes into view, and let go of
  (`tileRemove`, `terrain.clear`) only once it falls below near. Down a level
  takes `HOLD` (2 s) each, so a chunk is let go of 4 s at the soonest after
  the camera has gone more than two chunks beyond it. Crossing an edge and
  back, turning and the view from above make and let go of nothing.
- **Once a frame**: a camera move only notes that it moved; a ticker
  (`tilesman` in the debug panel) looks again from where the camera ended up
  and settles the levels, which costs what is round the camera. A quarter turn
  takes the camera through the world's origin for a moment
  (`camerascript.js` turn); no frame sees that. `start` works it out once at
  once, so `chunkman.init` finds the chunks round where the camera starts.
- **Held** (`hold`, while the smooth turn takes its pictures): no update at
  all; the next frame after catches up.
- `chunkman` turns `tileLoad`/`tileRemove` into `chunkLoad`/`chunkRemove` for
  `buildman` (building views) and `envman` (trees and stones), so they come
  and go with the ground.

Measured with `npm run world:streams` (made and let go of, counted until
`Tilesman#settle` has passed) and `world:chunks`; what is drawn at load with
`world:fingerprint`/`world:compare` (docs/world.md, Measuring).

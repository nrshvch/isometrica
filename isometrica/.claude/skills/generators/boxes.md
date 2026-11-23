# Painting out of boxes

## isobox (`shared/gen/isobox.js`)

- One ray per pixel straight into a scene of boxes; the pixel is the first
  box it hits, shaded by which way that face looks - every face looking one
  way the same flat colour, so everything is lit alike (buildings, roads,
  vehicles) - unless the box has a finish: a material laid out a pixel at a
  time (MATERIALS: brick courses, stone, siding, logs, precast panels, tiles,
  slates, thatch, felt, steel sheet, asphalt, paving, gravel, grass, sand,
  earth; lined up with tiles and storeys), or the sky reflected, for glass.
  A colour can be made of a material anywhere (`blocks.js` madeOf).
- snap: every box snapped to whole units, so an edge along the ground is a
  clean two-across-one-down step and a band a unit high a line a pixel thick.
  cut: boxes cut by planes for roofs and ramps - slopes, not staircases.
- Units: one along the ground is one pixel across the screen; a tile 32 each
  way; heights in pixels. +x up-right on screen, +y up-left; only faces
  looking up, towards -x and towards -y are ever seen. From straight above
  (setView "top", for the map): +x right, +y up, two pixels a unit, always
  whole tiles.
- Interiors: a box big enough to be rooms is hollow - walls on its faces, a
  bare concrete floor each storey, plastered walls, a wall across where it is
  wide (a storey all glass is an open floor), panes set through the walls,
  darker inside. Where a building runs on into the next tile its side is a
  seam (seamed, clip), rooms open on it: standing whole the next tile covers
  it; with that tile gone the rooms show. A building going up has its
  openings as holes (opening, indoor). Only what can be seen is worked out: a
  box with no seam towards the viewer is painted solid.
- setRuin paints a building burnt or come down out of its own boxes (see the
  buildings skill, coming-down.md, Ruins). setMode: "deferred" and "night"
  layers for the renderer (`shared/gen/looks.js` for the painters that do not
  use boxes: terrain, trees, vehicles).

## Blocks (`shared/gen/blocks.js`, `stacking.js`, `compose.js`)

- A block is put together like toy bricks out of one-tile sections, the same
  sections for every block of a style whatever its size (a 1x1 tower is one
  section with both ends; a two-tile wall two sections). A section's parts,
  each painted on its own: ground (ground storey on its plinth, the way in,
  the pavement), upper (a storey, stacked), roof; and in front, for a block
  with one, a yard tile.
- Going up, parts of the same shape: site (the plinth on bare earth with
  diggers and trucks, dig, or materials, build), frame (a storey of bare
  structure), siteyard (trucks and gravel, a tower crane, or the office).
- Every part in every palette of its style, details in a few variants, each
  painted four ways (front towards -y, then turned a quarter at a time),
  standing on a tile of its own, pivot the middle of the tile on the ground.
  Parts of one tile are laid one over another (`stacking.js` - the rules both
  the generators and the game go by); `client/compoundbuilding.js` picks the
  parts at random per block and keeps them in the save. Colours kept to 16
  bits.
- Backs (`blocks.js` backs): a shop's steel door to its bins (a skip behind a
  big one), air-conditioning units, rain streaks, the odd tag, a wire fence
  round the service yard; flats' bins at the back, units on end walls.
- `compose.js`: a whole building in one, out of parts of any generator that
  paints parts.

## Painted whole and cut into tiles

Houses, shops, civic buildings, the old town, parks, the water tower are
each painted whole and cut into their tiles (onTile), so a shop three tiles
long is one roof. What is picked (design, options, colours) is chosen when it
is placed (`client/compoundbuilding.js`, each generator's FOOTPRINTS /
describe footprints), so the ghost already shows what will be built.

## Foundations (`shared/gen/foundations.js`)

The concrete under a building or road on uneven ground (Transport Tycoon
style): the ground built up to the highest corner, a step at most. A piece is
the concrete between the ground and a level top, cut along the tile's fold
(`shared/gen/terrain.js` fold); what shows is its top and the two front
walls. On the shore the same shape, marked where the water stands (darker
wet concrete, a line of weed, a tide mark). Named by how far each corner is
below the top as seen (`client/view` corner) W, N, E, S, 0 or 1:
`gen/foundations/0011`, `gen/foundations/shore/0011`; pivot the middle of
the tile at the top.

## Building sites (`shared/gen/sites.js`)

The same for every building: bare earth and on each tile one thing - lot
(digger at work, dig; a lorry to cart earth, haul; sand, pile; the office,
cabin; materials; the crane's foot), mast (a storey of the crane's mast,
stacked as high as it must reach), cranetop (the cab), fence (blue tarp on
posts along the site's edges - back stretches laid under everything on the
tile, front ones over it, each turn painted with its own stretches,
partBoxes), rail (a small site's low timber rail). Which tile has what:
`stacking.js` siteTiles, lotTiles. What moves - the digger, the lorry (the
vehicle generator's) and the crane's jib (a frame per heading) - is drawn
over by `client/siterenderer.js`.

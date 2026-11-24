# Ground, climate, trees and stones

## Climate (`core/climate.js`)

The world is hot in the middle (tile 32768, 32768) and frozen at its rim,
ringed in five zones (ZONES), out from the middle:

| Zone     | Ground       | Water  | What grows                                       | Stones                   | From, at 33° |
| -------- | ------------ | ------ | ------------------------------------------------ | ------------------------ | ------------ |
| desert   | `sand_dunes` | open   | nothing                                          | none                     | the middle   |
| savannah | `savannah`   | open   | cacti, prickly pears, dried-out trees, dead wood | sandstone, pale rock, x2 | 2,000 tiles  |
| green    | `grass`      | open   | the woods                                        | grey and brown           | 4,400 tiles  |
| arctic   | `snow`       | frozen | firs and pines snowed over, dying off            | snowed over              | 18,400 tiles |
| north    | `snow`       | frozen | nothing                                          | a few, snowed over       | 24,800 tiles |

- One number, TEMPERATURE (33° in the middle), a degree colder every 400
  tiles out (LAPSE). Zones start at their own temperatures (savannah 28°,
  green 22°, arctic -13°, north -29°), so a degree warmer moves every zone 400
  tiles out. city-sim's starting city (5,600 tiles out) and food-rider's
  (15,100) are in the green.
- The rings wander a few degrees over a few thousand tiles (heat); zones mix
  over 800 tiles either side of a border (BLEND, 2°), patches first, then
  more. Where two grounds meet, the later in the painter's PRECEDENCE (snow
  over grass, savannah over grass, sand over savannah) spills ragged over
  the other's edges - no line along the tiles anywhere.
- Never saved: worked out from where a tile is. A new zone is a row of
  ZONES, its ground a terrain tileset.

## Woods, trees, stones

- `core/woods.js`: woods of their own (spruce forest, pine woods, birch
  groves, broadleaf beech/oak/ash, alder by the water, meadow with an odd
  oak), each a noise field - the highest field grows there, shading into the
  next over a few tiles; spruce likes it high, alder wet; thicker and thinner,
  glades, each kind in clumps. The woods go on whatever the climate; only
  what grows changes (FLORA): in the arctic firs and pines snowed over (some
  where broadleaf would be), a dead trunk now and then; pines die off at -19°
  to -23°, firs at -21° to -25°, dead trunks only to -29°, then nothing. On
  the savannah cacti and prickly pears where a tree would live, dried-out
  trees where one would be dead, bleached dead wood, fewer towards the
  desert. `core/ambient.js` places trees and stones (ROCKS: which stones,
  how many, per zone).
- Trees (`shared/gen/trees.js`, `data/trees.js`): pixel art in the buildings'
  manner - a kind's own shape (oak, beech, ash, alder, birch, pine, spruce)
  in three flat greens and two browns or greys, lit by the boxes' sun, tones
  in patches (a lone pixel takes its neighbours' tone). Cold kinds snowed
  over ("snowspruce", "snowsnag"...), desert dead wood ("drystump"...), the
  dead tree ("deadtree"), "cactus", "pricklypear". Two seeds each, each
  painted from four sides (`gen/trees/oak-1/r1`) - two of the same seed side
  by side may show different sides (`data/trees` turned). A tree tall enough
  is painted falling each of four ways a third, two thirds and lying
  (FALLS, FALL_FRAME: `gen/trees/oak-1/r1/x+/1`). Shadows short (a higher
  sun), cast by the renderer (`client/glview.js` shadowed). Every tree is a
  building of the tree class; only the world puts down dead wood and desert
  kinds; the first oak and beech keep the hand-drawn trees' codes.
- Stones (`shared/gen/stones.js`, `data/rocks.js`): a tile's worth to a
  picture - "stone" (five grey boulders, the thick of a rock field),
  "stone0" (three brownish, its edges), "-m" mirrored, four sides each
  (`stone/r1`); "snowstone", "desertstone" variants; lit in four tones, a
  black see-through shadow. Rubble: "rubble", "rubble0", and blast piles
  "pile/<rubble>/<mask>[/<slope>]" that join their neighbours and lie on the
  slope (PILE_RISE). Pivot 32, 24. Rocks are only to look at; a new one goes
  on the end of `data/rocks.js`.

## Terrain (`shared/gen/terrain.js`)

- Tilesets in the nineteen slopes, the game's tile size and outline, lit by
  the buildings' sun: base tiles (a few variants), diffuse tiles (the ground
  spilling over an edge ne/se/sw/nw or a corner n/e/s/w, see-through
  elsewhere, reaching exactly edge.depth at the edge's corners so any two
  pieces meet). PRECEDENCE settles which of two spills over the other; the
  manifest spells the pairs out.
- Water meets land as a shore tile per slope: water a little up the lowest
  part, wet sand, sand, then the ground, ragged lines - by height, so a
  shore runs on unbroken. Shallows' shore, deep water's own, ice's with
  frost. Deep water spills over the shallows in a ragged dithered contour.
- Grass with lusher clumps, drier patches, blades, clover, an odd flower;
  water with swell and ripples; sand, snow, ice; "earth" and
  "earth_regrowing" for cleared ground. The grid is laid over the tiles
  (see-through black), not painted in. `fold` - the diagonal a tile folds
  along - is shared with foundations and piles.
- Painted into plain {width, height, data RGBA} - in the game as it starts
  (`client/generated.js`) and by `tools/genterrain.js`.
- The snow, ice and desert tiles came from the `terrain-asset-generation`
  branch; its other grounds (mountain rock, tropical and northern grass,
  southern grass) are in the painter but not the game - the sprite gallery
  marks them "not in the game", and the game is not told of them
  (`shared/gen/catalog` describe all).

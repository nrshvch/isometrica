# Smoke, worked out (`client/smoke.js`)

Smoke is an effect (engine/docs/world.md, Three kinds of things): nothing of
a puff is kept or ticked. A puff is a function of its source, its seed and
the time; every frame the puffs alive are worked out into one draw list and
drawn in one batch. The pictures are the generators' (`shared/gen/smoke.js`,
generators skill, roads-vehicles-smoke.md).

## Kinds

`Smoke.steam`, `soot`, `debris`, `dust`, `plume`, `cloud`, `fire` - plain
objects (looks, ttl, rise, cools, peak, thick, solid, aloft), made columns
by `kindOf` the first time one is used; a fire's own plume
(`client/fires.js` plumeOf) is a kind of its own the same way. A kind's
pictures are numbers in one `Pictures` table (shared/draw), six a kind.

## A puff at a time t

- **Where** (`place`): its start, plus the integral of what it used to do a
  frame at a time - rising `rise` slower and slower as it cools (`cools`,
  0.65 unless said), the less the harder it blows; drifting with the wind
  by 0.3 + u of it (u: how far through its life), or up high (`aloft`) by
  0.1 + 1.8 u² of a wind at least `aloft` hard; thrown out (vx, vz) and
  slowing as (1 - u)². Each is a sum of the wind's integral and its moments
  over the puff's life: `shared/integral` keeps the wind (and how much of
  the rise it leaves) held 100 ms at a time, two minutes back, so a puff of
  any age costs a few sums, never a step per frame of its life.
- **How**: frame `floor(u × 6)`, held by its middle; as thick as `thick`
  rising to `peak`, thinning after (or `solid`, not see-through at all, till
  then); dithered, lit where it is in the air (`over`, how high over the
  ground under where it came out).
- **The wind** (`client/wind.js`) is a function of the world's clock
  (`time.now`, a date - the same for everyone at the same moment), which the
  clouds go by as well (`lighting.js`); `Wind.factor`, the weather's, is
  read as each 100 ms is first integrated.

## Sources

- **Chimneys** are rows of a `Store` - where the top is in the world, the
  ground under it, the house's tile and which chimney (its seed) - in a
  `GridIndex` a chunk to a cell. A building view puts its chimneys in as it
  is drawn (`Smoke.chimneys`, `client/buildingview.js`) and takes them out
  as it is drawn again or let go of (`Smoke.release`). Every frame the
  chimneys within reach of what the camera sees (`Tilesman#seen`, grown by
  `reach`: the furthest the hardest wind takes a puff in its life, its rise,
  a house's height) are found by region; nothing goes over the others.
- A chimney's puffs come every `PUFF_EVERY` (800 ms), each its own way
  either side of its turn (`JITTER`, a toss), from a phase of its own (a
  toss) - so the puffs alive at t are the turns of the last ttl, worked out
  from t alone. One comes only while its house's fire is going: a toss of
  the tile, the chimney and a while of its own (`RETHINK`, 3 min, shifted
  per chimney) against how many houses have a fire at that hour (`lit`,
  noted a second at a time as it goes by, `shareAt`, so the hour turning
  takes away no puff already out); and only while somebody lives there
  (`city.missing`, looked at again every 2 s).
- **Puffs let out once** - a car's exhaust or fire (`client/carman.js`), a
  burning building (`fires.js`), a blast (`explosion.js`, `collapse.js`), a
  demolition, a bulldozer, a tree falling, food-rider's courier - go
  through `Smoke.puff(world, x, y, z, kind, vx, vz)`: a row of where, when
  and what, worked out like a chimney's and taken out once its life is over.
  When they are let out is still their emitter's.
- `Smoke.sample(t)` gives the chimneys' puffs at t round the camera:
  `npm run world:smoke` asks it twice, and again after going twelve chunks
  away and back, and finds the same.

## Drawn

- `Lighting.particles` is the smoke: after the buildings layer has handed
  over its pictures, `Smoke.draw` culls the list (shared/draw `Visible`, the
  engine's cull) and hands each puff to `Lighting#particle`, the floats of
  its picture got once a frame (`glQuad`). `GLView#particles` marks where
  the layer's particles start; `flush` draws the rest of the layer, then
  them in one batch (`drawParticles`) - into the colours, ways and heights,
  at night what shines, and by day the map of what stands over the ground.
- Not sorted in among the buildings: drawn after them with the depth buffer
  (`LEQUAL`), every pixel of a puff as near as its middle and half its
  height nearer (the shader's `billboard`), so what stands in front of it
  hides it and nothing behind does. With `?light=0` they go over the layer
  as they are.
- Debug panel: the `smoke` section, counters `smoke sources`, `puffs`,
  `puffs on screen`, `puffs drawn` (those with their pictures painted).

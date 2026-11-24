# Roads, vehicles, smoke

## Roads (`shared/gen/roads.js`)

- Out of boxes: a piece for every way a tile joins its neighbours, a ramp for
  every slope under a straight one. Four ways: plain (asphalt, gravel edges,
  a dashed line - the country), paved (kerbs, pavements round the corners,
  zebra crossings over junctions - a street with buildings on it), gravel (a
  village lane, paler where wheels go), cobble (setts between darker
  gutters - the old town) and cobble-paved (with pavements of stone flags).
- One-way: an arrow down a straight piece instead of the line (white on
  asphalt, darker stones on gravel, paler among cobbles), no dashes up a
  ramp.
- Street lights are sprites of their own (tall, drawn among buildings and
  cars): an arm over asphalt, a lantern on a cast-iron post along cobbles. A
  light on every other tile, on one side's pavement in the world (so it stays
  put as the camera turns), in the corner on a bend or junction with its arm
  over one road - painted per side, corner and arm, `client/roadview.js`
  picking the one for the camera.
- Bus stop shelters: glass, a bench, the sign on a post, one each side;
  green cast iron on cobbles, wooden on a gravel verge.
- Which piece: `client/road.js` / `client/roadman.js` paved - paved where
  the road is part of the city's network and has a building next to it,
  plain in the country or off the network, changing as buildings come and
  go.
- Being laid: the "dug" and "bed" works pieces (buildings skill).
- Town limit signs (townSign, `gen/roads/limit/in0`-`3`, `out0`-`3`): a pair
  on grey steel posts on the verge at one side of a tile, a bus-stop-sized
  plate, no words. The way in on the right of whoever comes in (traffic keeps
  right): black houses and a spire on white; the way out on the other verge,
  struck through red. A game says which roads have them and on which side
  (its play's `townSignsOn`, `client/roadview.js` townSignsOf) from what it
  last worked out - never working anything out as a road is drawn, nor while
  the preloader looks out another side. city-sim puts them where a road
  crosses its border.
- Units: a tile 32 (~10 m), asphalt 20 across (two lanes of cars, the way
  `client/carman.js` drives them), a step 8 high.

## Vehicles (`shared/gen/vehicles.js`)

Cars, vans, trucks, lorries, buses, and the site machines (bulldozer,
excavator, lorry) that never drive the streets. A handful of boxes (body,
cabin, windows, wheels, lights) seen as the game sees the world, so every body
type comes in every colour lit alike. Painted eight ways: along x or y,
towards + or -, and the four diagonals (cutting a corner, pulling over) - a
truck driving away keeps its cab in front and the light on the same side. The
lit bits are laid over, one picture per flash. `describe()` also gives speeds,
pivots and where the exhaust smoke comes out. Units: a tile 32, a road about
20, a lane 10; a car 13 by 6.

## Smoke (`shared/gen/smoke.js`)

A puff in frames 0..FRAMES-1 as it grows rising: "steam<f>" (white, a
chimney), "soot<f>" (black, an engine on fire, greyer higher up), "dust<f>"
(brown, ground being cleared, paler as it settles), "debris<f>" (grey, a
building coming down), "fire<f>" (a fireball, white-hot to orange to dull
red going to soot), "plume<f>" (black smoke off a burning building),
"cloud<f>" (the dust a blast raises, rolling down the streets). A soft round
lump, lumpy edge, lit from above-left, darker underneath, its edge broken up
every other pixel - thinner as it grows. Fading is not painted:
`client/smoke.js` fades it, grows it slower and slower and
drifts it with the wind (higher, more), worked out from where and when it
came out (rendering skill, smoke.md); a car's exhaust puff is bigger, out
three or more times as often, rising twice as fast. Chimneys smoke only
while a fire is going in the house - most houses mornings and evenings, few at midday or in the small
hours, each deciding every few minutes - one thin wisp at a time. Smoke is
dithered, not blended (a 4x4 pattern from the world's origin, the sprite
renderer's `dither`), and lit where it is in the air, by the sun and at night
a lamp near it (`over`).

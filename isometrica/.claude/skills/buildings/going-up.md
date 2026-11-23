# Going up

## Building sites

- Every building goes up on a site (`shared/gen/sites.js`): bare earth, on
  each tile one of an excavator, a lorry, a heap of sand, the site office or
  a tower crane, dealt out per building (`shared/gen/stacking.js`), a blue
  tarp fence round it all. A small building (park, village cottage or farm,
  a one-tile house or shop) has no crane and a low timber rail
  (`client/compoundbuilding.js` smallSite).
- A block of flats or offices grows its own structure from a quarter of the
  way, its lower storeys finishing under it from halfway; the crane (steel
  lattice mast sections) grows with it. The excavator drives, stops and
  turns to dig; the jib swings (`client/siterenderer.js`) - each heading
  drawn with the crane under it as one picture, so it stands and shadows
  from the crane's height (`compoundbuilding.js` jibFrame,
  `cachedsprite.js` footOf, `glview.js` shadowed). Lorry and excavator are
  the vehicle generator's; the excavator never drives the streets.
- What it cost floats up over how far along it is
  (`client/buildman.js` showConstructionCost).
- While a selection is dragged about, its buildings keep their looks; only
  a selection of another size picks again. Any building turns four ways
  (`core/rotation.js`); blocks are painted from all four sides.

## Clearing ground

- Ground cleared (`client/clearworks.js`) is gone from the world as soon as
  it is paid for (`core/city.js` clearTile); what stood on it - trees,
  stones, a planted tree, a road - stays standing (`client/envman.js`,
  `buildman.js` hold; roads keep joining, `roadman.js` seenRoad) till a
  bulldozer gets there (`shared/gen/vehicles.js` bulldozer): then it goes
  in a cloud of dust (`shared/gen/smoke.js` dust) and the tile is bare
  earth. Not kept: after a reload the ground is bare.
- Tiles that hang together (corners touching) are one stretch, swept a row
  at a time along the longer way, a bulldozer to every six tiles or so,
  each backing up and pushing on over every tile; ground cleared next to
  ground being cleared is shared out afresh among the bulldozers already
  there. Bulldozers have an amber beacon, lamps after dark.
- A tall tree goes over (`client/felling.js`): shudders as the blade bites,
  falls the way it is pushed through the pictures of it going over
  (`shared/gen/trees.js` FALLS: `gen/trees/oak-1/r1/x+/1`..`/3`), a puff of
  dust along it, lies a moment, dithers away. A stump, wood, a stone just
  goes; seen from straight above or turned mid-fall, it is gone too.
- Till a bulldozer has been over it, a tile is being cleared
  (`core/terrain.js` beingCleared): nothing built, no road, no shaping.
- Cleared or reshaped earth lies bare for half a day of game time
  (`core/terrain.js` REGROWS, bareFor - saved), its edge churned over the
  grass (`shared/gen/terrain.js` earth), then grass spills back in a tile at
  a time (earth_regrowing; `client/terrain.js` groundOf, Regrowth). A tile
  whose ground changes is drawn as it was till its new picture is painted,
  never black (`client/terrain.js` Meanwhile).
- What clearing cost floats up once, over all the ground picked.

## A building waits for its ground

A building put up is not put up till its ground is cleared, bare or not
(`core/city/citybuildings.js` buildBuilding, `core/construction.js`
awaitClearing; bulldozers sent by `client/clearworks.js` sweep). Nothing of
it is drawn but how far along it is, which runs on by its time but stops at
a tenth till the bulldozers are done. Put up by Replace, its ground is
cleared already. Demolished or replaced while it waits, it is called off for
nothing, its ground cleared all the same (`city.js` demolitionOf). After a
reload it goes on from as far along as it was.

## Roads being laid

- A road takes `constructionTime` (`data/buildings.js`), in two stages: the
  earth dug out over the first half, a bed of crushed stone rolled in over
  the second (`client/road.js` stage, `shared/gen/roads.js` works, "dug" and
  "bed"). Nothing drives on it and it is no part of the network
  (`core/city/cityroads.js`) till finished (`client/roadman.js` keeps the
  roads being laid apart).
- Each stretch that hangs together is a section closed off with barriers -
  striped boards, an amber lamp blinking each end - where it meets a
  finished road and across its ends (`client/roadview.js` barriersOf).
- A crew per section (`client/roadworks.js`), one to every six tiles or so
  of a long one: the excavator end to end, stopping each tile to turn and
  dig, a lorry a tile behind; then back, the lorry ahead tipping stone, the
  excavator spreading it. Positions come from how far along the road is -
  the same after a reload.
- A run the player drags is laid at once (`Road.plan`): each tile gets the
  surface that joins up most - with the run and with roads already there
  (which stay as they are; those dragged over count double) - and then the
  least concrete. Across a slope it levels, up a slope it ramps, onto a
  levelled road it climbs, alone it follows the ground. Deterministic, so
  the preview is what gets built.

## Surfaces and foundations

- Every building and road stands on a surface of its own (`core/surface.js`:
  heights at corners A, B, C, D of a tile), saved with it. A building's is
  flat at the highest corner under it - allowed while the ground falls no
  more than a step anywhere under it (`core/buildings.js`). A road's is flat
  or a ramp (one side a step over the other).
- Where a surface is over the ground it stands on concrete
  (`client/buildingview.js` addFoundations, `roadview.js` addBase,
  `shared/gen/foundations.js`), picked as the tile is seen so it turns with
  the camera. Never in the water; on the shore flat only, the base marked
  where the water stands (wet below, weed, tide mark). A shore road is
  always levelled on such a base.
- Roads join, and cars cross, only where they meet level all along the edge.
  A road up on concrete is drawn among the buildings, not under them
  (`roadview.js` SINK).
- Raising and lowering land (`core/city.js` terraform), OpenTTD-style:
  whatever stands stays where its surface still fits the new ground, the
  concrete taking up the difference; anything that would not fit (under the
  ground, over a step above it, in the water, a ramp on the shore) is in the
  way.

## Work lights

`client/worklights.js`: amber beacons on site and road-work machines, their
work lamps after dark, floodlights by a site's office and sand, a red light
on a crane's peak and a floodlight under its cab. Each is a pixel or two
glowing whatever the light (`client/glview.js` GLOW), hidden behind what is
in front, lighting round it at night (`client/lighting.js` workLight). The
light format is documented at the top of `worklights.js`.

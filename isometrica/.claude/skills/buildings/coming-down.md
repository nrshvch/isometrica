# Coming down

Three ways: demolished (bulldozers, fenced), blown up or knocked down by a
blast (no fence, no bulldozers), burnt (a day of game time). All of them end
in rubble or a ruin that stands till it is cleared away.

## Demolition

- `core/city.js` clearTile demolishes a building whole, whichever tile was
  picked, paid by the tile once. The world keeps it while it comes down:
  `building.demolishing` (out of service, nobody in it) and which tiles are
  down, each told once its rubble is pushed away (`city.js` tileDown); gone
  with its last tile. Both saved: a reload finds it as far down as it was,
  and asking again sends bulldozers for the rest, for nothing.
- Being demolished it is the bulldozers' alone (see SKILL.md, Must hold);
  `building.js` hazards and fallsLater skip it; a fire is put out
  (`client/fires.js` look), what it burnt to standing behind the fence.
- `Demolition` (`client/demolition.js`) is told when each tile is to come
  down and when its rubble is pushed away - by the bulldozers in the game
  (`client/buildman.js` onDemolish, `client/clearworks.js` hold, knock), by
  a button on a bench. It stands in for the building (demolitionOf), the
  building's own view drawing nothing.
- Fenced at once with the site's blue tarp (`shared/gen/sites.js` fence)
  along every edge, a gate mid-front; the back stretch of a tile drawn just
  behind it, the front just in front. It stands as drawn, shadow and all,
  lights out (`client/lighting.js` dark).
- A tile comes down when a bulldozer reaches it, the bulldozer waiting off
  it: the picture is taken apart into floors (slice), each drawn where its
  tile is however high (seat) - the parts it was built of
  (`client/compoundbuilding.js`), or for a picture painted whole, storey-high
  bands (`client/spritecache.js` getComposite clip), the foot staying put.
  It shakes; a floor gives and everything over it drops, floor onto floor,
  down onto the foot, nothing into the ground. A crushed floor bursts into
  pieces of its picture that fly, bounce, lie and go (burst), and dithers
  away in grey dust (`shared/gen/smoke.js` debris) rolling over the rubble
  (`shared/gen/stones.js` rubble) the bulldozer then pushes away.
- A tile left standing when the one in front of it comes down is drawn open,
  its rooms empty (Demolition open; buildings are built inside, see
  `shared/gen/isobox.js`).

## Blown up and blast damage

- `core/city.js` explode: the building is gone from the world at once -
  rubble on every tile of the building itself (`data/buildings` rubble),
  its yard wrecked, not rubble. Which tiles are only yard is the client's
  to say (`client/yards.js`; saved on the building as `yards`). Errors:
  NOTHING_TO_CLEAR (nothing, a tree, a road), BEING_CLEARED (demolishing).
- `blast` works out what it hits: every building within reach of the parts
  that went up (not the yard; not trees, rubble or roads), every tile of it
  in reach and how hard, by distance (BLAST). `hit` takes those parts down
  (Building knock, saved as `down`) and its `health` down by the damage, or
  all of it (bringDown) as falls says. Trees in reach go over.
- Health (0..100, saved) also decides what comes down or catches fire by
  itself later: under HAZARD (50) it may (`building.js` hazards,
  fallsLater), the less health the sooner.
- Drawn (`client/explosion.js`): charges flash at its foot, it shakes, a
  fireball out of the building (not its yard; SmokeScript fire), pieces torn
  off every floor flung any way and high, falling all round; what is left
  stands blackened an instant (`client/burnt.js` "c"), then comes down a
  tile at a time, floor onto floor, tiles behind left open, rubble coming up
  under the dust, smouldering a while (`client/fires.js`). A cloud of dust
  rolls out and hangs (SmokeScript cloud) while what the blast took the
  health out of comes down too, nearest first (`client/buildman.js`
  explode, `client/collapse.js`). Turned round, it is down at once.
- Rubble heaps (`client/rubble.js`) are one pile per building: each runs on
  into the same building's heaps beside it, over corners where four meet
  (`shared/gen/stones.js` pile), lying on the slope as it is. A heap the
  bulldozers have not reached stays (buildman held).

## Fire

- `core/city.js` fireUp sets a finished building on fire, for nothing (not
  a tree, road, one going up, burning, burnt, or being demolished);
  `building.js` ignite keeps when (`fire`, saved), nobody in it, it makes
  and costs nothing (BuildingState burning). It goes by game time from
  then: BURNS, then what is left burns on (REMAINS), smoulders
  (SMOULDERS), and is a cold ruin till cleared - a day in all.
- It catches in a low window and spreads window by window along that floor
  of that tile, then to the same floor of the tiles beside it and the floor
  above - up and across, down only slowly - till every window burns
  (`client/fires.js` Blaze). Flames out of every burning window
  (FireRenderer: white-hot root to orange and red, flickering, lighting
  round at night), soot over each, sparks; smoke out of the windows and a
  black column off the top as big as the building (SmokeScript plume),
  thicker as more burns, drifting with the wind.
- Lights stay on where the wires hold and go out as it burns out; then it
  stands gutted or as a roofless shell, or falls floor onto floor in dust
  and smoke (fall), the ruin burning on and smouldering.
- What it burns to (`core/burning.js`), by how it is built - most of a kind
  one way, a few another (WAYS), the same each time for a building:
  "frame" (concrete frame: flats, offices, department store, waterworks) -
  gutted, frame and floors standing, may come down hours later
  (collapsesAt); "walls" (brick or stone under timber or steel: bungalow,
  shop, supermarket, mall, market hall, church, town hall) - roof gone,
  walls standing; "fallen" (timber, or two storeys under a tiled roof:
  cottage, farm, croft, old town houses, town house, terrace, villa) -
  floors fallen in, stumps of the ground floor round charred beams.

## Ruins

- `client/ruin.js` draws what is left tile by tile as it stood, painted by
  the generators that painted it out of its own boxes and colours
  (`shared/gen/isobox.js` setRuin): "k" gutted frame, "s" walls standing,
  "b" burnt and fallen in, "c" come down (not burnt). Its yard is as it was.
  A building painted whole (church, water tower) is its picture burnt down
  instead (`client/burnt.js` "r").
- `client/burnt.js` - burning a picture's parts before they are put together
  (by how high each pixel stands): "r:seed:keep" walls broken off and
  charred, the frame's posts standing, the yard sooted and strewn; "y:seed"
  ground sooted. On a whole picture: "c:seed:level" charring 0..100 while it
  burns or after a blast.

# What the buildings are

## Tiers and footprints

Housing and commerce come in three tiers each, every tier on every footprint:
2x1, 3x1 along the street; 1x2, 1x3 end on to it; 2x2, 2x3, 3x2 (first number
along the street, second back from it); 3x3 for villas, the central park and
the old town's centre. The catalogue keeps each tier together, its footprint
on every card.

- Housing (`data/houses.js`): the village (cottages, farms, a croft - only
  need to stand with the village, no water, no jobs in town), town houses
  (bungalows, two-storey, terraced, semi-detached), then villas (few people,
  much land, paying a lot) or blocks of flats (`data/flats.js`: many people on
  little land, paying little).
- Commerce (`data/shops.js`): small shops; stores (supermarket, superstore,
  department store, shopping centre or market hall); then farmers' markets or
  office blocks (`data/offices.js`). They make money with the people working
  in them.
- What a building holds or employs, makes and costs goes by its tier and how
  many tiles it covers, nothing else (BY_TILES): footprints of the same size
  are the same building laid out another way; more tiles, a little more for
  each. The tables are at the top of `data/houses.js` and `data/shops.js`,
  in `data/oldtown.js`. For example houses: village 2 tiles 5 heads $4,500,
  3 tiles 8 for $8,000, 6 tiles 17 for $20,000; town 2 tiles 8 for $13,000;
  villa 2 tiles 5 for $30,000. Shops: small 1 tile 16 jobs $9,000; stores 2
  tiles 56 jobs $38,000; markets 2 tiles 20 jobs $12,000. Old town: lane 1x2
  $6,000 10 jobs ... centre 3x3 $31,000 52 jobs.
- Roads wanted: everything must stand with the city
  (`core/city/cityroads` linked); houses in town, shops, offices and the town
  hall also want at least a cobbled street right alongside (asphalt will do;
  `core/roadrules` serves) - "no road (cobble)" on the card. The village, the
  old town, the church, a square, a park, a water tower and a pump station
  want no road.
- No longer offered, kept hidden for cities that have them: the village house
  on 1x1, the hamlet on 3x1 (replacedBy the croft along the street), villas on
  one row of tiles, blocks/stores/shops replaced by a tower or a shop on the
  street with yards or car parks beside it.

## Houses (`shared/gen/houses.js`)

Four kinds, each a building for every footprint it comes in, every house
picked at random among its designs and options:

- village: a cottage (whitewashed under beams, logs, stone or ochre; thatch,
  red tiles or slate) with a vegetable patch and hens, an orchard and
  beehives, a well, a woodpile and goat, or flowers; a farmstead on two (barn
  and cows, wheat, or sheep behind); a croft on three, or along the street on
  three facing a lane up its side; hamlets side by side (beside); a longhouse
  (house and byre under one roof); a farm round its yard. No fences.
- town: fences or hedges; a bungalow with garage along the street (set back
  on bigger lots, a car on the drive, a back garden); a bungalow end on with
  a carport; a two-storey house end on, drive to a garage at the back (on
  three tiles a long garden); terraces under one roof with back gardens.
- semi-detached: a pair on four tiles, each half with parking, gate and
  fence; on six, two along and three deep with back gardens.
- villas: two storeys on a terrace up steps behind a wrought-iron gate in a
  hedge or wall, lawns, cypresses, box, a fountain or a pool; on nine tiles
  an estate with a pool house.
- Scale is the cars' and roads': what does not fit a footprint is left for a
  bigger one. Cars on drives and in car parks are not painted: they are the
  vehicle generator's, different per building (`blocks` baysOverlay); what
  of a house stands in front of them is drawn again over them (cover), so a
  car behind a hedge stays behind it whichever way the house is turned - the
  same for a site's front fence over its digger and lorry. A house goes up
  as the common site, then its walls on their slab (site). Smoke rises from
  chimneys of houses lived in while a fire is going.

## Shops (`shared/gen/shops.js`)

One building cut into tiles, not grown storey by storey. One catalogue entry
per tier and footprint stands for several designs: 1x1 corner shop (flat
roof behind a false front, gable or lean-to; door middle, corner or either
side; a firm's striped awning or none; fascia or side board); 1x2 shop with a
car park; parades and rows with car parks (along, besideParking); 2x2
superstore behind its car park in a firm's colours; 2x3 shopping centre
(glass vault) or market hall; superstores along the street or behind a
three-tile car park (bigboxAt); department stores of two floors with a glass
lantern (departmentAt); farmers' markets - stalls under striped canopies on
cobbles or slabs (openMarketAt), under a timber roof on posts
(coveredMarketAt), or by a glass hall (marketHallAt), a farm trailer of hay
and pumpkins. Big ones have a pole sign. Goes up as a site, then its steel
frame.

## Blocks of flats and offices (`shared/gen/flats.js`, `offices.js`)

- Flats: ground (way in under a canopy), upper (windows, balconies), roof
  (parapet, the way out, vents), frame (concrete columns, stairwell first,
  scaffolding). Yard: a playground, a car park, a lawn with trees.
- Offices: the same sections a little deeper and all glass - a glass lobby,
  curtain wall (a grid, or ribbons between spandrel bands), a flat roof with
  the lift room and AC units or a mast; frame a steel frame round the lift
  shaft. Yard: a car park, or a plaza with a fountain or sculpture.
- Both: walls with a faint grain, glass with the sky in it (`blocks` MATTE,
  GLASSY). A wall up to three sections long, a row or two of yard in front;
  on 2x1 and 3x1 a tower of one section on the street, yards beside it.
  Two to four storeys. A block grows its own structure from a quarter of the
  way up.

## The town's own (`shared/gen/civic.js`, `data/civic.js`)

A church on 1x2 end on (tower at the front half as high again as the old
town's, clock and bells under a spire, nave with tall windows between
buttresses, whitewashed or dark red brick, a churchyard); a town hall on 1x2
or 2x1 (white with a portico and a dome, cream with a clock tower,
clapboard with a bell cupola, or brick with the clock in its gable) behind a
forecourt with its flag; a square on 1x1 (slabs or cobbles, benches, trees in
tubs, lamps, an advertising column, food stand, ice cream cart, or nothing).
They earn nothing; the church and the town hall employ people; the town hall
wants a cobbled street and water. Squares side by side make a bigger one.

## The old town (`shared/gen/oldtown.js`, `data/oldtown.js`)

What a village trades in from the first day, next to its cottages, and the
town's old town later: no water, no street needed (gravel laid next to it is
cobbled, `client/road` materialAt), its money made by the cottagers working
in it. Narrow tall houses, half-timbered or rendered in ochre, rose, sky
blue, sage or stone, gables to the lanes, craftsmen's shops (smith, baker,
cooper, potter, weaver) with signs over the lane; 1x2/1x3 a lane or a yard
with a smithy; 2x2 a market square or a church; 2x3 a square before a church
or a street of craftsmen; 3x3 all of it with a guild hall and fountain. Either
way round (side). Nothing tall near its edges: two side by side make one
town. It goes up as a masons' yard (stone, oak, an ox cart, the lime pit, a
treadwheel crane; site, LOTS), then rubble footings, then oak frames in pole
scaffolding. The wall (`client/compoundbuilding.js` walled) runs along every
edge with no old town beyond - stone with battlements, a tower where two
stretches meet, a gatehouse where a road comes up and mid-front - worked out
as it is drawn, again as anything next to it changes.

## Parks (`shared/gen/parks.js`, `data/parks.js`)

Every footprint 1x1, 1x2, 1x3, 2x2, 2x3, 3x3 in three kinds picked when
placed: sports (basketball, half a court on one tile, tennis on three, a
skate spot, in a wire fence; not on 3x3), garden (paved walks, a fountain
where they cross, box-edged beds), city (gravel walks among trees, benches,
bins, lamps, a fountain or pond on bigger ones); woods on 3x3 only (a loop
walk, a clearing with picnic tables or a pond). Two variants each. Goes up as
a site, graded with walks (stage 1), then grassed and paved (stage 2). Lamps
and court floodlights come on with the street lights (`client/buildingview.js`
lightsOf "park"). Needs no road or water, earns nothing.

## Water (`shared/gen/utilities.js`)

A water tower in one of four designs picked when placed: goblet (concrete
bowl on a shaft banded red and white), steel (slim tank on a column, a
ladder), stack (square precast shaft, three lens tanks up its side,
aerials), brick (round shaft, wider steel tank, a railing). A pump station on
2x2 (STATIONS: Victorian engine house with its chimney and tank, a pump hall
with two tanks, a reservoir under a grassed mound with its valve house)
waters three times as far at four times the upkeep. Each its own colour and a
blue band; anything round laid out in unit columns (`blocks` shaded).
Stages: shaft (1), tank on top (2).

## Brands (`shared/gen/brands.js`)

bolt (builders' merchant: orange and charcoal, hazard stripes), orchard
(grocer: green and yellow, leaning stripes and a fruit), pillar (bank: navy
and gold, three columns), blaze (burger bar: red and yellow, a bun), amber
(brewery: amber and cream, a sunset over the sea) - on fascias, awnings,
superstores' bands, pole signs, office billboards, delivery trucks and vans.
`panel(w, h)`: w by h cells from the bottom left, the emblem where there is
room, a pattern on a band under 4 high.

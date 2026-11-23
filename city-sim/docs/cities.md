# Cities

## Founding

**Done.** A city is founded by placing its first village house, the way a
place really starts: a family or a few of them settle somewhere, and pool
money for what none of them could do alone, a road first. Nikolaevsk in
Alaska was five families in 1968, on land bought with a grant
([references](references.md#real-towns)).

- There is no step of picking a tile to found on. With no city yet, "Found a
  city" opens the catalogue on everything there is to build: a village's
  house is the natural start, needing no road, no water, no jobs, but a
  city can be founded with whatever goes up first. The dice next to it,
  "Elsewhere", takes the camera off to somewhere else a town could go up -
  room for a town hall there - about where it was first rolled (`roll` in
  `isometrica/src/client/cityman.js`).
- The first house is the city on its own: a family moves in as soon as it is
  finished, and pays its taxes from then on - no road needed.
- The one picked is put down like any building, and priced out of what a
  city starts with (`City.quoteFounding` in `isometrica/src/core/city.js`).
  Done asks for the city's name; the city is founded where the first of them
  goes up, and they are built in it (`found` in
  `isometrica/src/client/buildman.js`). Cancelling the name goes back to
  placing it.
- The town hall comes later, once the town has grown into one: it wants a
  cobbled street and water (`isometrica/src/data/civic.js`).
- A city starts with $100,000 (`CityResources.START` in
  `isometrica/src/core/city/cityresources.js`): the founders' savings, enough
  for a village and the start of a town. The numbers are to be tuned.

## Growing by what it needs

**Done** (in the data). A village needs nothing but to hold together: village
houses want only to stand with the city - near another of its buildings, or
a road - and no water and no jobs in town; their fields are in their
footprints. Parks, squares, the church and the old town want the same. Town
houses want a cobbled street and water, and so does everything after them
(`isometrica/src/data/houses.js`). A player who wants something more than a
village has to lay streets and bring water in; one who does not can grow a
village without end, with no roads at all - the poorest use of the land
there is, at $20 a head. The numbers are to be tuned.

## What the city is

**Done.** There is no land to buy. The city's area says where the city is
(`isometrica/src/core/city/cityroads.js`):

1. Every building has an area round it: what is
   within two tiles of each of its tiles (`CityRoads.RADIUS`, `AREA`) -
   counted from the middle of one tile to the middle of the other and
   rounded, so along a row or a column two tiles out and one to either side of
   those, corner to corner one, but never two across and two down: round,
   five tiles across with its corners cut, not a diamond.
2. Where two areas share a tile they are one. Along a row, two buildings with
   three tiles between them share the middle one and hang together; with four
   between, their areas only touch, and one of them stands apart
   (`CityRoads.REACH`).
3. The city's area is all of it that hangs together.
4. A road has no area of its own: it has one only where it joins buildings
   to each other - each tile of it then as a building's - so a road is the
   cheap way to reach out to a group of buildings further off. A road on its
   own in the middle of nowhere is not something standing apart: it is just
   a road, abandoned.

It holds together once it is finished - a house still going up, a road still
being laid, not yet; its area is shown while it is being put down all the
same. A tree is the world's.

What a building wants of the city:

- **to be part of it**: everything does - a village's house, a park, a
  square, the church, the old town, the water tower. One that is not is cut
  off;
- **a road** (`requires` in the data), for a house in town, a shop, offices,
  flats and the town hall: a road of the city's network right alongside it,
  no tile between, of at least the material it asks for;
- **water**, as before.

**Done.** A road that leads nowhere is not part of the city: only roads that
join buildings to each other hold anything together. A road tile does where a
way along the road goes through it from one building to another - from a
tile inside the one's area to a tile inside the other's, the road's tiles
side by side between, never over the same tile twice (`prune`). Roads join
where their tiles are side by side, not across a gap; a road a tile short of
a house is inside its area, and leads to it.

- A lane running off into the country past the last house is the city's to
  the edge of the house's area - two tiles out - and no further, and the
  city's area along it goes two tiles on from there, where its signs stand;
  a lane off a house on its own is not the city's at all.
- A tile of road on its own is just a road, abandoned - beside a road
  leading nowhere as much as in the middle of nowhere.
- A loop that only leads back to the road it left is not the city's: going
  round it leads nowhere new.
- Two branches from one village to another are both the city's: each is
  the way to the place it reaches the other village at.
- Out in the country - outside every building's area - a road is the city's
  only where it is the shortest way from one village to another, a village
  being buildings that hang together by their areas alone (`villages`,
  `country`). Each stretch of country road goes from the roads inside the
  villages' areas at its ends, its gates; a road of it is the city's where
  it is on a shortest way from the gates of one village to a gate of
  another. A loop on the road between two villages is a way round, never
  the shortest to anywhere, and not the city's; nor is a stretch that
  leaves a village and comes back to it.

Which tiles of what is left those are is graph theory: the roads and the
buildings whose areas they are in are a graph, every building joined to one more node, the same for all of
them; a road is on a way from one building to another, never over the same
tile twice, exactly when it is on a ring with that node - in one of its
blocks, its biconnected components (Hopcroft and Tarjan's, `ringsWith`).

**Done.** The city-sim draws a border round the city's area, along the tiles'
edges (`city-sim/src/client/cityborder.js`, `cityarea.js`) - none round what
stands apart from it. It is put away with the words over the world, but while
something is being put down (`isometrica/src/client/buildman.js`, the play's
`placing`). Then:

- the border is drawn as it would be with what is being put down - worked
  out the way the city is, as if it were up and finished (`CityRoads#plan`):
  a house with it in it, if it joins the city; a road out into nowhere
  adding nothing; a road out to a village standing apart taking it in;
- what would stand apart from the city with what is put down has its area
  drawn in amber;
- whatever else stands apart from the city has its area drawn faintly.

And something that stands apart, tapped, has the area of all that hangs
together with it drawn in amber while it is looked at
(`isometrica/src/client/serviceman.js`, the play's `inspecting`).

The border is drawn whenever any of it is on screen, wherever the middle of
the city is.

**Done.** Wherever a road crosses the border, out of the city's area, the
signs of the town's limits stand by it: on the last of the road inside the
city's area, at the side it goes on out at (`putUpSigns` in
`city-sim/src/client/cityborder.js`). A road that ends inside has none. They
are small, each on a post on the verge, the size of a bus
stop's sign, with no words on them, the way the road signs of a town's
limits have it: the way in on the right of whoever comes in - the traffic
keeps to the right - the town's houses on a white plate facing them; the
way out on the other verge, facing whoever leaves, a red stripe through the
houses (`gen/roads/limit/in`, `out` in
`isometrica/src/shared/gen/roads.js`). They are the road's own, drawn with
it, and stay up with the words put away.

When what hangs together comes apart, the city is:

- the part a finished town hall stands in - the oldest town hall, if there
  are several;
- otherwise the bigger part: its road tiles and the ground its buildings
  stand on, counted together;
- of two the same, the one more people live in, then the one with the oldest
  of the city's buildings.

It is worked out again whenever something goes up, comes down or is finished,
and nothing of it is kept in the save. People moving about between those
times does not change it, so it does not flip back and forth.

## The centre

**Done.** Where the city's name goes and where Home takes the camera
(`City#center` in `isometrica/src/core/city.js`):

- the town hall the city goes by, if there is one;
- otherwise the middle of what is part of the city, the roads left out;
- before anything does, the middle of whatever the city has built; before
  that, where it was founded.

A real town's centre need not be its densest part: it can be a park or a
square.

## People

**Done.** People live in houses: each house keeps how many live in it, and
the save has them by the tile each house stands on
(`isometrica/src/core/city/citypopulation.js`). A save from before, with only
a head count, has them put up oldest house first when it is opened, and
nobody is lost.

- The city grows into the room its houses have: their beds, as long as they
  have what they need, and for houses whose people work in town as many as
  there are jobs - the jobs going to the beds of the oldest houses first. A
  tick, as many come as the root of the room there is, into the oldest
  houses with room, while the town is pleasant enough to live in; while it is
  not, a hundredth of it leaves at most, out of the newest.
- Whoever is in a house with less room than people - its water gone, its
  jobs gone - moves out, one person a tick out of the city, and is gone. The
  city fills the room it has elsewhere with its own growth.
- The city's people are those in the houses that are part of it: they are its
  population, and they pay it their taxes.

## A part cut off

**Done.** A building of the city that is not part of it is cut off from it:
abandoned.

- Its people stay in their houses for now, and pay nothing.
- They move out one person a tick out of each part cut off, till it is
  empty. Whatever hangs together is one part; a building still going up is
  a part of its own.
- The main city fills its own free beds by its own growth, as if those who
  moved out had moved in.
- It costs the city nothing to keep, and earns it nothing.
- "cut off" hangs over it, and the city screen counts it.
- Joined up again - by a building in the gap, or a road - it is the city's
  once more, with whoever still lives there. Taking it over costs nothing.
- A water tower cut off waters nothing.

In the single-player game a part cut off is not a city of its own: it stays
with the one city, as its buildings that are cut off. Multiplayer will need it
to be one ([multiplayer](multiplayer.md#cities)).

There is no warning for now when pulling down a road cuts a part off.

## Decay and ruins

**Later.** What is abandoned decays, and ends as a ruin that stays for good:
nothing disappears on its own, so a world's history is there on the ground.
Anyone may pull down what is abandoned. Roads that nobody uses decay too.
Abandoned roads only come from a town gone bankrupt, or from a part left
cut off.

Phase 0 has no decay: an abandoned house already empties and pays nothing.

## Generated cities

**Done** for a small town and a city about Peepstown's size; **Later** for
Peepsopolis, the big one. The menu starts a new game on one generated
afresh (`city-sim/src/citygen`): built up, all of it, somewhere about where a
blank city would go, a new one every time - the seed and the spot go over
the page reloading on it (`ui/session.js`), so the same seed and spot are the
same city, tile for tile. It is a save like the city a new player starts
on, made up as the game opens it.

How one is made, in order (`citygen/index.js`):

1. **The site** (`site.js`): of ninety spots about the one asked for, the
   one with the most dry, level land round it, the least of it too steep to
   build on and the least rise and fall over it - and, for most towns, water
   along a side of it, a coast or a lake, the way towns grow up by the water.
   Further and further out, if none will do. Never across the row of tiles
   where y goes from 32767 to 32768: the world numbers its tiles
   `(y << 16) ^ x`, 32 bits with a sign, and nothing that runs across from one
   side of that to the other is ever got to the end of
   (`isometrica/src/core/tileiterator.js`) - a building a player put across
   it would hang the game the same way.
2. **The streets** (`streets.js`): two main roads through its middle, on out
   into the country to the edge of what the town looks at, stopping at the
   water - the roads to the next towns. The land between them is cut into
   blocks, each cut across its longer side a little off its middle and again,
   till it is the size a block is where it stands - its short side six tiles
   at most, two rows of lots three deep back to back, its long side nine
   downtown, twelve in town, fifteen in the suburbs, more further out - the
   recursive subdivision most city generators lay their lots out with, after
   Parish and Mueller's. Each street runs only as far as the block it cuts,
   so the cross streets of blocks side by side do not line up: T-junctions,
   staggered, as real towns have them, which the traffic takes a turn at a
   time. The town is the blocks inside an outline round its middle -
   bulging out one way, pulled in another - on land it can build on, and the
   streets round them; lanes of gravel go on out from some to the farms.
   Then a **boulevard** down one of the main roads downtown - a one-way road
   each way, the traffic keeping to the right, a strip of park between them,
   crossed only where a street comes in; two one-way roads side by side
   with nothing between would be a junction every tile of the way - a
   **roundabout** or two where a main road comes into town, a ring of eight
   tiles round a little park going round the way Peepstown's does, and the
   **square**, a block by where the main roads cross, paved over. Streets
   downtown and the main roads are asphalt, cobbles in town, gravel in the
   country. No street runs but along x or y.
3. **The grading** (`grade.js`): every road laid flat or as a ramp - the
   surfaces the game lays one on - the one that has the most of them meet
   their neighbours level, worked out for all of them at once the way the
   game works out a road dragged out (`isometrica/src/client/road.js` plan);
   a ramp only on a road that goes on straight along it. Where two still do
   not meet, the ground under them is levelled, the ground round it dragged
   along a step at a time, as shaping the ground does, and it is worked out
   again - the earthworks go into the save as the ground's shaped points.
4. **The lots** (`lots.js`): every block built up round its edge, facing its
   streets: two rows back to back, each half as deep as the block, three at
   most - a courtyard park in the middle where there is room downtown and in
   town, gardens and their trees further out. What goes on a lot is what that
   part of town is built of (`PALETTES`) - offices, stores and flats
   downtown, and the shops out along the main roads, the high street; flats,
   terraces and shops in town; houses in the suburbs, villas more of them by
   the water and up on the hills; houses, villas and the odd farm at the
   edge - a street built a kind at a time, a row of the same houses or a
   parade of shops, something else among them now and then, a pocket park.
   Round the square, facing it, the town hall, the church and the market;
   the old town in the blocks beside it; a park of a whole block in town, by
   the water if it can be; farms along the roads out, their fields round
   them. All of it only what the catalogue offers (`catalogue.js` reads it
   off isometrica's `data/buildings`), each on a road it can do with.
5. **The water** (`water.js`): pump stations first - three times as far as a
   tower for four times its upkeep, nine times the ground - as long as each
   still waters a good few buildings that have none, by the water where
   there is some to pump; then water towers, up on the high ground, till
   everything that wants water has it. Each on open ground of the town, or
   in the place of a lot, the rest of it a park.
6. **The jobs** (`balance.js`): the game has everybody in the city work in
   it, the jobs going to the beds of the oldest houses first and the people
   to the oldest businesses (`isometrica/src/core/city/cityjobs.js`,
   `citypopulation.js`): fewer jobs than the people who need one and the last
   houses say "no jobs", more than there are people and the last businesses
   "no workers". So lots along the streets are turned, on the same footprint,
   from homes into shops or from offices into flats - shops into town, homes
   out of downtown last - till there are at least as many jobs as the beds
   that need one, and no more than everybody in town. The town opens with
   as many people as it has beds for.
7. **The name** (`names.js`): a Peeps- town named for where it stands - a
   port or a mouth by the water, a hill up high, a ford, a field or a bury
   anywhere else; a small town a village's name, Little this as often as
   not.

### A small town

**Done.** A village grown into a town (`citygen/village.js`), from the same
steps but the streets and the lots: a road or two, three at most, and the
town along them, mostly the country still - the ways villages are laid out
where they grew up by themselves, one picked for each:

- **along one road** (a street village): its houses either side of the road
  through it, and at its middle, as often as not, a back lane behind them,
  round a block or two;
- **round a crossroads**: the town round where two roads cross and out
  along all four, a lane round a block in one corner of it now and then;
- **where a road comes off another** (a tee): the town where they meet and
  along both, the road off it on out as a lane to the farms or not;
- **round a green**: the road through it parted round a long green in its
  middle - the church on it, the square, a park and its pond - the town
  hall and the market facing it across the road, the town round it.

The road through it is asphalt or an old gravel road, cobbled through the
town's middle either way, where the town houses and the shops are; lanes are
cobbled. Its middle, six tiles round where its roads meet, is a little town:
the square by the road and the church beside it, the town hall across from it
now and then, a market, and along the roads the old town, shops, town houses
and the odd farmstead. Further out along its roads, as far as the town goes,
a village's houses and farms - a farmstead, cottages, a croft, a farm round
its yard - and the odd town house or villa where the road is good enough,
with a gap now and then between two of them, an orchard, a paddock; past
that, farms, their fields round them. No flats and no offices, built or
swapped in (`ALLOWED`). Its water towers go up on open ground right by the
houses, there being few blocks to put them in; most of its people need no
water and no job in town, and the jobs are balanced against those who do

- the old town turned into houses where there is more of it than the town
  has people for.

`npm run test:cities` in city-sim (`tools/gencity.js`) generates them headless
and opens each in isometrica's own world, as the game opens it, asking every
building what it goes without; none goes without anything.

**Later.** The third size, from the same steps: **Peepsopolis** - a city
four to six times Peepstown, all of it: more main roads than two, a ring road
round downtown, districts of their own.

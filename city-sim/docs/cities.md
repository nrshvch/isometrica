# Cities

## Founding

**Done.** A city is founded by placing its first village house, the way a
place really starts: a family or a few of them settle somewhere, and pool
money for what none of them could do alone, a road first. Nikolaevsk in
Alaska was five families in 1968, on land bought with a grant
([references](references.md#real-towns)).

- There is no step of picking a tile to found on. With no city yet, "Found a
  city" opens the catalogue on the houses a city can be founded with: the
  village's, which need no road, no water, no jobs
  (`CityPopulation.canFound` in `isometrica/src/core/city/citypopulation.js`).
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
- The money a city starts with, $10,000 (`CityResources.START` in
  `isometrica/src/core/city/cityresources.js`), covers two of the smaller
  houses ($4,500 each) - next to each other, they are both lived in.

## Growing by what it needs

**Done** (in the data). A village needs nothing but to hold together: village
houses want only to stand next to the city - another of its buildings, or a
road - and no water and no jobs in town; their fields are in their
footprints. Parks and squares want the same. Town houses want a cobbled
street and water, and so does everything after them
(`isometrica/src/data/houses.js`). A player who wants something more than a
village has to lay streets and bring water in; one who does not can grow a
village without end, with no roads at all - the poorest use of the land
there is, at $20 a head. The numbers are to be tuned.

## What the city is

**Done.** There are no borders. The city holds together where its finished
buildings and roads touch side by side - never only at a corner
(`isometrica/src/core/city/cityroads.js`):

- a building next to another building of the city;
- a building next to one of its roads;
- a road next to a road.

So a village holds together by its houses standing next to each other, the
way families settle, and a road is what bridges out to a group of buildings
further off. Only what is finished holds anything together; a tree is the
world's.

What a building wants of the city (`requires` in the data):

- **linked**: to be part of it - all a village's house, a park or a square
  wants;
- **road**: a road of the city's network alongside, of at least the material
  it asks for - a cobbled street for a house in town, a shop, the church or
  the town hall. A square passes on the road it has to what stands round it:
  a building on a square that opens onto a street, itself or through the
  squares next to it, is on that street. A square costs more than the street
  it stands in for, so it is not a way round laying streets;
- **water**, as before.

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

**Done.** A building that wants to be part of the city - linked, or on a road -
and is not is cut off from it: abandoned.

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
- What wants nothing of the city - a water tower - is never cut off: it does
  what it does wherever it stands.

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

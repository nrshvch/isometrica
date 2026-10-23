# Cities

## Founding

**Done.** A city is founded by placing its first village house, the way a
place really starts: a family or a few of them settle somewhere, and pool
money for what none of them could do alone, a road first. Nikolaevsk in
Alaska was five families in 1968, on land bought with a grant
([references](references.md#real-towns)).

- There is no step of picking a tile to found on. With no city yet, "Found a
  city" opens the catalogue on the houses a city can be founded with: the
  village's, which need nothing but a lane - no water, no jobs
  (`CityPopulation.canFound` in `isometrica/src/core/city/citypopulation.js`).
- The one picked is put down like any building, and priced out of what a
  city starts with (`City.quoteFounding` in `isometrica/src/core/city.js`).
  Done asks for the city's name; the city is founded where the first of them
  goes up, and they are built in it (`found` in
  `isometrica/src/client/buildman.js`). Cancelling the name goes back to
  placing it.
- The town hall comes later, once the town has grown into one: it wants a
  cobbled street and water (`isometrica/src/data/civic.js`).
- The money a city starts with, $10,000 (`CityResources.START` in
  `isometrica/src/core/city/cityresources.js`), covers a house and the gravel
  lane to it: cottages are $4,500, gravel $500 a tile.

## Growing by what it needs

**Done** (in the data). A village needs nothing but a lane: village houses
want a gravel road, no water and no jobs in town. Town houses want a cobbled
street and water, and so does everything after them
(`isometrica/src/data/houses.js`). A player who wants something more than a
village has to bring water in; one who does not can grow a village without
end.

## What the city is

**Done.** There are no borders. A building is part of the city when a road
alongside it joins the city's road network, and one off the network holds
nobody and earns nothing (`isometrica/src/core/city/cityroads.js`).

**Done.** When the city's roads come apart into stretches that no longer join,
the city is:

- the stretch a town hall stands on, finished - the oldest town hall, if
  there are several;
- otherwise the bigger stretch: its road tiles, and the ground taken by what
  stands along it, counted together;
- of two the same, the one more people live along, then the one the oldest of
  the city's buildings is on.

It is worked out again whenever something goes up, comes down or is finished,
and nothing of it is kept in the save. People moving about between those
times does not change it, so it does not flip back and forth.

## The centre

**Done.** Where the city's name goes and where Home takes the camera
(`City#center` in `isometrica/src/core/city.js`):

- the town hall the city goes by, if there is one;
- otherwise the middle of what stands on the city's roads, the roads left
  out;
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
- The city's people are those in the houses on its roads: they are its
  population, and they pay it their taxes.

## A part cut off

**Done.** A building that wants a road and stands along a stretch that is not
the city's, or along none, is cut off from it: abandoned.

- Its people stay in their houses for now, and pay nothing.
- They move out one person a tick out of each part cut off, till it is
  empty. Everything along the one stretch is one part; a building with no
  road at all is a part of its own.
- The main city fills its own free beds by its own growth, as if those who
  moved out had moved in.
- It costs the city nothing to keep, and earns it nothing.
- "cut off" hangs over a building on a stretch of road that is not the
  city's; "no road" over one with no road at all.
- A road joining it up again takes it back in, with whoever still lives
  there. Taking it over costs nothing.
- What wants no road - a water tower, a park - is never cut off: it does
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

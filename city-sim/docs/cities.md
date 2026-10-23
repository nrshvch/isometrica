# Cities

## Founding

**Phase 0.** A city is founded by placing its first village house, the way a
place really starts: a family or a few of them settle somewhere, and pool
money for what none of them could do alone, a road first. Nikolaevsk in
Alaska was five families in 1968, on land bought with a grant
([references](references.md#real-towns)).

- There is no step of picking a tile to found on. When there is no city, the
  catalogue offers the village houses; placing the first one founds the
  city, and its name is asked for then.
- The town hall comes later, once the town has grown into one: it wants a
  cobbled street and water (`isometrica/src/data/civic.js`).
- The money a city starts with, $10,000
  (`isometrica/src/core/city/cityresources.js`), covers a house and the
  gravel lane to it: cottages are $4,500, gravel $500 a tile.

Today the player picks a tile, names the city, and then there is nothing on
the ground at all: no name, nothing to tell where the city is
(`isometrica/src/client/cityman.js`).

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

**Phase 0.** When the city's roads come apart into parts that no longer join,
the main part is the city:

- the part with the town hall, if there is one (the oldest, if there are
  several);
- otherwise the bigger part, by everything it holds (its roads, its
  buildings, their beds), not by its roads alone.

It is worked out afresh whenever the roads change; nothing about it is kept
in the save.

Today the network is the biggest stretch of road alone, however empty.

**Open.** How "bigger" is measured exactly. One way: the tiles its roads and
buildings cover together; when that is even, the part with more people, then
the one with the older building.

## The centre

**Phase 0.** Where the city's name goes and where Home takes the camera:

- the town hall, if there is one;
- otherwise the middle of the main part's buildings, the roads left out.

A real town's centre need not be its densest part: it can be a park or a
square.

Today it is the middle of all the city's buildings, or the tile it was
founded on while nothing stands (`City#center` in
`isometrica/src/core/city.js`).

## People

**Phase 0.** People live in houses: each house keeps who lives in it, in the
save. The city grows into its free beds by itself, as it does now.

Today the city keeps one head count and puts it up in its houses afresh
each tick, the oldest houses filled first
(`isometrica/src/core/city/citypopulation.js`). A save from before has only
that head count: it is put up the same way, oldest first, when it is opened,
and nobody is lost.

## A part cut off

**Phase 0.** A part of the city that is not its main part is abandoned: a city
of its own that no player plays.

- Its people stay in their houses for now, and pay nothing.
- They move out of it one person a tick, till it is empty.
- The main city fills its own free beds by its own growth, as if those who
  moved out had moved in.
- A road joining it up again takes it back in, with whoever still lives
  there. Taking it over costs nothing.

There is no warning for now when pulling down a road cuts a part off.

## Decay and ruins

**Later.** What is abandoned decays, and ends as a ruin that stays for good:
nothing disappears on its own, so a world's history is there on the ground.
Anyone may pull down what is abandoned. Roads that nobody uses decay too.
Abandoned roads only come from a town gone bankrupt, or from a part left
cut off.

Phase 0 has no decay: an abandoned house already empties and pays nothing.

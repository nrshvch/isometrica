# The cars

## How many (`client/carman.js`)

A car for every four of the city's road tiles loaded through the day - the
roads joining its buildings and out to its villages, not those leading
nowhere (`core/city/cityroads.js` inNetwork) - more in the rush hours: about
one for every two and a half at eight in the morning and five in the evening.
A gravel lane counts for a quarter of a road and is a quarter as likely to be
set out from (GRAVEL_SHARE), so village lanes stay quiet. No city, no traffic.

## Why they are out (PURPOSES, CarScript#purpose)

Every car is out for a reason and only goes somewhere in the city - nothing
drives down a road that leads nowhere but to turn at its end. Mornings, light
cars set out from houses and are done at work; evenings the other way; the
rest of the day from one building to another; a few about the streets in the
small hours. A van calls from a house or shop to another; a cab from any
building to any other at any hour; a truck or lorry comes from anywhere into
the city; a police car goes about the streets. After the rush, light cars
more than the hour wants are done when they arrive.

## Done for the day

It does not vanish: it pulls in at the kerb at the end of its way - on a
straight bit a tile or two on if it would end in a junction or round a bend -
stands a moment, lamps off, and dissolves a pixel at a time (parkToLeave,
leave). A car that has waited a minute in a queue that does not move turns
off out of sight and is put on some other road - a queue behind a bus at its
stop waits for it.

## Keeping its way (findWay)

A road on its way pulled up, or made one way against it: it finds another
from where it is. Its road pulled up from under it: it drives slowly off the
edge straight to the nearest road, hazards on, and on from there. Nowhere to
go: it wanders the roads it can reach, slowly, hazards on, till it finds its
way - or after a minute and a half lost is given up on.

## Breaking down

Every so often: it pulls over to the kerb out of the way and stands smoking a
while, then pulls back out once the lane behind is clear. Only on a street,
clear of junctions, where it can pull over - until then it crawls on.

## Buses

A bus for every two stops loaded, none at night, each on a round of a few
stops near each other. A stop is a road with a shelter on each pavement
(`client/road.js` Road#isStop; painted by `shared/gen/roads.js`). The city a
new player starts on has a few stops; a city with none is given a few as it
is opened, on straight streets with something built along them.

## Roads: speed and cost (`core/roadrules.js`)

- Speed is the road's (paceOf, Driver#pace): asphalt its own, cobbles a
  tenth slower, gravel a tenth slower again.
- A tile of asphalt costs $1,000 to lay, cobbles 70% of that, gravel half
  (costShare, CityBuildings costOf) - quoted and charged alike - and nothing
  to keep, so a town can reach its farms with lanes. Clicked, a road is ground
  like any other.

## Eight ways round

Cars are painted along x and y and half way between: how they cut a corner
turning at a junction, swing round to turn back, pull over to the kerb and
out, and pull out round a bus.

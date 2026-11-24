---
name: traffic
description: How isometrica's traffic drives - Driver, lanes, gaps, junctions taken a turn at a time, routes and turning round, one-way roads and lane changes, roundabouts, buses and stops, overtaking, breakdowns, detours and lost cars; how many cars, why they are out, parking to leave; road speeds and costs (roadrules); the cars as records by region and tier (full, coarse, asleep), their views, the core's roads; the traffic testbed and test:traffic. Load before changing client/traffic.js, carman.js, coreroads.js, pathfinding or core/roadrules.
---

# Traffic

Everything on the roads - the city's traffic, buses, a game's own car (the
courier) - is a `Driver` (`client/traffic.js`): a line of points through the
lanes it takes and how fast it goes along them. Each frame it looks a couple
of tiles ahead for another vehicle (keeping a gap that grows with speed) or a
junction it has not been given (stopping short). Positions are in tiles: the
middle of tile (x, y) is (x, y).

## Where

`isometrica/src/` unless a path says otherwise:

- `client/traffic.js` - Driver, junctions, routes (`Traffic.route`), lanes
  (planLanes, Driver#switchLane, crossingAhead, Traffic#mergeBlocker,
  Driver#putOffMerge, Driver#keepLane), roundabouts (mayEnter,
  Traffic#loopOf), pulling over (Driver#pullOver), signals (Driver signal).
  91 KB: read in ranges.
- `client/carman.js` - the cars: records by region stepped by the traffic
  system, their game objects only views (CarAgent, stepRegion, track;
  agents.md); how many (GRAVEL_SHARE), why they are out (PURPOSES,
  CarAgent#purpose), detours (detour, Driver jammedAt), keeping their way
  (findWay), parking to leave (parkToLeave, leave), buses, breakdowns,
  `Carman.groundHeight`. 80 KB: read in ranges.
- `client/coreroads.js` - the roads the traffic drives on: the core's,
  every one, loaded or not.
- `client/pathfinding/` - routes over the road graph.
- `core/roadrules.js` - the rules alone, no pictures, no world: where two
  roads join, which way a one-way road goes, paceOf, costShare, serves. Used
  by `client/road.js` and `core/surface.js` too, and so the testbed loads
  `traffic.js` with nothing of the game round it.
- `client/road.js` (wayOf, goes, isStop, materialAt), `client/roadman.js`
  (the loaded roads: bus stops, lorries' starts), `core/city/cityroads.js`
  inNetwork, networkTiles (which roads are the city's).
- Testbed: `lab/trafficbed/bed.js`, `scenarios.js`, `city.json`;
  `lab/traffic.html` (`lab/traffic/Traffic.jsx`, `view.js`);
  `tools/traffictest.mjs`.
- Cars are painted eight ways round (generators skill, vehicles).

## Must hold

- Nothing drives through anything else, and nobody stops in the middle of a
  junction: into one only with room on the far side for it and everything
  already let in that comes out the same way.
- A route turns back only at a junction or the end of a road - never across
  the lane coming the other way mid-street - and arrives facing a way it can
  drive on from.
- Lanes change along a road only, never in a junction, and only once there
  is room.
- No city, no traffic: cars only ever go somewhere in the city.
- `traffic.js` must load with nothing of the game round it (the testbed);
  road rules belong in `core/roadrules.js`.
- The game's traffic changes nothing the testbed runs: `test:traffic` gives
  the same output to the byte (but its `[n ms]` timings).
- A car is never taken off for being out of sight: it goes coarse, then
  asleep, and is the same car when the camera comes back (agents.md).

## Testing

- `npm run test:traffic` - `tools/traffictest.mjs` (`[name ...]`,
  `--seed=N`, `--seeds=N`, `--verbose`) runs every scenario headless in a
  second or two and says which hold; exits 1 if any does not. CI runs it on
  every push.
- `/traffic.html` in the lab (`npm run dev -w isometrica`): any scenario from
  above, going (`traffic.html#city`); put cars on, follow one to see its way,
  what it keeps its distance from and why it stands; draw roads; "check" runs
  it as the headless runner does. `trafficbed.bed` in the console.
- Scenario maps: `#` a road both ways, `S` one with a bus stop, `< ^ > v`
  one-way going -x, -y, +x, +y; the first line is the lowest y; tiles start
  at (1000, 1000). Each scenario says what has to hold by its end.
- What the bed counts as wrong: turning round where the road goes on,
  standing too long (queue, junction, lane change), a ring of cars each
  waiting on the next (locked), two on top of each other, a car with no way.

## More

- [driving.md](driving.md) - junctions, routes, one-way lanes, roundabouts,
  buses and overtaking, indicators.
- [cars.md](cars.md) - how many, why, where they go and leave, getting lost,
  breaking down, speeds and costs.
- [agents.md](agents.md) - the cars as records by region: tiers (full,
  coarse, asleep), waking, views, the core's roads, kept by region;
  `world:traffic`.

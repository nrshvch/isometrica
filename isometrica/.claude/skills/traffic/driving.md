# Driving

## Gaps

In its lane, on the right, looking a couple of tiles ahead. It brakes to keep
a gap that grows with its speed and speeds up again a little at a time, so a
queue sets off one after another.

## Junctions

- A junction is a road tile joined three or four ways, one-way roads in
  counted as much as those out - and where a one-way road joins one both
  ways, where what is on that turns round across what comes off the one-way
  road.
- Taken a turn at a time: the first car in each lane asks on the way up and
  goes in once nothing in it crosses its way (straight across, a left across
  what comes the other way, or into the same street) and is not yet past
  where it does; nobody who has waited longer for a crossing way is ready
  (one held up by what is going through lets others first for a few seconds,
  so two close junctions do not hold each other up); and there is room on the
  far side, or what is there drives on away. Ways that never cross go
  together (straight from either side, two turning right, a right and a
  straight into another street; two side by side whose ways do not cross).
  Junctions next to each other are asked for together. Queues back up into
  the junction behind and clear the way a jam does.
- A car stood first at a junction a few seconds because its way out is
  jammed (not just waiting for traffic across) takes another way out with
  its lane clear - never back the way it came - routed from there
  (`carman.js` detour, Driver jammedAt); only where the lane it is in goes. A
  bus keeps to its round.

## Routes (`Traffic.route`)

Never turns round mid-street across the oncoming lane (that locked small
towns solid): only at a junction, taking its turn, or at the end of a road -
not where a two-way street ends in a one-way street coming into it (no dead
end, and turning there piled traffic up). It arrives facing a way it can
drive on from (down that one-way street rather than up the other to its
top). Turning round costs a route eight tiles, so a car would sooner go round
the block. The next stretch of its way is joined on a few tiles before the end
of the one it is on, so it is in lane for a turn at the start of it.

## One-way roads

- Two lanes going its way. A car keeps right whenever it can, and takes the
  left only to turn left (two tiles short of the junction), when the right
  is busy, or to overtake: coming on, left if the right has two more ahead;
  stood in a queue on the right, left if that is clear alongside and has
  fewer ahead; in the left, back right as soon as that is clear a good way
  ahead (planLanes, Driver#switchLane).
- It changes along the road only, never in a junction, indicator on, and
  only once there is room: it waits at the start of the change in its own
  lane till nothing is alongside where it comes in nor close behind; one
  coming up that lane that can still stop lets it in, zip-fashion
  (crossingAhead, Traffic#mergeBlocker). Two level that each want the
  other's lane go one at a time: the one behind puts its change off a tile,
  or with the junction next turns from the lane it is in
  (Driver#putOffMerge). One that has waited two and a half seconds gives up
  and turns from the lane it is in at the next junction (Driver#keepLane) -
  otherwise, round a roundabout most of all, it would wait for good.
- Nothing goes against it: no car drives along it the other way, into it or
  out of it; one can come into it from a side road the way it goes, and
  leave it at a junction. Buses keep right for their stops; a car broken down
  in the left lane drives on till it can pull over on the right. Each tile
  keeps its way in the save (`client/road.js` wayOf, goes); laid the way it is
  dragged (`client/buildman.js` flowOf).

## Roundabouts

Any small loop of one-way road, twelve tiles round at most, locks solid once
full (everything waits for what is in front, all the way round). So what
comes on gives way to what is going round, and comes on only while less than
half of it is taken up (`traffic.js` mayEnter, Traffic#loopOf).

## Buses and overtaking

- A bus stands at each stop for a few seconds in its lane; the traffic behind
  queues; the first car to get to it goes round through the other lane once
  that is clear well ahead and no junction is in the way, the next only when
  that one is back in its lane. The bus waits for whoever is going round it
  before moving off.
- A car stuck behind something slower (a lorry, a car about to break down)
  goes round it too, a good deal quicker than it would otherwise go, once it
  has followed a moment, if the road is straight with no junction for as far
  as it takes and the other lane is clear for as far as oncoming traffic
  would get meanwhile.
- A car breaking down pulls over to the kerb (Driver#pullOver), out of the
  way.

## Indicators (Driver signal; drawn by `lighting.js` blinkers)

Amber at the corners on the side it turns to: all the way to the next
junction on its way and through it, if it turns there and the road up to it
is straight; nothing if it goes straight over (whatever it does at the next),
nothing round a bend or a turn where the road goes no other way, nothing for
the junction past a bend till it is round it; turning round, left, unless at a
dead end. Going round something: left as it pulls out, right as it is about to
pull back in; out from the kerb or in to it, just before. Hazards (all four)
for a car broken down at the kerb, lost, or a game's car waiting at the side
of the road. Brake lights while slowing or standing.

# Multiplayer

**Later.** Many players' cities on one world, played in real time, not in
turns. None of it is built yet; Phase 0 only makes sure nothing in the single
player game stands in its way.

## Cities

- One player, one city.
- A city is either played or abandoned. It is abandoned when its player
  stops playing it, when it goes bankrupt, or when it is a part cut off from
  a played city ([cities](cities.md#a-part-cut-off)).
- Roads can be joined only to an abandoned city, and joining one takes it
  in. Two played cities never join.
- What a city paid for is its own: nobody else may pull down its roads or its
  houses, and a house of a played city never changes hands on its own. A
  house only changes hands when its city is gone and another city lays a road
  to it.

## Abandoned cities

- They decay, and end as ruins that stay for good.
- Anyone may pull them down. A road somebody paid for can be pulled down by
  someone else only once it has been cut off from its city for a few game
  days at least.
- A player who has not played their city for a while (when they were last
  there is kept) leaves it to start declining. Today a city lives for ever.
- Over time the world tidies itself up: what players left behind decays,
  and a world never has to be wiped and started again. A player has a reason
  to come back as well.

## What has to change

- The world runs on a server, ticking whether anybody is watching or not;
  players' browsers send what they do and draw what they are sent. The core
  (`isometrica/src/core`) needs almost no browser as it is: only its saves
  use localStorage.
- Cities are saved one by one today, each with its own revisions
  (`isometrica/src/core/persistence/citysync.js`). A shared world needs one
  save, with the cities in it. A city's address can still open the world
  over it.
- The cars are drawn by each browser alone (`isometrica/src/client/traffic.js`):
  anything the traffic decides, how worn a road is, how far people go to
  work, has to be worked out by the core, the same for everyone.
- Every building and road keeps which city built it.
- When two players do something to the same tile at once, the one whose
  move reached the server first wins.

## Ideas not settled

- A city taken in kept as one of its districts, under its old name ("Old
  Riverton"), the way real cities took in the villages round them.
- People moving between cities: those who leave one go into a pool the
  other cities draw from, the best-run first.
- Town signs where a city's roads come into it, with its name and how many
  live there, instead of a line on the ground.
- Old country tracks laid with the world, nobody's, joining up its regions:
  somewhere to found a city on, and to ride in the delivery game.
- The delivery game's orders coming from the shops of the players' cities.

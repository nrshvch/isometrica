# Money

## Roads

**Done.** A road costs what it is laid in: of asphalt's $1,000, gravel half
and cobbles 0.7 of it (`costShare` in `isometrica/src/core/roadrules.js`).
Spreading out costs road, and nothing more.

**Done.** Roads cost nothing to keep.

**Later.** Roads wear, with time and with the traffic on them, and a road
maintenance service keeps them up, its upkeep going with the road tiles in
its care. The cars are drawn by each player's browser alone
(`isometrica/src/client/traffic.js`), so the traffic that wears a road has to
be worked out by the core, the same for everyone.

## What comes in

**Done** (kept as it is). Money comes in as the city earns it, every tick,
not as one payment a month: much of a real town's money comes in a little at
a time, the tax on every purchase made in it. A tick is a second of real
time and five minutes of game time, so a game day goes by in under five real
minutes (`isometrica/src/core/config.js` `tickDelay`, `city-sim/src/game.js`).

**Open.** Taxes collected at the town hall, once a day or a month, a little
like a farm is harvested. It would give a reason to come back, and a player
who never comes back would never collect, leaving the city with nothing to
pay its upkeep with. But a city may have no town hall at all.

## While the game is closed

**Done.** When the player comes back, the city catches up on the time it was
away, once, in one go, up to a game day (`catchUp` in
`isometrica/src/core/logic.js`, switched on by `city-sim/src/game.js`).

- Only real time counts: the city gets as many ticks as seconds really went
  by, and no more than a game day's 288. A game day only comes back to a
  player who was gone for five real minutes or more.
- The ticks are played out at once, as they would have gone, before anything
  is drawn, so that the city grows and earns as it would have. What it made
  floats up over it once the splash is gone.
- Opening a saved city, the time is reckoned from when it was last saved
  (`isometrica/src/core/persistence/citypersistence.js`). The browser's clock
  can be put forward, the server's cannot: where the city is kept on the
  server, the time since the server last had it, by the server's own clock
  (its `Saved-At` and `Date`), caps it (`CitySync#awayFor` in
  `isometrica/src/core/persistence/citysync.js`).
- A page out of sight stops the world's clock, as it did; back in sight, it
  makes up for the time it was stopped the same way.
- The city everybody starts on does not catch up: it was never played.

## Bankruptcy

**Open.** What happens when a city's money runs out is not settled. One way:
the services that cost upkeep, the water first, switch off before anything
else.

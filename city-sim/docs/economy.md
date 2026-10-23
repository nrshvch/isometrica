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

**Phase 0.** When the player comes back, the city catches up on the time it
was closed, once, in one go, up to a game day.

- Only real time counts: the city gets as many ticks as seconds really went
  by since it was last saved, and no more than a game day's 288. A game day
  only comes back to a player who was gone for five real minutes or more.
- The ticks are played out as they would have been, without drawing
  anything, so that the city grows and earns as it would have.
- The time is reckoned from when the city was last saved. The browser's clock
  can be put forward; a city that is kept on the server has the server's
  time of its last save to go by, which can't (`city-sim/worker/saves.js`).

Today the city's clock stops when the game is closed, and nothing is earned.

## Bankruptcy

**Open.** What happens when a city's money runs out is not settled. One way:
the services that cost upkeep, the water first, switch off before anything
else.

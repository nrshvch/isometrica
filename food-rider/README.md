# food-rider

A food delivery game played in the city: the player is a courier with a car,
like those of Wolt or Uber Eats. The city is only the scene - nothing about
it is built or managed while playing; it is built in the city builder and
handed over (see above).

- The camera follows the courier's car - a blue hatchback with a yellow mark
  over it - always; it can be zoomed and turned, not dragged off it. The car
  is never lost behind the buildings: it shows through whatever stands in
  front of it.
- While the car stands free, a board of orders is up: what to pick up where,
  where it goes, how long the run would take on empty roads and what it
  pays. It is put up from where the car stands, and replaced every three
  minutes and after every delivery.
- Taking an order sends the car to the restaurant, where it pulls in to the
  kerb, waits for the food if it is not ready and loads it, then over to the
  customer, where it pulls in again and hands it over. A pin floats over each
  place, waiting at the edge of the screen while the place is off it; bars
  show the cooking, the loading and the handing over, and the panel shows
  each stop, how long is left and the money to collect.
- The courier's time is what they sell: an order pays for all of it, at a
  rate that goes up with the kind of order - a quick bite over in a minute or
  two, an office's lunch a quarter of an hour to cook and paying the most.
- The car really drives, in the city's traffic, as fast as the roads let it,
  queues, slow lorries and broken-down cars included. The food cooks and is
  handed over by the clock on the wall, the game closed or not; the drive
  only goes on while it is open.
- Every so often the car's engine gives out: it pulls over and stands
  smoking a minute or so, or Fix gets it going in a few seconds.
- The restaurants (burgers, pizza, sushi, noodles, kebabs, tacos), the
  grocers and the bakers of the old town, and the customers - houses, flats,
  offices - are the city's own buildings, the same building always the same
  place.
- The courier - money, car, order and board - is saved next to the city's
  save.

How it is all made is the game's `delivery` skill, `.claude/skills/delivery`;
the world, the roads and the traffic are isometrica's.

### Running it

```
npm run dev        # in food-rider/ - or npm run dev:food-rider at the root
npm run build      # into food-rider/dist, isometrica built first
```

Its own: `src/main.js` starts it, `src/game.js` says what it is (a minute a
tick of the clock, its saves under `food-rider.v1.*` in localStorage, the
courier's money in the top bar), `src/play.js` puts the courier into the
world, `src/client` is the courier, the car and the orders, `src/ui` its
screens - the courier's panel in `src/ui/modules/delivery`. The world is
isometrica's.

Deployed by `.github/workflows/food-rider.yml` to the Workers in
`wrangler.jsonc` - `food-rider` from a `food-rider/vX.Y.Z` tag,
`food-rider-dev` from main, previews from any other branch - on
workers.dev, no domain of its own yet. See
[Deploying](../README.md#deploying).

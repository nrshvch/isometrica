---
name: delivery
description: food-rider's own game - the courier (money, car, order, board), orders and pay, places out of the city's buildings, the car driving in isometrica's traffic, breakdowns and Fix, markers and see-through car, the delivery panel (Backbone/Handlebars UI), the courier's save. Load before changing food-rider/src.
---

# food-rider: the delivery game

The city is only the scene - built in the city builder and handed over as the
city it starts on (isometrica `data/initialcity`); the player drives a
courier's car about it, taking orders from restaurants to customers. How the
world, the roads and the traffic behave is isometrica's (its traffic,
buildings and rendering skills).

## Where

- `src/game.js` - what the game is: a minute a tick, saves under
  `food-rider.v1.*`, the courier's money in the top bar. `src/main.js` starts
  it; `src/play.js` puts the courier into isometrica's client.
- `src/client/`:
  - `courier.js` - the player: money, the car, the order on, the board;
    `Courier#arrived`. Knows nothing of roads or buildings: an offer comes
    with its route found, as road tiles. Saved per city in its own row,
    `food-rider.v1.courier.<city id>`, next to the city's save.
  - `deliveryman.js` - the game in the world: the car among the traffic
    (a Driver, isometrica `client/traffic.js`), the camera following it
    (`CameraScript#follow` - zoomed and turned, never dragged off it), the
    places marked, the board kept up; `Deliveryman#fix`.
  - `orders.js` - the board's orders and what they pay.
  - `places.js` - restaurants and customers out of the city's buildings.
  - `roads.js` - every road in the city for route finding, not only the
    loaded chunks' (isometrica `client/roadman` keeps only those): roads join
    where they meet level (`core/surface` meets), one-way never driven
    against (`client/road` goes) - the same as the traffic.
  - `marker.js` - marks over the world, drawn unlit over everything.
- `src/ui/` - Backbone + jQuery + Handlebars (`modules/*/templates/*.hbs`),
  Less; `modules/delivery` the courier's panel (`js/delivery.js`), `topbar`,
  `gamescreen`, `world`, `prompt`, `splash`, `valbar`; `ui/js/mainrouter.js`.

## How it plays

- The board: while the car stands free, what to pick up where, where it
  goes, how long the run takes on empty roads and what it pays; put up from
  where the car stands, replaced every three minutes and after every
  delivery.
- An order: drive to the restaurant, pull in to the kerb out of the
  traffic's way, wait for the food if not ready, load it (four seconds, once
  both are there), drive to the customer, pull in, hand it over (five). The
  car really drives, as fast as the roads let it - queues, a slow lorry, a
  car broken down in the way all count; the panel's times are at empty-road
  speed and come out later. The rest goes by the clock on the wall - the food
  cooks from when the order is taken, loading and handing over take what they
  take, a breakdown ends at a time - so those go on with the game closed;
  the drive only while it is open, the car kept where it got to.
- Pay: the courier's time is what they sell - an order pays for all of it
  (both drives, the wait, the handing over) at a rate going up with the kind
  of order: a quick bite a minute or two, dinner two or three, groceries a few
  more, an office's lunch a quarter of an hour to cook and the most per
  minute - but only to a courier who comes back for it.
- Breakdowns: about once every 160 tiles driven, at random, on a street where
  it can pull over: it pulls in and stands smoking a minute or so, then goes
  again by itself - or the Fix button over it (or in the panel) calls
  somebody out, going again in four seconds.
- Places (`places.js`): small shops are restaurants (burgers, pizza, sushi,
  noodles, kebabs, tacos), stores and markets sell groceries, the old town
  bakes; houses, flats and offices order. Each is what it is by the tile it
  stands on (the same building always the same restaurant or customer), and
  only if it has a road alongside joined to the car's; the car pulls up on
  that road nearest its middle.
- Markers (`marker.js`): a pin bobbing over each place it is going to, with
  what the place is in it (a burger, a house), waiting at the screen's edge
  and pointing while the place is off it; a small arrow down to the car.
  Either can carry a bar - the food cooking, loading, handing over. Nothing is
  laid on the ground or the buildings. Drawn unlit, over everything, so they
  read at night.
- The car is a blue hatchback with a yellow mark; never lost behind the
  buildings - where anything stands in front of it, it shows through every
  other pixel in its arrow's colour (isometrica `lighting.js` seeThrough,
  `glview.js` xray).
- The panel (`ui/modules/delivery`): the board, or the order on - what the
  car is doing, the food, each stop with its bar (cooking and loading, the
  drive over, handing over), time left, how far along; once handed over the
  money is collected. Looked at a few times a second: bars and times moved in
  place, redrawn whole only when there is something else to show. The Fix
  button kept over the car every frame while it is up.

## Commands

- `npm run dev` (isometrica built first), `npm run build` - into `dist/`.
- Deploy: `.github/workflows/food-rider.yml` (`wrangler.jsonc`) -
  `food-rider` from a `food-rider/vX.Y.Z` tag, `food-rider-dev` from main,
  previews from other branches, on workers.dev.

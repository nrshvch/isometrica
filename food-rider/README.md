# food-rider

A food delivery game played in the city: the player is a courier with a car,
like those of Wolt or Uber Eats. The city is only the scene - nothing about
it is built or managed while playing; it is built in the city builder and
handed over (see above).

- The camera follows the courier's car - a blue hatchback with a yellow mark
  over it - always; it can be zoomed and turned, not dragged off it
  (`CameraScript#follow`).
- While the car stands free, a board of orders is up
  (`food-rider/src/ui/modules/delivery`): what to pick up where, where it goes, how long
  the whole run would take on empty roads and what it pays. A board is put
  up from where the car stands and replaced every three minutes, and after
  every delivery.
- Taking an order sends the car to the restaurant, where it pulls in to the
  kerb, out of the traffic's way, waits for the food if it is not ready yet
  and loads it - four seconds, once both are there - then over to the
  customer, where it pulls in again and the food is handed over in five. A pin
  floats over the restaurant and one over the customer, each with what the
  place is in it (`food-rider/src/client/marker.js`), waiting at the edge of
  the screen, pointing, while the place is off it; nothing is laid on the
  ground or the buildings. A small bar over the restaurant's pin fills as the
  food cooks, and one over the car while it waits, loads or hands it over.
  The car is never lost behind the buildings: whatever stands in front of it
  is drawn see-through, fading out as it passes behind and back in after
  (`isometrica/src/client/lighting.js` seeThrough).
  The panel shows what the car is doing, the food, each stop with a small
  bar of its own - the cooking and the loading, the drive over and the
  handing over - how long is left and how far along the order is; once it is
  handed over, the money is collected from it.
- The courier's time is what they sell: an order pays for all of it - the
  drive to the restaurant, the wait, the drive over and the handing over
  - at a rate that goes up with the kind of order (`food-rider/src/client/orders.js`):
    a quick bite is over in a minute or two, dinner in two or three, groceries
    out of the stores in a few more, and an office's lunch takes a quarter of
    an hour to cook and pays the most for every minute of it.
- The car really drives there, in the city's traffic
  (`food-rider/src/client/deliveryman.js`, `isometrica/src/client/traffic.js`): as
  fast as the roads let it, so an order takes as long as the queues at the
  junctions, the slow lorry in front and the car broken down in the way make
  it - the times the panel shows ahead of the car are what is left at the
  speed it would make on empty roads, and come out later in traffic. The
  rest goes by the clock on the wall (`food-rider/src/client/courier.js`):
  the food cooks from the moment the order is taken, and loading and handing
  over take what they take, with the game closed too. The drive itself only
  goes on while the game is open; the car is kept where it had got to.
- Every so often the car's own engine gives out on the way - about once in
  every 160 tiles it drives, at random, somewhere on a street it can pull
  over: it pulls in to the kerb, out of the traffic's way, and stands there
  smoking for a minute or so before it goes again by itself; or the player clicks the Fix button that comes up over it (or the
  one in the panel), and it is going again in four seconds.
- The places come out of the buildings standing in the city
  (`food-rider/src/client/places.js`): the small shops are restaurants -
  burgers, pizza, sushi, noodles, kebabs, tacos - the stores and markets sell
  groceries and the old town bakes; the houses, flats and offices order. Each
  is what it is by the tile it stands on, so the same building is always the
  same restaurant and the same customer, and the car pulls up on the road
  alongside it nearest its middle.
- The car's way is found over every road there is rather than the ones
  loaded on screen (`food-rider/src/client/roads.js`): two join where they
  meet level (`Surface.meets`).
- The courier - money, the car, the order on and the board - is saved in a
  storage row of its own, `food-rider.v1.courier.<city id>`, next
  to the city's save.

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
`wrangler.jsonc` - `food-rider` from main, `food-rider-dev` from develop,
previews from any other branch - on workers.dev, no domain of its own yet.

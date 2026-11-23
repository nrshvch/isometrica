# food-rider - the delivery game

A courier with a car delivers food in a city built in the city builder. The
city is only the scene: nothing is built while playing. Only this game's own
part lives here. How the world works (roads, traffic, buildings, painting) is
isometrica's: look there, and put such changes there.

## Where things are

- `src/main.js` starts it. `src/game.js` - what the game is (a minute a
  tick, save keys `food-rider.v1.*`, the courier's money in the top bar).
  `src/play.js` puts the courier into isometrica's client.
- `src/client/`:
  - `deliveryman.js` - the game in the world: the car on the roads, the
    camera following it, pick-ups and drop-offs.
  - `courier.js` - the player: car, money, the order on, saved under
    `food-rider.v1.courier.<city id>`.
  - `orders.js` - the board of orders. `places.js` - restaurants and
    customers out of the city's buildings.
  - `roads.js` - every road for route finding, not only those on screen.
    `marker.js` - marks over the world.
- `src/ui/` - Backbone + jQuery + Handlebars (`modules/*/templates/*.hbs`),
  styled with Less: `modules/delivery` (the courier's panel), `topbar`,
  `gamescreen`, `world`, `prompt`, `splash`, `valbar`. Router in
  `ui/js/mainrouter.js`.

## Commands (here, or `-w food-rider` at the root)

- `npm run dev` - Vite, isometrica built first. `npm run build` - into
  `dist/`.
- Deploy: `.github/workflows/food-rider.yml` (`wrangler.jsonc`).

## Docs

`README.md` - how the game plays and where each part is.

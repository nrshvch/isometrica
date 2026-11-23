---
name: lab
description: isometrica's lab - pages to look at the world without a game (sprite gallery, sounds, music, woods map, traffic testbed, lighting bench) and the benches that run the game's own client (buildings, demolition, replace, explosion, fire, climate, cities); bench/stage.js and bench/world.js; lab/ui; building and deploying the lab. Load before adding or changing a lab page or bench.
---

# The lab

`isometrica/lab/`: pages to look at the world without a game. Everything is
painted and played in the page, nothing made beforehand.

## Pages

`npm run dev -w isometrica` (or `npm run dev:isometrica` at the root) opens
them all from `/`:

- `/sprites.html` - every picture the generators paint (`shared/gen/catalog`),
  a generator at a time, painted in the page off its thread
  (`sprites/painters.js`) as they come into sight; filter by name, lit or at
  night, bigger, on another ground, click for name and size;
  `sprites.html#trees` opens a generator. Also every ground the terrain
  painter has that the game does not, marked "not in the game".
- `/sounds.html`, `/music.html` - the sound skill.
- `/woods.html` - the world's trees from straight above, a few pixels a tile:
  the kind on every tile (`core/woods` treeAt) or the wood (woodAt), on the
  sea, shore and land (lighter the higher), coloured by climate zone. Stones
  and cities are left out.
- `/traffic.html` - the traffic testbed (traffic skill).
- `/lighting.html` - the bench the canvas-only ways of lighting were weighed
  on (a normal map, or three faces, drawImage only), against the town as
  painted.
- The benches below.

## Building a page

- Each page is an HTML file that mounts a React component; its folder holds it
  and whatever it works with (`sprites/` the gallery and its painting workers,
  `woods/` the map, `lighting/` the bench...). Styled with Tailwind; shared in
  `lab/ui` - the look in `lab.css`, buttons and fields in `kit.jsx`, the list
  of pages in `pages.js` (the order on the front page and in the top bar).
- A new page: its HTML file, its folder, an entry in `lab/ui/pages.js`.
- Benches draw with the game's own client: on a stage of nothing but its
  drawing (`bench/stage.js`), or on a world of its own (`bench/world.js`).
  It finds the pictures in `gfx/`, served and copied in as a game's build
  does (`isometrica/vite.mjs`), after `npm run build` here.
- One client to a page, StrictMode or not.

## Build and deploy

`npm run build:lab` builds every page into `lab/dist` (`lab/vite.config.js`).
`.github/workflows/isometrica.yml` puts it on Cloudflare Workers
(`wrangler.jsonc`): a `lab/vX.Y.Z` tag → the `isometrica-lab` Worker, main →
`isometrica-lab-dev`, any other branch → a preview,
`https://<branch>-isometrica-lab-dev.<subdomain>.workers.dev`.

## The two kinds of bench

- `bench/stage.js` (the building bench): the game's drawing - engine,
  pictures, light, camera (`client/vkaria` prepare, start) - over a patch of
  flat grass on ground of its own laid flat the way a save lays it
  (`core/terrain` load). Nothing else runs: no ticking, no city, no
  bulldozers, no traffic.
- `bench/world.js` (demolition, replace, explosion, fire, climate, cities): the
  game's own client and world out in the open sea, only the bench's patch
  drawn - flat grass, nothing of the world's own on it (no trees or stones off
  the patch) - and a city of nobody, rich enough never to be short, to own
  what is put up. What is put up goes up whole there and then, unpaid,
  nothing floated (put), on tiles counted from the middle of the patch.
  As warm as the world's green wherever it is (`core/climate` setHeat),
  unless a bench lays out the climate its own way.
- Both: ten in the morning in clear weather, nothing saved, nothing heard
  (the game's sound is off; the explosion bench makes its boom itself), as
  fast or slow as asked down to a tenth, or stopped - building sites
  `sitePace` times faster again if asked - turned round or seen from above.
  `window.bench` in the console.

## More

- [benches.md](benches.md) - what each bench puts up and what its buttons do.

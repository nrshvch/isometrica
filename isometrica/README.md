# isometrica

The world the games are played in (`city-sim`, `food-rider`): the terrain,
what stands where - buildings, roads, the surfaces they stand on - the
traffic on the roads, the light it is all drawn in, and the generators that
paint every picture of it. It has no game of its own and no screens: a game
starts it up and puts its own over it (see the games' `src/main.js`).

- `src/core` - the world itself: terrain, the climate (`climate.js`, see the
  generators skill), buildings and roads, cities, the clock, saves.
- `src/client` - the world on screen: chunks streamed in round the camera,
  building and road views, traffic (`traffic.js`, `carman.js`), the WebGL
  renderer and lighting (`glview.js`, `lighting.js`), the sprite cache and
  the generator worker (`generator.js`).
- `src/shared/gen` - the generators: ground, roads, buildings, trees,
  vehicles, stones, smoke - everything there is to see; nothing is drawn by
  hand - and the sounds and the music (`sounds.js`, `music.js`, see Sounds
  and Music), which share what they are made with (`dsp.js`).
- `src/data` - what can stand in the world, and the city both games start
  on (`initialcity.js`).
- `src/citygen` - cities generated afresh out of a seed: a small town, a
  city of Peepstown's size or Peepsopolis, built up all of it somewhere in
  the world, as a save a game starts a new city on (`index.js` generate; see
  [generated cities](../city-sim/docs/cities.md#generated-cities); the
  engineering notes for working on it are the `citygen` Claude skill,
  `isometrica/.claude/skills/citygen`) - and the city bench to look at them on (see
  Benches).
- `npm run build` writes `dist/gfx`: the manifests of what every generator
  will paint.
- `vite.mjs` - the Vite plugin a game uses to serve and ship `dist/gfx`.
- `docs/performance.md` - where a frame, a click and a tick go, the debug
  panel that shows it, and what is left to make faster.
- `lab/` - pages to look at the world without a game: `npm run dev` here
  opens them all from `/` - every sprite the generators paint, lit or at
  night, at `/sprites.html`, the sounds to listen to at `/sounds.html`, the
  music at `/music.html`, the woods map at `/woods.html`, the traffic
  testbed at `/traffic.html`, the building bench at `/buildings.html`, the
  demolition bench at `/demolition.html`, the replacement bench at
  `/replace.html` - a building put up in the place of itself, another look
  of it, or of whatever else covers its ground, coming down and going up
  again the game's way, its site as fast as asked - the explosion bench at
  `/explosion.html` - a building blown up, pieces torn off it in a
  fireball and the rest of it coming down a tile at a time, dust hanging
  over it, its rubble left lying till the bulldozers clear it and its
  yard wrecked; or two of it side by side, a pile each, on the flat or on
  a slope; or with its neighbours round it, the blast bringing down the
  ones next to it and across the road and knocking about the one further
  off -
  the fire bench at `/fire.html` - a building set on fire, spreading
  floor by floor and tile by tile, black smoke rolling up off it, and left
  gutted, a roofless shell or fallen in, by what it is built of, a
  burnt-out ruin, a day of it as fast as asked, by day or at night - the
  climate bench at `/climate.html` - every zone of the climate on one
  island, how each gives way to the next, the water freezing over - the
  city bench at `/cities.html`, and the lighting bench at `/lighting.html`. Everything is painted and
  played in the page, nothing made beforehand.
  Each page is an HTML file that mounts a React component - its folder
  holds it and whatever the page works with (`sprites/` the gallery and its
  painting workers, `woods/` the map, `lighting/` the bench...) - styled
  with Tailwind; what they share is in `lab/ui` (the look in `lab.css`, the
  buttons and fields in `kit.jsx`, the list of pages in `pages.js`).
  `npm run build:lab` builds them into `lab/dist`, and
  `.github/workflows/isometrica.yml` puts that up on Cloudflare Workers
  (`wrangler.jsonc`): a `lab/vX.Y.Z` tag → the `isometrica-lab` Worker,
  main → `isometrica-lab-dev`, any other branch → a Preview of it,
  `https://<branch>-isometrica-lab-dev.<subdomain>.workers.dev`.

A game depends on it by path (`"isometrica": "file:../isometrica"`) and
imports its modules as `isometrica/<path under src>`, e.g.
`isometrica/client/main`, `isometrica/core/terrain`. It is drawn with the
engine in `engine/`.

### How each part works

Written down for working on it, as Claude skills in `.claude/skills/` - a
`SKILL.md` each, and the notes it points to:

- [buildings](.claude/skills/buildings/SKILL.md) - buildings and roads going
  up and coming down: building sites, clearing ground, roads being laid,
  surfaces, demolition, blasts, fire, ruins and rubble; and the city they
  make - its area and road network, people, jobs, water, saves.
- [citygen](.claude/skills/citygen/SKILL.md) - cities generated afresh.
- [traffic](.claude/skills/traffic/SKILL.md) - how the traffic drives: lanes,
  junctions, routes, one-way roads, roundabouts, buses; how many cars and
  why; the traffic testbed and `npm run test:traffic`.
- [rendering](.claude/skills/rendering/SKILL.md) - how the world is drawn:
  the WebGL renderer and its light - the sun, shadows, the night's lamps and
  windows - the weather, the wind, the sea, the camera turning and zooming,
  and what is drawn over the city.
- [generators](.claude/skills/generators/SKILL.md) - how every picture is
  painted: the painting worker and the manifests, buildings out of boxes,
  the ground and the climate's zones, trees, stones, roads, vehicles, smoke.

### Benches

- `lab/buildings.html` (`npm run dev` here, or the lab deployed) is the
  building bench, a unit test of a building coming down: the game's own
  drawing and nothing else (`lab/bench/stage.js` - its engine, pictures,
  light and camera, over ground of its own laid flat the way a save lays
  it, `src/core/terrain.js` load: no world ticking, no city, no
  bulldozers), a patch of grass two tiles wider than the building all
  round, and one building of any kind on it, whole, put together out of its
  parts the way the game puts it together (`lab/buildings/stand.js`).
  "random" gives it another look, "any" picks any building, it turns on its
  ground; "demolish" brings it down the way it comes down in the game - the
  game's own `Demolition` (`src/client/demolition.js`), fenced off and every
  tile of it told to come down at once - and "restore" puts it back up.
- `lab/demolition.html` is the demolition bench: the game's own client and
  world out in the open sea (`lab/bench/world.js`), of all of it only its
  own patch of flat grass drawn, a city of nobody on it, no traffic; a few
  buildings, trees planted and a road along them
  (`lab/demolition/scene.js`). "destroy" clears it all the way the game
  clears ground - fenced off, the bulldozers coming, a building coming down
  a tile at a time as they get to it, the trees going over, the road broken
  up, one price floated over the lot - "reset" puts it up again once they
  are done, and "again" does both.
- Both go as fast as asked, down to a tenth, or stopped, at ten in the
  morning in clear weather, nothing saved or heard, and turn round or are
  seen from above. `window.bench` in the console. Their ground is as warm
  as the green of the world (`src/core/climate.js` setHeat), wherever the
  world's own climate would have it: grass.
- `lab/climate.html` is the climate bench: every zone of the climate on one
  island, on the same world as the demolition bench (`lab/climate/
scene.js`) - the desert at one end, then the savannah, the green and the
  arctic, the north at the other, each a stretch of it as long as the others,
  its temperatures from its one edge to its other spread along it: what the
  world spreads over thousands of tiles pressed into a dozen or so, the bench
  laying the climate out its own way (setHeat), so that every border can be
  seen at once - the zones mixed in patches, the ground of the one spilling
  over the edges of the other. A river winds
  from one end to the other through every zone, deep in its middle, and the
  sea is all round, so every zone has its shore: a sand beach, and out in
  the cold the water frozen over, the ice closing over open water from its
  edges, frost for a beach. Hills stand in every zone for its ground on the
  slopes, and the trees and the stones are the ones the world puts there by
  itself: the savannah's cacti and dried-out trees, the woods of the green,
  the snowy firs and pines, the pines dying off, then the firs, then only
  dead trunks, and in the desert and the north nothing. Warmer or colder moves every zone along it;
  it turns, is seen from above, and goes nearer or further - "all" the
  whole island.
- `lab/cities.html` is the city bench, for how a generated city
  (`src/citygen`) is laid out and nothing else: the bench's own world
  (`lab/bench/world.js`), a patch of flat grass as big as the window the city
  was planned in, and the city generated on ground as flat as that - no
  water, no hills (generate's `flat`) - put up as a save would have it, its
  roads laid in what they are laid in and going the way they go, every
  building facing its street (`lab/cities/scene.js`). A small town, a city of
  Peepstown's size or Peepsopolis; a small town's layout - along a road,
  round a crossroads, a tee or a green - or any; the seed, the one before,
  the one after or any - each a new city in the place of the last at once,
  the size and the seed kept in the address (`#size=city&seed=7`). Down the
  side, how it came out: its blocks, squares and roundabouts, its roads by
  what they are laid in and how many go one way, its buildings by kind, and
  how long it took to generate and to put up. Nobody lives in it and no
  traffic drives it. While a city is put up or taken down a building at a
  time, the roads are drawn plain and only work out their pieces once at
  the end: each building would have the roads by it ask whether they are
  the city's streets, worked out for the whole city every time.
- `npm run test:cities` (`tools/citytest.mjs`) generates cities headless -
  twelve of every size, `--size=town,city,metropolis` `--seed=N --seeds=N`
  for which, `--at=x,y` for where about - and says how each came out, and
  fails if anything in one is not the way the game wants it: roads side by
  side that do not meet, a part of the roads the traffic cannot get to
  (`lab/cities/check.js` drivable), and, the city opened in the world as a
  game opens it, every building asked what it goes without, as the game asks
  it over the world (`src/client/worth.js` wantOf) - cut off, no road, no
  water. `--map` draws each in letters (`lab/cities/check.js` map: `#`
  asphalt, `%` cobbles, `:` gravel, arrows one way, `~` water; the buildings
  by what they are, the tile each stands on in capitals).

### Sounds

- The sounds are made the way the pictures are, out of nothing but numbers
  (`src/shared/gen/sounds.js`): noise and plain waves, put through filters
  and shaped by envelopes, after Andy Farnell's Designing Sound - take a
  sound apart into what makes it and build a small model of that - with
  the pieces every synthesis book has (Curtis Roads' Computer Music
  Tutorial): white, pink and brown noise, band-limited saw and square
  waves, Robert Bristow-Johnson's two-pole filters, and a little Schroeder
  reverb of combs and all-passes for the room, the street or the sky round
  a sound. They are a little toony on purpose, like the pixels.
- `thunder` - overhead, near, far off and a double strike: the crack, many
  short N-shaped waves from along the bolt, then the sky burping - trains
  of low pulses slowing down under rumbling noise, later and softer from
  further along the bolt - and the long roll under them, in the open sky.
- `horn` - beep, beep-beep, a little car's meep-meep and a bus's honk: two
  notes a third apart, squarish, through the ring of the horn, each bending
  up into tune as it starts, and a slap back off the buildings.
- `siren` - the wail, the yelp and the two-tone nee-naw, through a
  loudspeaker's horn. It loops: the pitch is tuned so a whole number of
  cycles goes into every turn of it.
- `forest` - birdsong, and a breezier one: wind in gusts, the leaves
  rustling when it blows hardest, and birds - chirps, trills, a two-note
  whistle, a warble - near and far, round the listener.
- `sea` - calm, and rough with gulls: waves - a swell rising, the break, the
  wash fizzing back down the beach, duller as it goes - over the surf
  further out.
- `city` - day and night: a town from a little way off - the roar of its
  traffic coming and going, cars whooshing by, a hum, now and then a horn -
  quieter at night.
- `gulls` - crying, and laughing: the shore - a breeze off the sea, and
  gulls near and far, their cry falling, raspy, and the herring gull's
  long call: one high cry, then ha-ha-ha quicker and lower.
- `skyline` - day, rush hour and night: a real city heard from high above
  it, not a cartoon of one - the way Pizza Tycoon's city map hummed - its
  own models (`src/shared/gen/skyline.js`). The roar of the whole town an
  octave at a time, each wandering on its own, falling off above 250 Hz as
  a city's noise does; cars, lorries and buses rising out of it over
  seconds and sinking back - tyres, cylinders firing, a bus up through its
  gears, its brakes hissing; real horns, a diaphragm buzzing through a
  trumpet, tapped, leaned on and answering each other in jams, each coming
  back off the buildings; the wind up there; all of it in the long ring of
  the streets, an eight-line feedback delay network. 36-second loops, two
  to six seconds each to make.
- `woods` and `offshore` - the country heard from above it, as real as the
  skyline (`src/shared/gen/country.js`), not the cartoon `forest`, `sea`
  and `gulls`. What goes on all the time soft and smooth - the air, the
  leaves - rising and falling on its own, with no tone or grain in it;
  what stands out of it far off, duller the further (the air, and the
  leaves in a wood, taking the top off), ringing on round about (the same
  feedback delay network as the streets,
  `dsp.js` `ring`). `woods` by day: the air in the trees, the leaves
  rustling softly, fluttering, louder in a gust - and the birds of a wood,
  each its own song from where it sits, over and over with a while
  between: a chaffinch's run down and flourish, a great tit's tea-cher, a
  blackbird fluting and twittering, a robin wandering high, a wren's
  trills, a wood pigeon cooing, a woodpecker drumming - each a pure whistle
  sweeping fast (the syrinx), never quite steady. By night: crickets near
  and far, each on its own steady beat, and a tawny owl's hoo ... hu,
  hu-hu-hoooo. `offshore` a breeze and a gale: only a slight wind over the
  sea, a light woosh rising and falling, stronger and gustier in a gale -
  no waves, nothing breaking: the sea on screen is calm. 36-second loops,
  one to three seconds each to make.
- `bells` - the old town's small church heard from above it
  (`src/shared/gen/bells.js`): its one small bell, rung for a service -
  swung, a stroke about once a second, coming up as the swing does and
  dying down as it is let go - or tolled, a few slow strokes. Its partials
  as the founders name them - the hum (a small bell's, faint), the prime,
  the tierce a minor third up, the quint, the nominal and on up - each two
  close together beating (its warble), soon quiet; heard from the tower
  some way off, a little ringing back off the houses. Not a loop: played
  now and then.
- `forest`, `sea`, `city`, `gulls`, `skyline`, `woods`, `offshore` and
  `siren` loop without a seam - what goes on all
  the time is made longer than the loop and its end faded into its start;
  what happens now and then is laid in round the loop - the rest play
  once. `generate("thunder/2", rate)` makes one, the same every time - two
  channels of numbers -1..1 for Web Audio's `createBuffer` - and `list()`
  names them all. The game plays them (see Sound in the game).
- `npm run generate:sounds` writes them all out as .wav files to
  `assets/previews/sounds` (`tools/gensounds.js`), and `lab/sounds.html`
  (`npm run dev`) makes and plays them in the page. A 30-second loop takes
  a second or two to make at 44.1 kHz - half that at 22.05 kHz.

### Music

- The music is made the way the sounds are (`src/shared/gen/music.js`):
  slow, light, a little smoky jazz, a New York trio after hours played by a
  band of numbers - a Rhodes comping, an upright bass, brushes and a ride
  cymbal, and a lead that says a few things and leaves a lot of room.
- A piece for each place - `town`, the small town in the country (a jazz
  guitar), `city` (a muted trumpet by day, a sax by night) and `outside`,
  the fields and woods (a flute by day, a vibraphone by night) - by `day`
  and by `night`, the way Minecraft's music lets you feel the sun has gone
  down: slower, darker keys, sparser, strings under it, a bigger room.
- And each of those three ways, for the weather: `clear`; `rain` - lazy: half
  the notes, held, laid back behind the beat, the bass on the roots, the
  drums down to a slow brush swirl, dulled, an old tape wobbling and a
  record crackling; and `storm` - picked up: the bass walking hard with dead
  notes kicking in, the ride busy, crashes and a tom fill every eight bars,
  the Rhodes stabbing the offbeats, strings shivering, the lead running
  fills between its phrases. The three are the same tune at the same tempo,
  sample for sample as long as each other: a game starts all three together,
  looping, and turns up the one for the weather - it picks up or slows down
  mid-phrase, without a seam. A rainy one is quieter than a clear one and a
  storm louder. Every one loops without a seam.
- After the books: the harmony a standard's - ii-V-Is, turnarounds, a
  backdoor cadence, modal pieces for the open country - in a 32-bar AABA;
  the Rhodes in rootless voicings, each chord's voices moving as little as
  they can, comping on the Charleston and off the beat (Mark Levine, The
  Jazz Piano Book); the bass walking - root on the downbeat, chord tones
  and steps, a half step into the next root - or in two (Ed Friedland,
  Building Walking Bass Lines); the melody a motif stated, answered,
  restated over new chords and brought home on a long note, stepping
  through each chord's scale and landing on its tones on the strong beats
  (Mark Levine, The Jazz Theory Book; Gerhard Nierhaus, Algorithmic
  Composition). The instruments: the Rhodes is Chowning's FM with the click
  of its tine; the bass and guitar Karplus-Strong plucked strings; the
  horns saws through formants; the vibraphone inharmonic bars and a motor's
  tremolo; the cymbals six square waves at odd ratios, as the old drum
  machines made theirs.
- `generate("town/night/rain", rate)` makes one - the same every time - and
  `list()` names all eighteen with their tempo, bars and length. A piece
  takes three to five seconds to make at 44.1 kHz, so a game makes them in a
  worker, ahead of when they are wanted (see Sound in the game).
- `npm run generate:music` writes them all out as .wav files to
  `assets/previews/music` (`tools/genmusic.js`); `lab/music.html` (`npm run
dev`) plays them the way a game would - all three weathers together, the
  weather buttons fading between them in time.

### Sound in the game

- Both games sound the same way (`src/client/audio/soundman.js`), every
  sound made in two workers (`audio.worker.js`, `maker.js`) the first time
  it is wanted, and kept - but only once the pictures on screen are all
  painted (`Soundman#painted`: the generator has painted some and waits on
  none): what is seen comes first, and what is to be heard waits for it,
  the workers not even started before. A loop (the places, the hum of the
  town) made a while after it was first wanted fades in over two
  seconds, not all at once:
- the music (`audio/music.js`) - `city` when the screen is a good part
  town, `town` when there is a little of one on it, else `outside`; `day`
  or `night` by the hour; all three weathers of it playing together and
  turned up and down to the weather there is (client/weather): a storm the
  storm, rain or a grey sky the lazy one. A new place or time has to hold
  six seconds before its piece fades in over the old.
- the place - what is on screen looked over twice a second, a grid of
  points over it sorted into sea, shore, woods, fields and town: the woods
  and the fields (a little less of them) `woods` - its birds by day, its
  crickets and owl at night; the sea, `offshore` - a slight wind over it,
  a breeze or a gale by the weather; the shore nothing of its own. Each as loud as there is of it,
  louder zoomed in, one into the next by power, so panning out of town the
  hum gives way to the country or the sea, never to silence. The town on
  screen hushes the woods; rain drowns the birds a little.
- the old town's church (`bells`) - the old town's blocks on screen looked
  for one by one (the grid would miss a small one): by day, while one with
  a church is on screen (a church, a square before one, or an old town
  centre, by its look), its bell now and then - a few seconds after a
  church is first seen, then every minute or so, its time going on with
  the church off screen too (one due meanwhile rings as soon as a church
  is on screen again): mostly rung for a service, now and then tolled,
  from where the church is across the screen. The old
  town's lanes have no cars: it is not the busy middle of a town for the
  hum.
- the hum of the town, from above (`skyline`) - full over the busy middle
  of a town: the shops, offices and works on screen, and the cars going
  about it. Faint and dull, far off, over the outskirts and the quieter
  streets of houses, or with the town just off the screen (looked for two
  and a half screens round); hushed in the woods. The day's, the rush
  hour's and the night's by the hour the city is drawn at
  (`Lighting#shownHour`), one into the next - with the day and the night
  not going by, ten in the morning's all the while, as are the places'.
- thunder - each flash of lightning to come is known ahead of time
  (`Weather.flashesAhead`, the same sums as `Weather.flash`), so its
  thunder starts a moment before the sky lights up.
- horns - a car stood in a jam three and a half seconds may honk (and again
  after nine), and two cars going by each other now and then give a toot;
  each kind of car its own horn - a bus or a lorry honks, a van meep-meeps,
  a taxi beep-beeps - each car a little higher or lower, to the left or
  right of where it is on screen and quieter further off.
- For now only the hum of the town and the places are heard: the music,
  the thunder and the horns are kept quiet - the music with no button or key to
  turn it on (`QUIET` in soundman.js), and
  police cars make no sound.
- Nothing plays until the page is touched, clicked or typed at - a browser
  plays nothing before (`audio/wake.js` wakes it in the touch, the way
  iPhones want it, and plays through the silent switch). The sounds go off
  and on with S or the ♫ in the top bar - kept in the browser;
  `?sounds=off` (or `?sound=off`). It goes quiet while the page is out of
  sight.
- Next to the ♫, ☾ night in the top bar (or N) has the day and the night
  go by (see the lighting), and next to that the top bar shows the zoom the
  camera is at - its step, 1x (0.5) to 5x (2) (each game's `ui/modules/topbar`), kept as it
  was while the world turns.

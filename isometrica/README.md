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
- [generators](.claude/skills/generators/SKILL.md) - how every picture is
  painted: the painting worker and the manifests, buildings out of boxes,
  the ground and the climate's zones, trees, stones, roads, vehicles, smoke.

### Traffic

- Everything on the roads drives the same way (`isometrica/src/client/traffic.js`):
  in its lane, on the right, looking a couple of tiles along its way for
  whatever is on it. It brakes to keep a gap that grows with its speed and
  speeds up again a little at a time, so a queue sets off one car after
  another rather than all at once, and nothing ever drives through anything
  else.
- A one-way road has two lanes going its way. A car keeps to the right one
  whenever it can, and takes the left only to turn left - two tiles short
  of the junction - when the right is busy, or to overtake: coming onto the
  road, it takes the left if the right has two more in it ahead; stood in a
  queue in the right, it goes over into the left if that is clear alongside
  and has fewer ahead; and in the left, it goes back into the right as soon
  as that is clear a good way ahead (planLanes, Driver#switchLane). It
  changes lanes along the road only, never in a junction, its indicator on -
  and only once there is room for it in the other lane: it waits at the
  start of the change, still in its own lane, till nothing is alongside
  where it comes in nor close behind, and one coming up that lane that can
  still stop lets it in, zip-fashion (crossingAhead, Traffic#mergeBlocker).
  Two level with each other that each want the other's lane go one at a
  time: the one behind puts its change off a tile, or with the junction
  next, turns from the lane it is in (Driver#putOffMerge). And one that has
  waited two and a half seconds for room gives up changing lanes: it keeps
  to the lane it is in into the next junction and turns from there
  (Driver#keepLane) - where both lanes stand, round a roundabout most of
  all, it would otherwise wait for good, and everything behind it.
  The next stretch of its way is joined on a few tiles before the end of
  the one it is on, so it is in the lane for a turn at the start of it.
  Where two side by side do not cross each other's way through a junction,
  they go through it together. A junction is wherever three or four roads
  meet, one-way roads coming into it counted as much as those going out -
  and where a one-way road joins one both ways, where what is on that turns
  round across the way of what comes off the one-way road: they take their
  turns there as at any junction. Into a junction only with room on the
  far side for it and for everything already let in that comes out the
  same way, so none is left stood in the middle; and a car jammed at one
  goes another way out only where the lane it is in goes.
- A junction - a road tile joined three or four ways - is taken a turn at a
  time. The first car in each lane asks for it on the way up, and goes in
  once nothing in it is in its way - crossing its way (straight across, a
  left turn across what comes the other way, or into the same street) and
  not yet past where it does - nobody who has waited longer for a way that
  crosses it is ready (and not held up itself by what is going through: for
  a few seconds that one lets others go first, so two junctions close
  together do not each hold the other up), and there is room on the far side to come out into,
  or what is there is driving on away - nobody stops in the middle of a
  junction. Ways that never cross go through together: straight on from
  either side, two turning right, one turning right and one straight on
  into another street. Junctions next to each other are asked for
  together. So queues back up from a busy junction, into the junction
  behind it, and clear the way a jam does.
- A car stood first at a junction for a few seconds because the way it goes
  out of it is jammed, not just waiting for the traffic across it, goes
  another way out of it instead if one has its lane clear - never back the
  way it came - on a route picked from there (`carman.js` detour, `Driver`
  jammedAt). A bus keeps to its round.
- Nothing turns round in the middle of a street, across the lane coming
  the other way - that is what locked a small town's streets solid. A route
  only turns back at a junction - three or four roads joined - taking its
  turn there like anything else going through, or at the end of a road
  (`Traffic.route`). Not where a street both ways ends in a one-way street
  coming into it: there is no going on there, but it is no dead end, and
  turning round there across what comes off the one-way street is what
  piled the traffic up. A route also gets to where it is going facing a way
  it can drive on from - down that one-way street rather than up the other
  to its top - so nothing is left with nowhere to go but back. Turning
  round costs a route eight tiles, so a car would sooner go round the block
  than turn round at a junction in everybody's way.
- How fast a car goes is how fast the road under it is driven: asphalt at
  its own speed, cobbles a tenth slower, gravel a tenth slower again
  (`core/roadrules.js` paceOf, Driver#pace) - a courier's way down the old
  town's cobbled lanes or a gravel track takes that much longer.
- And what it costs: a tile of asphalt $1,000 to lay, cobbles 70% of that,
  gravel half (`core/roadrules.js` costShare, CityBuildings costOf) -
  charged and quoted while it is laid alike - and nothing to keep, so a
  town can reach out into the country with lanes to its farms. Clicked, a
  road is ground like any other.
- A roundabout - any small loop of one-way road, twelve tiles round at most
  - locks solid once it is full: everything on it waits for what is in
    front of it, all the way round. So what comes onto it gives way to what
    is going round it already, and comes on only while less than half of it
    is taken up (`traffic.js` mayEnter, Traffic#loopOf).
- There is a car for every four of the city's road tiles loaded through
  the day - the roads that join its buildings, out to its villages, not the
  ones leading nowhere (core/city/cityroads inNetwork) - and more in the
  rush hours: about one for every two and a half at eight in the morning
  and five in the evening (`isometrica/src/client/carman.js`) - a gravel
  lane counting for a quarter of a road, and a quarter as likely to be set
  out from, so a village's lanes stay quiet (GRAVEL_SHARE). No city, no
  traffic: roads alone lead nowhere and come from nowhere.
- Every car is out for a reason (`carman.js` PURPOSES, CarScript#purpose),
  and only ever goes somewhere in the city - so nothing drives off down a
  road that leads nowhere, but to turn round at the end of it on its way. In
  the morning the light cars set out from the houses and are done when they
  get to work, in the evening the other way round; the rest of the day they
  go from one of the city's buildings to another, and the few out in the
  small hours about its streets. A van goes calling from a house or a shop
  to another; a cab from any building to any other, at any hour; a truck or
  a lorry comes from anywhere - any road - into the city; a police car goes
  about the city's streets. After the rush the light cars more than the
  hour wants are done when they get where they are going. A car done for
  the day - home, at work, or one too many - does not just vanish: it pulls
  in at the kerb at the end of its way, on a straight bit of street a tile
  or two on if it would end in a junction or round a bend, stands there a
  moment with its lamps off, and dissolves a pixel at a time (`carman.js`
  parkToLeave, leave). A car
  that has waited a minute in a queue that does not move turns off out of
  sight and is put on some other road - a queue behind a bus at its stop
  waits for it.
- A car keeps its way however the roads change under it
  (`carman.js` findWay): a road on its way pulled up, or made one way
  against it, it finds another from where it is; its road pulled up from
  under it, it drives slowly off the edge of it straight to the nearest
  road, its hazard lights going, and on from there; nowhere to go at all, it
  wanders about the roads it can get to, slowly, hazard lights going, till
  it finds its way again - or, after a minute and a half lost, is given up
  on.
- A car breaks down every so often: it pulls over to the kerb, out of the
  traffic's way, and stands there smoking for a while, then pulls back out
  once the lane behind it is clear. It only gives out on a street, clear of
  the junctions, where it can pull over - until then it crawls on.
- The buses run between the bus stops (a stop is a road with a shelter on
  each pavement - of steel and glass on asphalt, of green-painted cast iron
  on cobbles, and of timber on the verges of a gravel lane,
  `isometrica/src/shared/gen/roads.js`; `Road#isStop`), each a round of a
  few stops near each other, standing at each for a few seconds in its
  lane. The traffic behind it queues; the first car to get to it goes round
  it through the other lane, once that is clear well ahead and there is no
  junction in the way, and the next only when that one is back in its lane.
  The bus waits for whoever is going round it before it moves off. A car
  stuck behind something driving on slower than it would - a lorry, a car
  about to break down - goes round that too, a good deal quicker than it
  would otherwise go, once it has followed it a moment, if the road is
  straight with no junction for as far as it takes to get past and the
  other lane clear for as far as what comes along it would get meanwhile. There is a bus for
  every two stops loaded, and none at night. The city a new player starts
  on has a few stops on its streets; a city with none is given a few as it
  is opened, on straight streets with something built along them.
- Cars are painted eight ways round: along x and y and half way between,
  which is how they cut the corner turning at a junction, swing round to
  turn back at a junction, pull over to the kerb and out again, and pull out
  round a bus at its stop.

### Traffic testbed

- The traffic is tried out on its own, away from any city, in a testbed
  (`lab/trafficbed`): the game's own `traffic.js` - the same drivers,
  junctions, lanes and routes - on roads drawn as text, with the cars put
  where we say, of the kinds we say (a car, a van, a lorry, a truck, a
  bus), going where we say, a step at a time. As it goes it counts what
  goes wrong: a car turning round where the road just goes on, standing in
  the traffic too long, a ring of them each waiting on the next, two on top
  of each other, one with no way to where it is going.
- `lab/trafficbed/scenarios.js` - a street round a corner, streets of
  asphalt, cobbles and gravel side by side, a one-way street
  coming into the end of one both ways, a roundabout, a one-way street of
  two lanes into a junction, a bus at its stop, cars parking at the kerb, a
  grid of streets thick with traffic, and the city the games start on with
  sixty cars and two buses (`city.json`, its roads taken from the game) -
  each with what has to hold by the end of it.
- `npm run test:traffic` (`tools/traffictest.mjs`) runs them all headless,
  in a second or two, and says which hold - `--seeds=4` to run each four
  ways, a name to run just that one, `--verbose` for where things went
  wrong. The isometrica workflow runs it on every push.
- `lab/traffic.html` (`npm run dev` here, or the lab deployed) shows any of
  them from above, going: pick where a car starts and where it goes on the
  map, its kind, and put it on; follow one to see its way, what it keeps
  its distance from, why it stands; draw roads of your own; and "check"
  runs it through as the headless runner does. `trafficbed.bed` in the
  console is the bed itself.
- So `traffic.js` loads with nothing of the game around it, the rules of the
  roads it goes by - where two roads join, which way a one-way road goes -
  are in `core/roadrules.js`, which `client/road` and `core/surface` use too.

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

### Sprites

- One wind blows over the whole city (`isometrica/src/client/wind.js`), all
  the smoke there is going with it at once: which way it comes from wanders
  round over a few minutes, and how hard it blows rises and falls over a
  minute or so, with gusts every few seconds - from near calm, the smoke
  going straight up, to a gale that bends it over low. The weather has it
  blow softer or harder: hardly a breath in a fog, a little on a clear day,
  a gale in a storm (`Wind.factor`).
- A tap on nothing - bare ground, a tree, the sea - while nothing is being
  looked at puts away the words over the world ("no jobs", how far along
  one going up is, the city's name) and the grid over the ground: the town on its own, for a picture of it. They stay away while the camera is dragged, zoomed or turned, and come
  back with the next tap on nothing - or with anything else: a tap on a
  building, placing or shaping the ground, a press on any button.
- The camera turns round the city a quarter turn at a time: a finger
  dragged in from the left or the right edge of the screen, or Q and E.
  Nothing in the world
  moves - the engine's camera turns about the up axis, and draws things in
  the order it sees them in (`CameraComponent#depthAxes`). What changes is
  which picture each thing shows: `isometrica/src/client/view.js` says how the
  world looks from the side the camera is on, and the ground, roads,
  buildings, trees and cars each pick their picture by it - a tile's slope
  by its corners as seen, a building turned as many more times as the
  camera is, drawn from the tile of it nearest the camera's own corner.
  It turns at any time, in the middle of placing a building or shaping the
  ground too: what is being placed is drawn again from the new side.
- A pinch follows the fingers all the way (`client/cameracontrol.js`): the
  camera zooms by steps while they move, and in between what is shown is
  scaled up on the page the rest of the way, about the spot between the
  fingers - zooming only: they do not turn it. While they move, it is
  pulled onto 0.5, 1 or 2, where every pixel of the pixel art is the same
  size and sharp, when within 7% of one (snapZoom). Let go, it settles on
  the nearest of its five steps - 0.5, 0.667, 1, 1.5, 2 (`ZOOMS`), shown in
  the top bar as 1x to 5x. The engine finds the fingers where the canvas stands meanwhile, not
  where it is shown (`Viewport#restRect`).
- A finger dragged in from the left or the right edge of the screen -
  starting within 32 page pixels of it - turns the world rather than moving
  over it (`client/cameracontrol.js` onDragStart): the ground nearest the
  eye goes with the finger, a quarter turn for half the screen's width
  across, and back again as the finger goes back towards the edge, before
  it lets go - so a turn begun by mistake is undone by going back. Let go,
  it lands on the next side if it went 30° or more round, and back on the
  one it set off from if not (`COMMIT` in `client/turner.js`); a second
  finger meanwhile does nothing. It leaves the other hand free, and does
  not fight the pinch's zoom. (In Safari, outside a page added to the home
  screen, a swipe from the very edge may go back or forward a page
  instead.)
- A turn of the camera - from the edge, or Q and E - is shown as one
  smooth turn about what is in the middle of the screen - about the ground
  under that, however high
  it stands and however high the land it stands on is over the sea, so that
  it keeps its place, not the ground there as if the world were flat
  (`client/turner.js`, on its own). The camera itself turns about the sea's
  level under the middle of the screen, and is moved for that on every
  side - each side's picture is of what is round the spot where the turn
  lands. Pictures of the side the camera is on and of the sides it turns
  to, each taken zoomed out to take in half as much again as the screen
  shows and bare - no cars (they would be elsewhere by the time it lands),
  no rain, no lightning, nothing drawn over the city: the grid, the names,
  the signs - are laid over the game, each over a mesh
  lifted as high as every pixel of it stands (`GLView#readHeights`), and
  the land under it over the sea (as cars have it, `Carman.groundHeight`),
  turned about the up axis through that spot, in a WebGL canvas of its
  own: what stands up stays upright and swings round where it stands, the
  taller the further. Each side is drawn into a target of its own and the
  two mixed, the one going over into the other halfway: what stands up
  outweighs the ground, and the ground outweighs the edge of a picture
  drawn out past it, all blurred, so that where one side's picture has
  nothing - past its edge, or behind something, where the mesh is drawn
  out from the top of it to the ground behind - the other's shows. Blurred
  the more the further from either side, the rest goes unseen. Each side
  is taken once, as it is - and once more if some of it was still to be
  painted, once it all is. The world's chunks are held as they are while
  it turns, none loaded nor let go of (`Tilesman#hold`), and caught up
  with once it is over. Done, the camera is on the side it ended on, the
  spot it turned about where it was on the screen, and the picture fades
  into the game drawn from there. Q and E turn it quickly at first,
  easing out as it comes round, and add up: each a quarter turn more from
  wherever it is. The picture is laid under the buttons and the bar at the
  top, the first of what is over the canvas. The game only tells it when a
  frame is drawn and draws the city bare for it (`Lighting#onFrame`,
  `calm`, `GLView#bare`).
- The game is drawn at most 30 frames a second (`engine/engine/game.js`),
  and holds still - its clock and its drawing - while the page is out of
  sight (`isometrica/src/client/vkaria.js`).
- The city is drawn in WebGL and lit pixel by pixel as it is drawn
  (`isometrica/src/client/glview.js`, `isometrica/src/client/lighting.js`), by the hour of
  the game's clock: the sun comes up at five behind the walls looking one
  way, goes over and down at half past nine in the evening behind the walls
  looking the other - a long day and a short night - lower and redder
  towards either end of the day, and the shade goes from sky blue to the
  dark blue of night. That is only once asked for - N, or ☾ night in the
  top bar, or `?daynight=on`, kept in the browser: else the city is drawn
  at ten in the morning whatever the hour - the sun well up and off to the
  side, the clock in the top bar going by the game's own time all the same
  (`lighting.js` setDayNight, STILL),
  the clock and all that goes by it (the traffic, the weather, the sounds)
  going on as ever. The canvas only paints the pictures: every picture is
  painted once on a canvas of its own and handed over into its slot on a
  page of the canvas cache - the pages being the layers of one texture on
  the GPU (`isometrica/src/client/canvascache.js`). Every picture painted out of
  boxes - and the ground, the trees and the vehicles, which paint their own
  (`isometrica/src/shared/gen/looks.js`) - is painted as its colours with no light on
  them and which way every pixel of it looks, x, y and z in the red, the
  green and the blue (`isometrica/src/shared/gen/isobox.js` setMode, normalOf), so a
  sloped roof or a hill is lit by the way each pixel of it actually looks -
  and a tree's crown in the flat patches of its three greens, each patch
  looking the way its leaves do on the whole (`isometrica/src/shared/gen/trees.js`
  flatten). Which way a pixel looks and how high it stands are never mixed
  the way colours are: smoke, a shadow or a line laid over the grass leaves
  them as they are under it, unless it is mostly there. How near the eye
  every pixel of the lit city is goes into the depth buffer as it is drawn,
  worked out from where it is on the screen and how high it stands - over
  the ground its picture stands on, and that over the sea (glview depthOf):
  the pictures are still drawn in the order the engine sorts them, but what
  is drawn over them can be hidden behind whatever stands nearer - a car's
  indicators behind the house in front of it - and the courier's car shows
  through whatever hides it (glview xray). Every layer of the city is drawn as one batch of squares,
  a picture each, in the order the engine sorts them (`engine/engine`
  Canvas2dRenderer renderGL) - the lit ones into as many pictures of the
  screen at once, so whatever is in front hides what is behind it in all of
  them alike - and whatever a layer draws as lines, shapes and words, the
  lines round a city, a tile picked out or the price over a building, is
  drawn over its pictures in WebGL too (`isometrica/src/client/glcanvas.js`):
  with the same calls as on a canvas, a shape filled by counting round
  every pixel in the stencil as a canvas fills it, a line a pixel wide drawn
  as a line - never broken up on a slope - and words written on a canvas
  once and drawn from there for as long as they read the same. The frame is
  drawn straight onto the canvas shown on the page (`engine/engine`
  Viewport), nothing copied over to it, and no 2D canvas is drawn on from
  one frame to the next. A click is told what it falls on by the pixel
  itself, read back off its page.
- With them goes how high every pixel stands, a pixel a unit - a storey
  laid on another lifted by as much as it is laid higher
  (`isometrica/src/client/cachedsprite.js` Layers) - painted with its colours
  and the way it looks, a third picture side by side with them. From that,
  as a picture is put together, comes how high it stands over the ground
  under every pixel of it - a pixel h high stands over the ground h pixels
  further down the picture, so a roof stands over all the ground its
  building does and a wall over the ground at its foot (Layers finish).
- By day the sun casts shadows, wherever it is in the sky: every building,
  car and tree drawn - and whatever is drawn just off the screen, as far as
  a shadow reaches - stamps what it stands over into a map of the ground on
  the screen, the most of whatever stands over every bit of it
  (`isometrica/src/client/glview.js` stamp). Every pixel then looks along the
  way to the sun from where it is, a couple of pixels at a step over the
  ground under it and as much higher as the sun is - starting a little way
  out from the side of whatever it is on - and is out of the sun wherever
  something along it stands higher (glview LIT_FS shadowed). So a shadow is
  long in the morning and the evening and short at noon, falls across the
  road and up the wall of the house next door, moves with the cars and
  stays put as the camera turns; where it ends a long way off it frays,
  dithered as the lamps' light is. Everything is taken to stand solid down
  to the ground - a tree's crown casts its shadow as a column would - and
  a tree painted to be lit as it is drawn casts no shadow of its own any
  more. Nothing of it is worked out at night.
- At night two more pictures of the screen go with them: what shines (the lit
  panes of every window, the signs and billboards of the shops and offices
  in their own colours, a street light's lamp, a car's headlights white and
  its tail lights red, a parked car's none). Nothing round what shines is
  painted lit: every street light, every headlight and tail light and the
  flash of a police car - blue, then red - is a lamp, and so is what shines
  of a building. As a building is painted, its lit pixels are gathered into
  cells eight across, each a light where they are, as high as they stand,
  in their own colour and as bright as how much of the cell is lit and how
  brightly - rising quickly, so a single window throws its light and a whole
  lit glass front no more than so much more - one way for each of the two
  ways a building is lit and each of its two stages
  (`isometrica/src/client/generatorcore.js` lightsOf) - and every building lit on
  the screen adds those of the way it is lit just now
  (`isometrica/src/client/lighting.js` windowLights). So a shop front throws its
  colours on the pavement in front of it, a billboard on the roof under it,
  a home's lit windows on its garden, a car's tail lights the road red
  behind it, and a police car colours the road and the walls round it. A
  police car's lamp and a cab's sign glow in their own colours at every hour,
  never darkened by the dusk (glview GLOW). A car blinks its indicators amber at
  its corners on the side it turns to (`isometrica/src/client/traffic.js`
  Driver signal, lighting blinkers), throwing a little amber light round
  them at night: all the way to the next junction on its way, and through
  it, if it turns there and the road up to it is straight - nothing if it
  goes straight over, whatever it does at the next one, nothing round a
  bend or a turn where the road goes no other way, and nothing for the
  junction past a bend till it is round it; turning round left, unless at
  a dead end. Going round something it shows left as it pulls out and
  right as it is about to pull back in; out from the kerb or in to it, just
  before. A car broken down at the kerb, and the courier waiting at the
  side of the road, has all four going - its hazard lights. And a car on
  the brakes - slowing down, or standing in the traffic - shows its brake
  lights, a brighter red at the back of it than the tail lights painted on
  it, and at night throws more red light behind it (lighting brakeLights).
  Every lamp is a little square over just the pixels it
  can reach, lighting each by how far it is from the lamp in the world -
  worked out from where it is on the screen and how high it stands - and how
  squarely it faces it, the headlights in a cone ahead and a street light in
  a cone down under its shade - a pool on the road about as wide as the lamp
  is high, with a little of its light spilling out to the sides below the
  lamp and none up, so a wall by it is lit from its foot up, in one with the
  pool, never in a band of its own at the lamp's height. So a lorry passing
  under a street light is lit on its roof and the side towards the lamp, a
  wall by the street catches the light, a tree's crown is lit on the side
  facing the lamp, and the road under the lamp in its own colours. The light
  is put in steps of a third, at most a third over a pixel's own colours so
  nothing is lit white, dithered between them by where each pixel is from
  the world's origin, so it stays put as the city scrolls by - and a wall is
  dithered as finely as the ground, not a column at a time: pixel art, lit
  as the world would be.
- For now the weather is always clear (`WEATHER` in
  `isometrica/src/client/weather.js`): a clear sky, its few clouds' shadows
  drifting over with the wind, and nothing shown of it in the top bar - no
  overcast, fog, rain or storms, and neither `?weather=` nor W. With it on:
- The weather (`isometrica/src/client/weather.js`) goes by the game's
  clock, the same whenever the game is opened at that time: the days go by
  in spells of eight hours - clear, overcast, fog, rain or a storm, picked
  by a hash of when it is, clear two times in three - each going over into
  the next over an hour and a half, little by little, following the clock
  between its ticks too. Rain comes and goes in showers; some
  mornings a fog lies over the city from before dawn till mid-morning; the
  ground stays wet for three hours after the rain stops. The weather is
  shown after the time in the top bar. `?weather=clear|cloudy|fog|rain|storm`
  holds it at one kind, and W goes round them and back to the clock's.
- It is drawn in the one pass that lights the city (`client/glview.js`
  LIT_FS), from what client/lighting makes of it (weatherSky):
  - the clouds' shadows drift over the city with the wind - half as dark
    as the shadow of anything else (`CLOUD_SHADE` in `client/glview.js`),
    white clouds on a sunny day, so the shadows of what stands under one
    still show in it. The clouds are up in the sky, in two
    layers not far apart (`CLOUDS` in `client/lighting.js`), the higher a
    little slower, and they go by the world, not the screen: turn the
    camera and each is over the same ground it was (`unturned` in
    `client/lighting.js`; the fog's banks and the puddles too). Each one's
    shadow is as far from under it, towards the sun,
    as its height and the sun's make it - going round with the sun through
    the day as the shadow of a tree does - coming up softly to no more
    than a little over twice their height as the sun gets low
    (`CLOUD_SLANT`), so they never rush along. They go with how the wind
    blows over a while, not with every gust (`CLOUD_STEADY`), and are a
    little bigger than the noise they are made of (`CLOUD_SIZE` in
    `client/glview.js`). They change as they go, too, slowly
    (`CLOUD_CHANGE` in `client/glview.js`, noise through time as well as
    over the ground): the big of them over a minute and a half or so, their
    edges quicker - so that over a while one is another shape, and some
    thin away to nothing while others come up out of a clear sky: a few big ones on a clear day, and as the sky clouds over more and bigger, closing up
    little by little till the whole city is under them - the sun lost in
    the cloud, its light spread over the whole sky, grey, shadows faint,
    colours duller;
  - a fog lies over the ground in a layer, in banks drifting with the wind,
    thicker here, thinner there, higher and lower. The eye sees through as
    much of it as lies over what it looks at: the ground deep in it, a wall
    less of it the higher up, the tops of tall buildings standing up out of
    it. The lamps, the cars' lights and the windows show through it, their
    light scattered in it round them, a glow (the lamps' light is mipmapped
    every frame for the blur); by day the sun lights it, warm of a morning.
    It is thinner round the middle of the screen, where the eye is, so what
    is looked at is not lost in it. Rain far off
    is a fog too, and in the rain the lamps glow a little whatever the fog;
  - wet, everything is darker, a road most; puddles lie on whatever is flat
    and grey - a road, a pavement, a car park - where noise laid from the
    world's origin says, more of them the wetter it is, with the sky's grey
    in them by day; and a wet road shines with the lamps over it, their
    light drawn out up it as a wet street's is;
  - the rain falls in streaks a pixel wide, two layers of them, slanting
    with the wind - grey by day, seen at night only where a lamp lights
    them - and drops splash up off the road;
  - at night the city's lights light the sky over it, and the sky what is
    under it - the city is never quite dark, more so under cloud or in a
    fog - while out in the woods the night is near black;
  - in a storm, lightning: everything lit up for a moment, flickering, and
    a jagged bolt down from the top of the screen - switched off for now
    (`LIGHTNING` in `client/weather.js`), and the thunder with it.
- Gloomy enough - a heavy sky, a storm, a fog - the street lights come on
  by day too, a block at a time, and the cars put their lamps on.
- What stands tall has a red warning light on top, blinking each in its own
  time, by day and by night: an office tower on the telecom mast on its
  roof, and the water tower - anything tall that is no home, shop nor
  office - on its highest point. Flats and offices with nothing on the roof
  have none. Where it goes, and whether the top is a mast standing up off
  the roof, is read off the picture of how high each pixel of it stands
  (`client/cachedsprite.js` topOf, `client/lighting.js` beacons).
- Nothing fades - a light is on or off: every finished building puts a few
  of its lights on in the hour from half past eight, each at a time of its
  own, so the windows come on one by one all over the city, and more of them
  a while later - never all of them, every storey and every tile of a
  building lit one of two ways, a long run of glass pane by pane, so no two
  floors of a block are lit alike: about a third of the windows with the
  first of them, two thirds with more. A home and a shop keep them all on
  through the night, till the sun is up - a city at night, never a ghost
  town - an office only a few; a building still going up has none. The street lights
  go on about nine and off about half past five in the morning, a block of
  six tiles by six at a time, each block within twenty minutes either side
  of it; every car puts
  its lamps on and off up to three quarters of an hour after them, each in
  its own time. With `?light=0`, the city is drawn as it is painted, by the
  one sun of old; `lab/lighting.html` (`npm run dev` here) is the bench the ways of doing it with
  the canvas alone were weighed on.
- The sea moves: every tile of water, and the water up every shore, is
  painted in three frames, its ripples running on a wave across it and its
  glints flashing one after another (`isometrica/src/shared/gen/terrain.js` ripples),
  shown in turn for 440 ms each by `isometrica/src/client/animatedsprite.js` - the
  way Transport Tycoon's water moves, pixel for pixel.

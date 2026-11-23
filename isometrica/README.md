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
- [rendering](.claude/skills/rendering/SKILL.md) - how the world is drawn:
  the WebGL renderer and its light - the sun, shadows, the night's lamps and
  windows - the weather, the wind, the sea, the camera turning and zooming,
  and what is drawn over the city.
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

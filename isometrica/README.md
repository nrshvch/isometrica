# isometrica

The world the games are played in (`city-sim`, `food-rider`): the terrain,
what stands where - buildings, roads, the surfaces they stand on - the
traffic on the roads, the light it is all drawn in, and the generators that
paint every picture of it. It has no game of its own and no screens: a game
starts it up and puts its own over it (see the games' `src/main.js`).

- `src/core` - the world itself: terrain, buildings and roads, cities, the
  clock, saves.
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
- `npm run build` writes `dist/gfx`: the manifests of what every generator
  will paint.
- `vite.mjs` - the Vite plugin a game uses to serve and ship `dist/gfx`.
- `docs/performance.md` - where a frame, a click and a tick go, the debug
  panel that shows it, and what is left to make faster.
- `lab/` - pages to look at the world without a game: `npm run dev` here
  opens them all from `/` - every sprite the generators paint, lit or at
  night, at `/sprites.html`, the sounds to listen to at `/sounds.html`, the
  music at `/music.html`, the woods map at `/woods.html`, the traffic
  testbed at `/traffic.html`, the demolition bench at `/demolition.html`
  and the lighting bench at `/lighting.html`. Everything is painted and
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

### Demolition bench

- `lab/demolition.html` (`npm run dev` here, or the lab deployed) runs the
  game's own client (`lab/demolition/bench.js`) on the city every new player
  starts on (`src/data/initialcity.js`), in a save of its own thrown away
  every time the page comes up, the world's clock stood still. Next to the
  city is a stage of open ground: put up a building of any kind on it, nine
  trees planted, a crossing of roads, or all of them, and clear it the way
  the city builder clears ground - the bulldozers coming, a building coming
  down a tile at a time, the trees going over the way they are pushed, the
  roads broken up, one price floated over the lot - or put the last thing up
  again and clear it a moment later ("again"). Any ground can be picked the
  way the game picks it (`client/areaselector.js`) and cleared, and "woods"
  picks the nearest patch of the world's own trees. It goes as slowly as
  wanted - down to a tenth, or stopped - and turns round, or is seen from
  above, in the middle of it all. `window.demolition.bench` in the console.

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

- Nothing is drawn by hand: every picture there is - the ground, the roads,
  the buildings, the cars, the trees, the stones, the smoke - is painted by
  the game itself
  (`isometrica/src/shared/gen`), one picture at a time, the first time something draws
  it, in a web worker (`isometrica/src/client/generator.js`). At build time each
  generator describes what it will paint - every picture's name and size,
  and data such as car pivots - into `gfx/generated/<generator>.json`, so
  the game knows every sprite's size before it is painted. Nothing painted
  is kept between visits: painting a picture takes a few milliseconds, so
  each visit paints just what it draws. isometrica's build (`npm run build`
  in `isometrica/`, which each game's `dev` and `build` run first) writes
  those descriptions and `gfx/manifest.json` into `isometrica/dist/gfx`; a
  game's Vite serves that folder at `/gfx` and copies it into the game's
  build (`isometrica/vite.mjs`). After changing a generator while a dev
  server runs, run it again.
- While nothing it draws is waiting to be painted, the worker paints ahead
  what the camera will want once it turns (`client/preloader.js`): for
  what is on screen - what the canvas cache drew in the last frames - the
  same things from the sides of the world next to the one the camera is
  on, then from the side across, then the cars' other headings, a couple
  at a time. Which picture is which side's is in its name (`r0`-`r3`, the
  corner and road codes turned round, a car's heading). They are kept
  apart from what is drawn (`Generator#ahead`, up to `STASH` pixels) and
  handed over when first wanted; those for what has gone off screen are
  let go of, for room for what is on it.
- The stones strewn over the land are painted too
  (`isometrica/src/shared/gen/stones.js`): a few rounded boulders to a tile -
  grey ones together in the thick of a rock field, brownish ones strewn
  about its edges - each lit by the buildings' sun in four flat tones, its
  top the lightest, with a short shadow on the ground.
- So is the smoke (`isometrica/src/shared/gen/smoke.js`): a puff in six sizes,
  white out of a chimney, black out of a car's engine - bigger, and coming
  out three or more times as often, rising twice as fast. A puff grows
  through them as it rises - slower and slower - drifts off the way the
  wind blows, the higher the more, and fades in as it comes out and away as
  it thins (`isometrica/src/client/components/smokeScript.js`). A chimney
  smokes only while there is a fire going in the house, which is most
  houses of a morning and an evening and few round the middle of the day
  and in the small hours, each making up its mind every few minutes - one
  thin wisp at a time (`smokesource.js`). However thin it is, it is not
  blended over what is behind it but dithered, the way the lamps' light is:
  each pixel of it there or not, by where it falls in a 4x4 pattern laid
  from the world's origin (`isometrica/src/client/glview.js`, a sprite
  renderer's `dither`). It is lit where it is, up in the air - by the sun,
  and at night by a lamp near it - not as the ground it is drawn over (a
  sprite renderer's `over`, how high over the ground it is).
- One wind blows over the whole city (`isometrica/src/client/wind.js`), all
  the smoke there is going with it at once: which way it comes from wanders
  round over a few minutes, and how hard it blows rises and falls over a
  minute or so, with gusts every few seconds - from near calm, the smoke
  going straight up, to a gale that bends it over low. The weather has it
  blow softer or harder: hardly a breath in a fog, a little on a clear day,
  a gale in a storm (`Wind.factor`).
- What is on screen is drawn from a few big canvas pages
  (`isometrica/src/client/canvascache.js`), not from the sheets: a sprite is copied
  there the first time it is drawn, and whatever has gone undrawn longest
  makes room when the pages are full. Something made of several pictures,
  like a shore tile, is put together there once
  (`sprites.getComposite([...])`); something that changes every frame, like
  a police car's lamp, is drawn over it as a sprite of its own.
- Housing and commerce each come in three tiers, and every tier on every
  footprint: 2x1 and 3x1 along the street, 1x2 and 1x3 end on to it, and
  2x2, 2x3 and 3x2 - the first number along the street, the second back from
  it - each with designs and options of its own, so no two need be alike.
  Housing: the village (cottages, farms, a croft - needing only to stand
  next to the village, and no water), town houses (bungalows, two-storey and terraced houses,
  semi-detached pairs) and then either villas - few people on a lot of
  land, paying a lot - or blocks of flats, a lot of people on little land.
  Commerce: small shops, stores (supermarkets, superstores, department
  stores, a shopping centre) and then either farmers' markets or office
  blocks. The catalogue keeps each tier together, its footprint on every
  card (`isometrica/src/data/houses.js`, `shops.js`, `flats.js`, `offices.js`).
  Everything has to stand with the city (`core/city/cityroads` linked); the
  houses in town, the shops and offices and the town hall want a cobbled
  street at least right alongside them as well - asphalt will do - and say
  "no road (cobble)" over them till they have one (`core/roadrules` serves,
  `core/city/cityroads` reaches); the village, its old town, the church, a
  square, a park, a water tower and a pump station want no road at all. What a building of a tier holds or employs,
  makes and costs goes by how many tiles it covers and nothing else - a
  footprint and the same one turned are the same building laid out another
  way - and the more tiles, the more of it on each, for a little more:
  cottages on 2x1 and a farmstead on 1x2 are five homes for $4,500 each, a
  croft on 3x1 or 1x3 eight for $8,000, a farm on 3x2 or 2x3 seventeen for
  $20,000 (the tables in each of those files).
  What is no longer offered - the village house on 1x1, the hamlet on 3x1,
  the villas on one row of tiles, and the blocks, stores and shops a tower or a shop on the
  street with yards or car parks beside it took the place of - is kept,
  hidden, for the cities that have it, marked `deprecated` (and
  `replacedBy` what took its place), till the saves are rid of it.
- Blocks of flats and offices are put together out of parts the game
  paints - ground storey, upper storeys, roof, yard - in a style each
  (`isometrica/src/shared/gen/flats.js`, `offices.js`) on what all blocks share
  (`isometrica/src/shared/gen/blocks.js`). Each block picks its colours and details at
  random when it is first drawn and keeps the parts it is made of in the
  save (`isometrica/src/client/compoundbuilding.js`); the catalogue shows one of
  each kind (`isometrica/src/data/flats.js`, `offices.js`). A wall can be three
  sections long, the one in the middle neither end of it, with a row or two
  of yard in front - a car park, a playground, a plaza. On 2x1 and 3x1 the
  block is a tower of one section on the street, the rest of the row yards
  beside it, either side.
- Shops are painted the same way (`isometrica/src/shared/gen/shops.js`), but one
  catalogue entry per tier and footprint (`isometrica/src/data/shops.js`) stands for
  several designs: a 1x1 corner shop (flat, gable or shed roof, a firm's
  striped awning or none, fascia or side board), a 1x2 shop with a car park,
  parades of corner shops and rows of shops with car parks on the other
  footprints, and on 3x1 a corner shop or a firm's beside its car parks; a
  2x2 superstore, a department store on one tile beside its car park on
  2x1, superstores along the street or behind a
  car park three tiles long, department stores of two floors with a glass
  lantern on the roof, and a 2x3 shopping centre or covered market, the big
  ones with a pole sign; and farmers' markets - stalls under striped
  canopies on a cobbled square, in rows or round a fountain, a timber roof
  on posts over the stalls, or a glass market hall behind them, a farm's
  trailer of hay and pumpkins come in. Which design, colours and details a
  shop gets is picked when it is placed, so the ghost already shows what
  will be built. Car parks - the shops' and the blocks' - are filled with
  cars from the vehicle generator, different for every building.
- Houses are painted the same way (`isometrica/src/shared/gen/houses.js`), one
  catalogue entry per kind and footprint (`isometrica/src/data/houses.js`): village
  houses that need only to stand next to the village and no water - a cottage with hens, a cow, an
  orchard or a well, a farmstead on 1x2 with a barn, a field or sheep, a
  croft on 1x3 - and on 3x1 along the street, its house at one end facing a
  lane up the side - hamlets of cottages or farmsteads side by side, a longhouse
  with its byre along the street, a farm round its yard with a barn and a
  paddock; town houses with hedges or picket fences - a bungalow with its
  garage on 2x1 (and set back on 2x2, 2x3 and 3x2, a car on the drive and a
  back garden), a bungalow end on to the street with a carport on 1x2 and
  1x3, a two-storey house end on to the street on 1x2 and 1x3, terraced
  houses along the street on 2x1, 3x1 and 3x2; semi-detached houses on
  2x2, and on 2x3 end on to the street with a back garden behind each
  half, each half with its own parking space and gate; and villas on 2x2,
  2x3, 3x2 and 3x3 behind a gate in a high hedge or a wall, with a fountain or a
  pool. Houses are
  built to the scale of the cars and roads - a car is about 4.5 m long, so
  a tile is about 10 m across and a storey 12 high - and what does not fit
  a footprint is left to a bigger one: the bungalow has a drive to its
  garage but no room to park on it; the two-storey houses on two and three
  tiles take the whole width of their plot, the car on a hard standing in
  the front garden, and keep their back gardens to themselves, out of their
  back doors. Smoke rises from the chimneys of houses lived in, when a
  fire is going in them. Whatever of a house stands in front of the cars on its
  drive is drawn again over them, so a car behind a hedge stays behind it
  whichever way the house is turned - and the front of a building site's
  fence over its digger and lorry the same way.
- The water tower is painted too (`isometrica/src/shared/gen/utilities.js`), in one
  of four European designs picked when it is placed: a concrete bowl on a
  shaft banded red and white, a slim steel tank on a steel column with a
  ladder up it, a square shaft of precast panels with three lens-shaped
  tanks stacked up its side, or a brick shaft with a wider tank of steel
  sheet on it. Each has a colour of its own and a band of blue round its
  tank; whatever is round is laid out in columns a unit across, so it keeps
  to the pixels like everything else. The pump station on 2x2 waters three times as far as a tower,
  at four times its upkeep: a Victorian brick engine house with its
  chimney stack and settling tank, a pump hall with two steel tanks, or a
  reservoir under a grassed mound with its valve house.
- Parks are painted too (`isometrica/src/shared/gen/parks.js`), one catalogue entry
  per footprint (`isometrica/src/data/parks.js`) - 1x1, 1x2, 1x3, 2x2, 2x3 and 3x3 - each
  laid out as one of three kinds picked when it is placed: a sports park of
  courts and a skate spot (basketball, half a court on one tile, tennis on
  three, ramps, a box and a rail) inside a wire fence; a formal garden on a
  pattern of paved walks, a fountain where they cross and beds edged with
  box, of flowers or lawn with small trees; or a town park of gravel walks
  winding between trees, benches, bins and lamps, with a big fountain or a
  pond on the bigger footprints. The central park on 3x3 has no courts - it
  is one park all through: the garden, the town park, or a wood of trees
  and pines on mossy ground, a walk looping round it and a clearing in the
  middle with picnic tables or a pond. Its lamps, and the floodlights at two
  corners of every court and skate spot, come on with the street lights
  and light the ground round them the way a street light does
  (`client/buildingview.js` lightsOf "park"). A park needs no road or water
  and earns nothing; the town pays its upkeep.
- The town's own buildings are painted too (`isometrica/src/shared/gen/civic.js`,
  `isometrica/src/data/civic.js`): a church on 1x2, end on to the street,
  whitewashed or of dark red brick, its tower at the front half as high
  again as the old town's, in a churchyard - its bell rung now and then by
  day while it is on screen, as the old town's church's is
  (`client/audio/soundman.js`); a town hall end on to the street on 1x2, or
  along it on 2x1 - white with a portico and a dome like a capitol, cream
  with a portico and a clock tower, clapboard with a porch and a bell
  cupola, or brick with the clock in its gable - behind a forecourt with
  its flag; and a square on 1x1 to fill a gap between roads where a park
  would be wasted: slabs or cobbles, benches, trees in tubs and lamps, and
  an advertising column, a street food stand or an ice cream cart in the
  middle, or nothing - or bare paving and nothing else at all. Like a park
  they earn nothing; the church and the town hall have people working in
  them.
- The old town (`isometrica/src/shared/gen/oldtown.js`, `isometrica/src/data/oldtown.js`) is the
  commerce a village starts with, next to its cottages: it needs no water
  and no street, and makes its money with the cottagers working in it. On 1x2 and
  1x3 a lane of craftsmen's houses - narrow, tall, their steep gables to
  the lane, half-timbered or rendered in ochre, rose, sky blue, sage or
  stone, the smith's, baker's, cooper's, potter's and weaver's signs
  hanging out over it and their wares out in front - or a yard with a
  smithy; on 2x2 a market square or a church in its churchyard; on 2x3 a
  square before a church or a street of craftsmen; on 3x3 all of it, with a
  guild hall and a fountain. All of it cobbled, nothing tall near its edges:
  two side by side are one town, a lane between them. Later on the town
  keeps it as its old town. It goes up the way it would have then: a
  masons' yard inside a timber rail - dressed stone and a banker, oak and a
  saw-horse, an ox cart come in with stone, the lime pit, a treadwheel crane
  - then footings of rubble, then oak frames on stone ground floors in
    scaffolding of poles.
- A wall goes round the old town (`isometrica/src/client/compoundbuilding.js`
  walled): along every edge of it with no old town beyond - so round all of
  it, however many pieces it was put down in, and never round the cottages
  - with a tower wherever two stretches meet, a gatehouse where a road
    comes up to it and in the middle of each piece's front. It is worked out
    as the town is drawn, and drawn again as anything goes up or comes down
    next to it.
- A tap on nothing - bare ground, a tree, the sea - while nothing is being
  looked at puts away the words over the world ("no jobs", how far along
  one going up is, the city's name) and the grid over the ground: the town on its own, for a picture of it. They stay away while the camera is dragged, zoomed or turned, and come
  back with the next tap on nothing - or with anything else: a tap on a
  building, placing or shaping the ground, a press on any button.
- A few firms turn up all over town (`isometrica/src/shared/gen/brands.js`): bolt the
  builders' merchant, orchard the grocer, pillar the bank, blaze the burger
  bar and amber the brewery. Each has its colours and an emblem - hazard
  stripes; stripes leaning forward and a round fruit; three columns; a bun;
  the sun going down over the sea - on the small shops' fascias, boards and
  awnings, the stores and superstores, the pole signs in their car parks,
  the billboards on the offices and the sides of delivery trucks and vans.
  Nothing anywhere has letters on it: at a pixel or two high they read as
  noise.
- Roads are painted too (`isometrica/src/shared/gen/roads.js`): a piece for every way
  a tile joins up with its neighbours and a ramp for every slope, each
  plain - asphalt with a dashed line and gravel edges - or paved, with
  kerbs, pavements and zebra crossings over junctions, and street lights
  along it. A cobbled road is paved the same way, with pavements of stone
  flags and, for street lights, lanterns on old cast-iron posts; a gravel
  lane never is. A light stands on every other tile, on the pavement of one
  side of the road in the world - so it stays where it is as the camera
  turns round - and on a bend or a junction in the corner between two
  joining roads, its arm reaching out over one of them. It is painted for
  each side and each corner and arm the way they are seen, and
  `isometrica/src/client/roadview.js` picks the one for the camera as it
  is. A road is paved where it is part of the city's road network
  and has a building next to it (`isometrica/src/client/roadman.js` paved); out in
  the country, or on a stretch that does not join the network, it stays
  plain, and it changes back and forth as buildings go up and come down.
- The ground is painted from nothing (`isometrica/src/shared/gen/terrain.js`): grass
  with lusher clumps, drier patches, blades, clover and the odd flower;
  water with its swell and ripples catching the light - the shallows along
  the shore and deep water further out, alike but for their blues, deep
  water spilling over the edges of the shallows next to it in a ragged,
  dithered contour (the terrain generator's diffuse tiles);
  and every tile's outline is its corners joined up, lit by the same sun as
  the buildings. The grid is not painted into the tiles but laid over them,
  see-through black round every tile, as the tiles drawn by hand had it. A
  shore tile has the water come a little way up it, then wet sand, sand and
  the grass, each line ragged with a grain of pixels along it the way deep
  water's edge over the shallows is - by how high the ground is, so a shore
  runs on unbroken from tile to tile.
- A building goes up on uneven ground the way it did in Transport Tycoon:
  level at the highest corner under it, on a concrete base cut to the
  ground (`isometrica/src/shared/gen/foundations.js`, `BuildingView` addFoundations) -
  as long as the ground falls no more than a step anywhere under it
  (`isometrica/src/core/buildings.js`). The base is picked as the tile is seen, so it
  turns with the camera. On the shore, where the water is painted a little
  way up the ground and so looks higher, the base is the same, marked where
  the water stands against it: wet and darker below that waterline, a line
  of weed along it and a tide mark above. A road on the shore is always
  levelled at the top on such a base - never laid on the sand as it is.
- Every building and every road stands on a surface of its own
  (`isometrica/src/core/surface.js`): how high it is at each corner of a tile, kept
  with it in the save. A building's is flat over every tile it stands on,
  at the highest corner under it as it goes up; a road's is its tile's,
  flat or a ramp - one side a step over the side across from it. Wherever a
  surface is over the ground it stands on concrete, a step deep at most and
  never under the ground (`isometrica/src/client/buildingview.js` addFoundations,
  `roadview.js` addBase, `isometrica/src/shared/gen/foundations.js`), so a road is
  levelled across a slope, climbs a step on a wedge, or ramps up from flat
  ground, and a building stands level on a slope. Never in the water; on
  the shore flat only, the concrete going down into the water. Two roads
  join, and cars drive from one to the other, only where they meet level,
  at the same height all along the edge between them - never over a step,
  nor onto the side of a ramp. A road up on concrete is drawn among the
  buildings rather than under all of them (`roadview.js` SINK), so the edge
  of a ramp stays over the yard of a house lower down behind it.
- A road takes a while to lay (`isometrica/src/data/buildings.js`
  constructionTime), in two stages: the earth dug out over the first half,
  then a bed of crushed stone rolled in (`isometrica/src/shared/gen/roads.js`
  works, the "dug" and "bed" pieces). Nothing drives on it, and it is no part
  of the city's network (`isometrica/src/core/city/cityroads.js`), till it is
  finished (`roadman.js` keeps the roads being laid apart from the ones the
  traffic drives on). Each stretch being laid that hangs together is closed
  off with barriers - striped boards on legs, an amber lamp blinking on each
  end - where it meets a finished road and across its ends (`roadview.js`
  barriersOf). A crew works along the whole of it
  (`isometrica/src/client/roadworks.js`): the excavator from one end to the
  other, stopping on every tile to turn and dig, a lorry a tile behind it;
  then back the other way, the lorry ahead tipping stone, the excavator
  behind it spreading it - a crew to every six tiles or so of a long stretch.
  Where they are is worked out from how far along the road is, so it is the
  same after a reload.
- Ground cleared (`isometrica/src/client/clearworks.js`) is gone from the
  world as soon as it is paid for, but what stood on it - the trees and
  stones the world put there, a tree somebody planted - stays standing
  (`envman.js`, `buildman.js` hold) till a bulldozer gets there
  (`isometrica/src/shared/gen/vehicles.js` bulldozer): as its blade reaches
  it, it goes down in a cloud of dust (`isometrica/src/shared/gen/smoke.js`
  dust), and the tile is left bare earth. The tiles cleared that hang
  together are swept as one, a row at a time along the longer way, a
  bulldozer to every six tiles or so, each backing up and pushing on over
  every tile it gets to; ground cleared next to ground still being cleared
  is shared out afresh among the bulldozers already at it. A tree standing
  tall does not just go: as the bulldozer comes up to it, the pictures of it
  going over are painted (`isometrica/src/shared/gen/trees.js` FALLS -
  `gen/trees/oak-1/r1/x+/1` a third of the way over, `/2` two thirds,
  `/3` lying, the same tree from the same side, tipped over about its foot
  the way it is seen to fall, nothing of it under the ground); then it
  shudders as the blade bites, goes over the way the bulldozer pushes it -
  slowly, then faster - hits the ground in a puff of dust along it, lies
  there a moment and is gone, dithered away
  (`isometrica/src/client/felling.js`). A stump, the wood lying about, a
  stone just goes. A road stays too (`buildman.js` hold), and the roads
  joining it go on joining it (`roadman.js` seenRoad), till the bulldozer
  has driven over it and broken it up into the bare earth. None of it is
  kept - after a reload the ground is bare.
- What clearing ground came to floats up once, over all of the ground
  picked - not over every tile of it.
- A building cleared away is cleared whole, every tile of it, whichever was
  picked (`isometrica/src/core/city.js` clearTile), and is paid for by the
  tile. It stands till a bulldozer comes up to a tile of it
  (`isometrica/src/client/clearworks.js` hold, knock): then that tile of it
  comes down (`isometrica/src/client/demolition.js`), the bulldozer waiting
  a moment off it. Its picture is taken apart into its floors - the parts it
  was put together out of (`client/compoundbuilding.js`), or for a picture
  painted whole, bands of it a storey high cut out of it
  (`client/spritecache.js` getComposite clip), its foot staying on the
  ground. It shakes; a floor some way up gives, and what is over it drops
  onto the floor under it, which gives in turn - and so on down, every floor
  crushed, the ones that fell crushed onto its foot in the end; nothing of
  it goes into the ground. A floor crushed bursts into pieces of its own
  picture, flung out and up, that fall round it, bounce and lie a while; and
  goes, dithered away, in a puff of grey dust
  (`isometrica/src/shared/gen/smoke.js` debris) that rolls out over the heap
  of rubble it leaves (`isometrica/src/shared/gen/stones.js` rubble: a mound
  of grit, slabs of concrete, brick and timber on it) - pushed away by the
  bulldozer then.
- Till a bulldozer has been over a tile it is being cleared still
  (`isometrica/src/core/terrain.js` beingCleared): nothing is built on it,
  no road laid, nor the ground moved under it - "being cleared".
- The earth a tile was cleared down to, or moved by raising or lowering it,
  lies bare for a while of the game's time - half a day in all
  (`isometrica/src/core/terrain.js` REGROWS, bareFor - kept in the save),
  its edge churned up over the grass round it
  (`isometrica/src/shared/gen/terrain.js` earth); then the grass comes up
  through it, spilling in from the grass round it (earth_regrowing), a tile
  at a time, and it is grass again (`isometrica/src/client/terrain.js`
  groundOf, Regrowth).
- The signs of a town's limits can stand by a road
  (`isometrica/src/shared/gen/roads.js` townSign, `gen/roads/limit/in0`-`3`
  and `out0`-`3`): at one side of its tile, a pair of them, each on a post
  of grey steel on the verge, its plate across the way the road goes - the
  size of a bus stop's sign, no words on it, grey at its back. The way in
  stands on the right of whoever comes in over that side - the traffic keeps
  to the right - facing them: the town's houses in black on a white plate, a
  church's spire among them. The way out stands on the other verge, facing
  whoever leaves, the houses struck through red. A game says which roads
  have them, and on which side (its play's `townSignsOn`,
  `client/roadview.js` townSignsOf) - out of what it last worked out, never
  working anything out then, as a road asks while it is drawn, and while the
  pictures of another side are looked out (`client/preloader.js`); the
  city-sim puts them up where a road crosses its city's border.
- A run of road the player drags is laid all at once (Road.plan): each new
  tile gets the surface that has the run join up the most - with itself,
  and with the roads already there, which stay as they are, joining those
  the run is dragged over counting double - and, as far as that goes, takes
  the least concrete. So a run across a slope is levelled along it, one up
  a slope ramps up it, one dragged onto a levelled road climbs up to it, and
  a road on its own follows the ground. The same run always comes out the
  same, so the preview is what gets built.
- Land can be raised and lowered under buildings and roads, the way
  OpenTTD shapes land under its foundations (`isometrica/src/core/city.js` terraform):
  whatever stands there stays where its surface still fits the ground as it
  will be, the concrete under it taking up the difference - ground raised
  to the top of a base replaces it, ground taken down from under one leaves
  it on concrete, a whole step over flat ground if need be. Anything whose
  surface would not fit - under the ground, more than a step over it, in the
  water, or a ramp on the shore - is still in the way.
- The trees are painted too (`isometrica/src/shared/gen/trees.js`), as pixel art: each
  kind's own shape - oak, beech, ash and alder, two of each - filled in with
  three flat greens and lit by the buildings' sun, every tone in patches
  rather than speckled - each painted from its four sides, so turning the
  camera shows another side of it, and a tree stands whichever way round
  its tile has it. The world grows each kind in stands
  (`isometrica/src/core/ambient.js`).
- A town is founded with whatever goes up first - anything there is to
  build, its first house as often as not: the player puts it down, names the
  city, and it goes up out of what the city starts with
  (`City.quoteFounding`, `client/buildman.js` found). Before then, a roll of
  the dice takes the camera off to somewhere else a town could go up, with
  room for a town hall, about where it first was rolled
  (`client/cityman.js` roll). It puts up a town hall
  when it has grown into a town, and has no borders: all the land there is,
  is the city's (`Construction#getCity`), and anything can go up anywhere.
- Every building of a city has an area round it,
  within two tiles of each of its tiles, rounded - along a row or a column
  two tiles out and one to either side of those, corner to corner one, five
  across with its corners cut (`isometrica/src/core/city/cityroads.js`
  RADIUS, AREA) - and where two areas share a tile they hang together
  (REACH, worked out from AREA): three tiles
  between two buildings along a row, and they do; four, and their areas only
  touch (REACH). A road has no area of its own: only where it joins
  buildings to each other - where a way along it, its tiles side by side,
  never over the same tile twice, goes from inside one building's area to
  inside another's, both branches where two go from one village to another -
  has it one, a tile of it as a building's (`prune`, by the blocks of a
  graph of the roads and the buildings whose areas they are in,
  `ringsWith`); out in the country, outside every building's area, a road is
  the city's only where it is the shortest way from one village - buildings
  that hang together by their areas alone - to another (`country`), so a
  loop on the road between two villages is a way round and not the city's;
  a road that leads nowhere is just a road, abandoned - a tile of it on its
  own, a loop that only leads back to where it left - and a lane off into
  the country is the city's only to the edge of a house's area, the city's
  area going on two tiles along it from there. It holds
  together once it is finished - a house going up, a road being laid, not
  yet. A village holds together by its houses, and a road is the cheap way
  to reach out to what stands further off. Of the parts that hang together, the
  city is the one its town hall stands in, if one does, otherwise the bigger -
  its road tiles and the ground its buildings stand on - then the one more
  people live in, then the one with the oldest building (`CityRoads#detached`
  the rest). Its roads that are part of it are the road network. It is
  worked out again whenever something goes up, comes down or is finished,
  and nothing of it is saved - and for what would hang together with
  something more put down, without putting it down (`CityRoads#plan`).
  Everything of the
  city wants to be part of it, a water tower as much as a house; what is not
  is cut off - abandoned: it costs and earns the city nothing, waters
  nothing, and "cut off" hangs over it. A road a building wants has to be
  right alongside it, no tile between. The city-sim draws a border round the
  city's area (`city-sim/src/client/cityborder.js`), and while something is
  being put down the border as it would be with it - the builder tells the
  game played what is being put down where (its play's `placing`,
  `client/buildman.js`), and
  what is looked at (its play's `inspecting`, `client/serviceman.js`) - the
  area of what it stands apart with; the world itself has none. A line round tiles is drawn whenever any of it is on
  screen (`client/components/tileareaborderrenderer.js`). Its name hangs over
  its town hall, or the middle of what is part of it (`City#center`).
- People live in houses, each keeping how many live in it, in the save by
  the tile it stands on (`isometrica/src/core/city/citypopulation.js`); a
  save of before, with a head count only, has them put up oldest house
  first. The city grows into the room its houses have - their beds, as
  long as they have what they need, and for houses whose people work in
  town as many as there are jobs - oldest first, more a tick the more room
  there is; whoever is in a house with less room than people moves out, one
  a tick out of the city and one out of each part cut off from it, and is
  gone. A part cut off and joined up again is the city's once more, with
  whoever is still there.
- A game can have its city go on while it is away (`Logic` catchUp, city-sim
  only): opened again, or back in sight, the world plays out the ticks it
  missed at once - as many as seconds went by, a game day's at most - by the
  shorter of the browser's clock and the server's, where the city is kept
  on one (`CitySync#awayFor`), and the city-sim floats what it made over
  it.
- The backs of buildings are not left bare (`isometrica/src/shared/gen/blocks.js`
  backs): a shop has a steel door out to its bins - and a skip, behind a
  big one - the air conditioning's units on the wall, rain streaks, the odd
  tag sprayed on it and a wire fence round its service yard; blocks of
  flats have their bins out at the back and units on their end walls.
- While a selection is dragged about, the buildings in it keep the looks
  they were shown with; only a selection of another size picks again.
- Every building goes up on a building site - the same parts for all of
  them (`isometrica/src/shared/gen/sites.js`): bare earth, and on each tile one of an
  excavator, a lorry, a heap of sand, the site office or a tower crane,
  dealt out for each building (`isometrica/src/shared/gen/stacking.js`), and a blue
  tarp fence round it all. A small building's site - a park, a cottage or
  farm of the village, a house or shop on one tile - has no crane and a low
  timber rail round it instead (`client/compoundbuilding.js` smallSite). A
  block of
  flats or offices then grows its own structure from a quarter of the way,
  and its lower storeys finish under it from halfway; the crane, stacked
  out of steel lattice mast sections, grows with it. The excavator drives, stops and turns
  to dig, and the crane's jib swings to and fro
  (`isometrica/src/client/siterenderer.js`) - each way it points drawn with
  the crane under it, one picture, so that it stands as high as the crane is
  and throws its shadow from there (`client/compoundbuilding.js` jibFrame) -
  as far out as it is high, standing clear of the ground (`client/cachedsprite.js`
  footOf, `client/glview.js` shadowed);
  the lorry and the excavator are the
  vehicle generator's, and the excavator never drives the streets.
- What works has its lights on (`isometrica/src/client/worklights.js`): the
  excavators and lorries on building sites and road works an amber beacon
  blinking on the cab, and after dark their work lamps shining ahead; a
  building site a floodlight on a mast by its office and by its heap of
  sand; a tower crane a red light blinking on its peak and a floodlight
  under its cab, high over the site. Each is a pixel or two glowing whatever
  the light, hidden behind whatever stands in front of it, and at night it
  lights what is round it (`lighting.js` workLight).
- Any building can be turned four ways (`isometrica/src/core/rotation.js`). Blocks are
  painted from all four sides.
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
- The city a new player starts on (`isometrica/src/data/initialcity.js`) is built
  entirely of generated buildings - houses, blocks of flats with their
  yards, office blocks, shops and superstores - each turned to face the
  street it stands on.
- The game's clock moves on every second (`isometrica/src/core/vtime.js`): five minutes
  in the city builder, a day going by in under five minutes, and a minute in
  the delivery game, a day going by in 24.
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
- Whatever is painted out of boxes - buildings, roads, vehicles - keeps to
  the pixels the way a picture drawn by hand does (`isometrica/src/shared/gen/isobox.js`
  snap): every box is snapped to whole units before it is painted, so an
  edge along the ground is a clean step of two pixels across for one down
  and a stripe a unit wide a line a pixel thick, never one that is two
  pixels thick here, one there and broken into dots elsewhere. What is
  thinner than half a unit - a road marking, a pane of glass - is laid flat
  on what it is on; a pole or a rail is made a unit thick. Roofs and ramps
  are planes the boxes are cut by, not staircases of thin strips, and roofs
  are pitched half a unit up for one across, so their gable ends come out
  clean diagonals.
- Surfaces are made of something rather than speckled at random
  (`isobox.js` MATERIALS), laid out a pixel at a time and lined up with the
  tiles and storeys: brick courses, stone, siding and logs on the houses,
  precast panels on the flats, tiles, slates and thatch on pitched roofs,
  felt on flat ones, steel sheet on the superstores, asphalt, paving slabs,
  gravel, grass, sand and bare earth on the ground. A colour can be made of
  a material wherever it is used (`blocks.js` madeOf).
- To look at what the painting makes without starting the game, run
  `npm run generate:terrain`, `generate:vehicles`, `generate:stones` (the
  stones and the smoke) or `generate:buildings`. They run the same code the
  game does and write pictures to `isometrica/assets/terrain/terraingen` and
  `isometrica/assets/previews` (not committed).

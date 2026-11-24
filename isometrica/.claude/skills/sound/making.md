# Making the sounds and the music

After Andy Farnell's Designing Sound: look at what makes a sound - what
moves, what it moves through, how far it carries - and build a small model of
that, not a copy of a recording; a model is a few dozen lines, a knob turned
makes a variation. The pieces are every synthesis book's (Curtis Roads' The
Computer Music Tutorial).

## The cartoon ones (`shared/gen/sounds.js`)

A little toony on purpose, like the pixels:

- `thunder` - overhead, near, far off, a double strike: the crack (many short
  N-shaped waves from along the bolt), then the sky burping (trains of low
  pulses slowing under rumbling noise, later and softer from further along),
  the long roll under them.
- `horn` - beep, beep-beep, a little car's meep-meep, a bus's honk: two notes
  a third apart, squarish, through the horn's ring, each bending up into tune,
  a slap back off the buildings.
- `siren` - wail, yelp, two-tone nee-naw through a loudspeaker horn; loops,
  its pitch tuned so a whole number of cycles goes into every turn.
- `forest` - birdsong, and a breezier one: gusts, leaves rustling, chirps,
  trills, a two-note whistle, a warble, near and far.
- `sea` - calm, and rough with gulls: a swell rising, the break, the wash
  fizzing back, over the surf further out.
- `city` - day and night: traffic's roar coming and going, cars whooshing
  by, a hum, now and then a horn; quieter at night.
- `gulls` - crying and laughing: a breeze off the sea, the herring gull's
  long call.

## The real ones

- `skyline` (`skyline.js`) - day, rush hour, night: a real city heard from
  high above (the way Pizza Tycoon's city map hummed). The roar of the whole
  town an octave at a time, each wandering, falling off above 250 Hz, the top
  soaked up by the air; cars, lorries and buses rising out of it over seconds
  and sinking back (tyres, cylinders firing, a bus through its gears, its
  brakes hissing); real horns (a diaphragm through a trumpet, tapped, leaned
  on, answering each other in jams), each back off the buildings; the wind up
  there; all in the long ring of the streets (an eight-line FDN). 36-second
  loops, two to six seconds each to make.
- `woods` and `offshore` (`country.js`) - the country from above, as real as
  the skyline: the air and the leaves soft and smooth, rising and falling,
  no tone or grain; what stands out far off, duller the further, ringing
  round about (`dsp.js` ring). `woods` by day: a breath in the treetops,
  leaves fluttering, and birds each its own song from where it sits, over and
  over - chaffinch, great tit (tea-cher), blackbird, robin, wren, wood pigeon,
  a woodpecker drumming - each a pure whistle sweeping fast (the syrinx).
  By night crickets near and far on their own beats and a tawny owl.
  `offshore`: a breeze and a gale over the sea, no waves (the sea on screen
  is calm). 36-second loops, one to three seconds each to make.
- `bells` (`bells.js`) - the old town's small church: one small bell, rung
  for a service (swung, a stroke about a second, coming up and dying down)
  or tolled (a few slow strokes). Its partials as founders name them - hum
  (faint), prime, tierce, quint, nominal and up - each two close together
  beating (its warble), soon quiet, a little ringing off the houses. Not a
  loop: played now and then.
- `blast` (`blast.js`) - a building blown up heard a hundred or two metres
  back, from above: the crack (a cluster of sharp fronts milliseconds apart,
  clipping - a snap, not a sonic boom), the fireball's roar (turbulent,
  crackling, its top closing as it cools), the building breaking (crunching
  grit, then a deep rumble of floors coming down), what it throws (gravel,
  glass, a lump landing), and the town round it (early reflections off the
  streets, then the town's ring), the top taken off by the air. Two kinds,
  one picked at random each time: TNT, or a ripple of demolition charges and
  then it going; neither over two seconds. Each knows `at`, when into it the
  building goes up, so the game starts it that long before the pieces fly.

`forest`, `sea`, `city`, `gulls`, `skyline`, `woods`, `offshore` and `siren`
loop; the rest play once.

## The music (`shared/gen/music.js`)

- Slow, light, a little smoky jazz - a New York trio after hours: a Rhodes
  comping, an upright bass, brushes and a ride, and a lead that says a few
  things and leaves room.
- A piece per place - `town` (jazz guitar), `city` (muted trumpet by day, sax
  by night), `outside` (flute by day, vibraphone by night) - by `day` and by
  `night` (slower, darker keys, sparser, strings, a bigger room; the bass in
  two). Each three ways for the weather: `clear`; `rain` (lazy: half the
  notes, held, laid back, the bass on the roots, a slow brush swirl, dulled,
  tape wobble and record crackle; quieter); `storm` (picked up: the bass
  walking hard with dead notes, a busy ride, crashes and a tom fill every
  eight bars, Rhodes stabbing the offbeats, strings shivering, fills between
  phrases; louder).
- After the books: a standard's harmony (ii-V-Is, turnarounds, a backdoor
  cadence, modal pieces for the open country) in 32-bar AABA; the Rhodes in
  rootless voicings (3rd, 7th, 9th, 13th) moving as little as they can,
  comping on the Charleston and off the beat (Levine, The Jazz Piano Book);
  the bass walking - root on the downbeat, chord tones and steps, a half step
  into the next root (Friedland, Building Walking Bass Lines); the melody a
  motif stated, answered, restated over new chords and brought home on a long
  note, landing on chord tones on the strong beats (Levine, The Jazz Theory
  Book; Nierhaus, Algorithmic Composition).
- The instruments: the Rhodes Chowning's FM with the click of its tine; bass
  and guitar Karplus-Strong plucked strings; horns saws through formants; the
  vibraphone inharmonic bars and a motor's tremolo; the cymbals six square
  waves at odd ratios, as the old drum machines made theirs.

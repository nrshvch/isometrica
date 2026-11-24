---
name: sound
description: How isometrica's sounds and music are made from numbers (shared/gen sounds, music, dsp, skyline, country, bells, blast) and played in the game (client/audio - soundman, maker workers, music by place, time and weather, places, the town's hum, church bells, horns, thunder, blasts, waking audio on iOS). Load before changing shared/gen sound files, client/audio, the sounds or music lab pages, or tools/gensounds and genmusic.
---

# Sound

Sounds and music are made the way the pictures are: worked out a sample at a
time from a few plain ingredients - noise, simple waves, filters, envelopes,
a little reverb - never recorded. The same name makes the same sound every
time. Everything comes out as plain numbers, -1..1, a Float32Array per
channel, for Web Audio's `createBuffer`.

## Where

`isometrica/src/` unless a path says otherwise:

- `shared/gen/dsp.js` - the pieces: seeded chance; white, pink, brown noise;
  one- and two-pole filters (RBJ cookbook); band-limited saw and square
  (polyBLEP); soft clipping; a Schroeder reverb; `ring`, Jot's feedback
  delay network for streets and woods; laying sounds into two ears; seamless
  loops; loudness.
- `shared/gen/sounds.js` - the cartoon ones and the list
  (`generate(name, rate)`, `list()`); `skyline.js` (the city from above),
  `country.js`
  (woods, offshore), `bells.js` (the church), `blast.js` (a building blown
  up) - the real ones, each its own models.
- `shared/gen/music.js` - the jazz (`generate("town/night/rain", rate)`,
  `list()`: eighteen pieces with tempo, bars and length).
- `client/audio/` - `soundman.js` (what plays when; QUIET; Soundman#toggle,
  #painted), `maker.js` + `audio.worker.js` (made in two workers, kept),
  `music.js` (the piece for the place, time and weather), `wake.js` (the one
  AudioContext, woken in a tap).
- Lab: `lab/sounds.html` (`Sounds.jsx`), `lab/music.html` (`Music.jsx`,
  `player.js`, `worker.js`).
- Tools: `tools/gensounds.js`, `tools/genmusic.js`.

## Must hold

- Deterministic: a name always makes the same samples.
- Loops loop without a seam: what goes on all the time is made longer than
  the loop and its end faded into its start; what happens now and then is
  laid in round the loop.
- The three weathers of a piece are the same tune, tempo and length, sample
  for sample, so they can play together and be faded between mid-phrase.
- Pictures first: nothing is made - not even the workers started - while the
  pictures on screen are still being painted (`Soundman#painted`, maker
  `clear`, `pump`).
- Nothing plays before the page is touched, clicked or typed at.

## Testing

- `npm run generate:sounds` - `tools/gensounds.js [outDir] [rate] [name...]`
  writes `<sound>-<way>.wav` (16-bit stereo) to `assets/previews/sounds`;
  `"thunder/2"` or `"thunder"` for only those.
- `npm run generate:music` - `tools/genmusic.js [outDir] [rate] [name...]`
  writes `<place>-<time>-<weather>.wav` to `assets/previews/music`.
- Lab (`npm run dev -w isometrica`): `/sounds.html` makes and plays them;
  `/music.html` plays a piece the way a game would - its three weathers
  together, the weather buttons fading between them in time. The explosion
  bench plays the blast.
- A 30-second loop takes a second or two to make at 44.1 kHz (half at
  22.05 kHz); a piece of music three to five seconds.

## More

- [making.md](making.md) - every sound and the music, how each is modelled.
- [in-game.md](in-game.md) - what the game plays when, and how it is woken.

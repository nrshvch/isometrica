# Sound in the game

Both games sound the same way (`client/audio/soundman.js`). Every sound is
made in two workers (`audio.worker.js`, `maker.js`) the first time it is
wanted, and kept; what is asked for first is made first, a worker one at a
time (so a piece of music does not keep a horn waiting long). Only once the
pictures on screen are all painted (`Soundman#painted`: the generator painted
some and waits on none) - before that the workers are not even started; one
already being made goes on. A loop made a while after it was wanted fades in
over two seconds.

## What plays

- Music (`audio/music.js`): `city` when the screen is a good part town,
  `town` when there is a little, else `outside`; `day` or `night` by the
  hour; all three weathers playing together, turned up and down by the
  weather (`client/weather`): a storm the storm, rain or a grey sky the lazy
  one. A new place or time must hold six seconds before its piece fades in
  over the old.
- The place: the screen looked over twice a second, a grid of points sorted
  into sea, shore, woods, fields and town. Woods and fields (a little less)
  `woods` - birds by day, crickets and the owl at night; the sea `offshore`,
  a breeze or a gale by the weather; the shore nothing of its own. Each as
  loud as there is of it, louder zoomed in, one into the next by power, so
  panning out of town the hum gives way to the country or the sea, never to
  silence. The town on screen hushes the woods; rain drowns the birds a
  little.
- The church (`bells`): the old town's blocks on screen looked for one by one
  (the grid would miss a small one) - by day, while one with a church is on
  screen (a church, a square before one, an old town centre, by its look;
  and the town's own church, `shared/gen/civic`), its bell now and then: a
  few seconds after a church is first seen, then every minute or so, its time
  going on off screen too (one due meanwhile rings as soon as a church is on
  screen again) - mostly rung for a service, now and then tolled, from where
  the church is across the screen. The old town's lanes have no cars: not
  the busy middle of a town for the hum.
- The hum of the town (`skyline`): full over the busy middle - shops,
  offices, works on screen, and the cars about it; faint, dull and far off
  over the outskirts and quiet streets of houses, or with the town just off
  screen (looked for two and a half screens round); hushed in the woods.
  The day's, the rush hour's and the night's by the hour the city is drawn at
  (`Lighting#shownHour`), one into the next; with the day and night not going
  by, ten in the morning's all the while, as are the places'.
- Thunder: each flash to come is known ahead (`Weather.flashesAhead`, the
  same sums as `Weather.flash`), so its thunder starts a moment before.
- Horns: a car stood in a jam three and a half seconds may honk (and again
  after nine); two cars going by each other now and then toot. A bus or a
  lorry honks, a van meep-meeps, a taxi beep-beeps; each car a little higher
  or lower, panned to where it is on screen, quieter further off.
- A building blown up (`client/explosion`): its blast (`shared/gen/blast`),
  TNT or demolition charges, started `at` seconds early so it comes as the
  pieces fly however fast the game goes (soundman blasts), panned, quieter
  further off and zoomed out.

## For now

Only the hum of the town and the places are heard (QUIET): the music, the
thunder and the horns are kept quiet - the music with no button or key to
turn it on - and police cars make no sound.

## Waking, switching, quiet

- Nothing plays until the page is touched, clicked or typed at: `wake.js`
  makes the one AudioContext (the game's and the lab's) and wakes it in that
  tap, as iPhones and iPads want (a context made or resumed outside a tap
  stays suspended), and plays through the silent switch - the page says it
  plays media (`navigator.audioSession`, Safari 16.4 on), or before that has
  an `<audio>` element looping silence.
- On and off with S or the ♫ in the top bar (`Soundman#toggle`), kept in the
  browser; `?sounds=off` (or `?sound=off`). Quiet while the page is out of
  sight.
- Next to the ♫ in the top bar, ☾ (or N) has the day and night go by (the
  rendering skill), and next to that the zoom step, 1x (0.5) to 5x (2), kept
  while the world turns.

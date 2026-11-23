# Weather, wind, the sea

## Weather (`client/weather.js`)

- Worked out from the game's clock alone: spells of SPELL (eight) hours -
  clear, overcast, fog, rain, storm - picked by a hash of when it is (KINDS,
  ODDS; clear two times in three), each going over into the next over BLEND
  (an hour and a half), following the clock between ticks. Rain comes in
  showers; some mornings of a clear or overcast spell a fog from before dawn
  till mid-morning; the ground stays wet for DRY (three) hours after.
  `Weather.at`: cloud cover, fog, rain, storminess, wetness, and the wind's
  share - for `lighting.js` (weatherSky) and `glview.js` LIT_FS.
- Shown after the time in the top bar. `?weather=clear|cloudy|fog|rain|storm`
  holds one kind; W goes round them and back to the clock's.
- For now there is only a clear sky with a few clouds (WEATHER): no
  overcast, fog, rain or storms, nor `?weather=` or W, nothing in the top
  bar. Lightning is off (LIGHTNING), and the thunder with it.

## Drawn in the lit pass

- Cloud shadows drift with the wind, half as dark as other shadows
  (`glview.js` CLOUD_SHADE), so what stands under one still shows its own.
  Two layers of cloud not far apart (`lighting.js` CLOUDS), the higher a
  little slower, going by the world (`unturned`). A shadow lies as far from
  under its cloud, towards the sun, as heights make it, round with the sun
  through the day, at most a little over twice its height as the sun gets low
  (CLOUD_SLANT); with the wind over a while, not every gust (CLOUD_STEADY);
  a little bigger than its noise (CLOUD_SIZE); changing slowly (CLOUD_CHANGE,
  noise through time - big shapes over a minute and a half, edges quicker).
  As the sky clouds over, more and bigger, closing up till the sun is lost:
  light spread grey, shadows faint, colours duller.
- Fog lies over the ground in banks drifting with the wind; the eye sees
  through as much as lies over what it looks at (the ground deep in it, tall
  tops out of it). Lights glow in it (the lamps' light mipmapped every frame
  for the blur); by day the sun lights it, warm of a morning; thinner round
  the middle of the screen. Rain far off is fog too; in rain lamps glow a
  little.
- Wet: everything darker, roads most; puddles on what is flat and grey
  (road, pavement, car park) where world-origin noise says, more the wetter,
  the sky's grey in them by day; a wet road shines with lamps, their light
  drawn out up it.
- Rain: streaks a pixel wide in two layers slanting with the wind, grey by
  day, at night only where a lamp lights them; drops splash off the road.
- At night the city's lights light the sky and the sky what is under it -
  never quite dark, more so under cloud or fog; out in the woods near black.
- Lightning (off): everything lit a moment, flickering, a jagged bolt from
  the top of the screen.

## Wind (`client/wind.js`)

One wind for the whole city, every puff of smoke going with it at once.
Which way it comes from wanders over a few minutes, how hard rises and falls
over a minute or so, gusts every few seconds - each a few slow waves added
together, so it changes smoothly. By the world's clock (holds while paused).
The weather sets how hard (`Wind.factor`): hardly a breath in fog, a little
when clear, a gale in a storm.

## The sea

Every water tile and the water up every shore is painted in three frames
(`shared/gen/terrain.js` ripples), shown in turn for 440 ms each
(`client/animatedsprite.js`) - Transport Tycoon's water, pixel for pixel.

/**
 * The wind over the city: one for all of it, blowing every puff of smoke
 * there is the same way at once. It never quite settles - which way it comes
 * from wanders round over a few minutes, and how hard it blows rises and
 * falls over a minute or so, with gusts on top every few seconds - each of
 * them a few slow waves added together, so it changes smoothly and never
 * goes round the same way twice soon.
 *
 * Going by the world's clock (engine logic time, ms), so it holds still
 * while the game is paused.
 */

//how hard it blows, world units a second: most of the time, how far that
//swells and falls back, and how hard a gust comes on top
var STEADY = 3,
  SWELL = 2.4,
  GUST = 3,
  //never quite still
  CALM = 0.3;

/**
 * Which way the wind blows and how hard, at `now`: [x, z] along the ground
 * in the world, world units a second.
 *
 * @param now {number} the world's clock, ms
 * @param [out] {number[]} filled in, if given
 */
function Wind(now, out) {
  var a =
      0.7 +
      Math.sin(now / 170000) * 1.6 +
      Math.sin(now / 41000 + 2) * 0.5 +
      Math.sin(now / 9000) * 0.12,
    gust = Math.pow(
      Math.max(0, Math.sin(now / 5300 + Math.sin(now / 23000) * 2)),
      3,
    ),
    s = Math.max(
      CALM,
      STEADY +
        SWELL * Math.sin(now / 61000 + 1) +
        SWELL * 0.4 * Math.sin(now / 17000) +
        GUST * gust,
    );

  out = out || [0, 0];
  out[0] = Math.cos(a) * s;
  out[1] = Math.sin(a) * s;

  return out;
}

//how hard it blows as a share of the most it can: 0..1
Wind.strength = function (w) {
  return Math.min(
    1,
    Math.sqrt(w[0] * w[0] + w[1] * w[1]) / (STEADY + 1.4 * SWELL + GUST),
  );
};

export default Wind;

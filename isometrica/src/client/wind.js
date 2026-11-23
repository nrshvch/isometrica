/**
 * One wind over the whole city, wandering and gusting smoothly, by the
 * world's clock.
 * See isometrica/.claude/skills/rendering/weather.md (Wind).
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

  //and by the weather: hardly a breath on a clear day, a gale in a storm
  s *= Wind.factor;

  out = out || [0, 0];
  out[0] = Math.cos(a) * s;
  out[1] = Math.sin(a) * s;

  return out;
}

//how much harder or softer the weather has it blow than it would: set a
//frame at a time from the weather (client/lighting begin, client/weather)
Wind.factor = 1;

//how hard it blows as a share of the most it would on an ordinary day:
//0..1 - a storm's is all of it
Wind.strength = function (w) {
  return Math.min(
    1,
    Math.sqrt(w[0] * w[0] + w[1] * w[1]) / (STEADY + 1.4 * SWELL + GUST),
  );
};

export default Wind;

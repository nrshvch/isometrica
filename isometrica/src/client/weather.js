/**
 * The weather over the city: one for all of it, worked out from the game's
 * clock alone, so it is the same whenever the game is opened at that time.
 *
 * The days go by in spells of SPELL hours, each of a kind - clear, overcast,
 * fog, rain or a storm - picked by a hash of when it is (KINDS, ODDS), the
 * one going over into the next over BLEND hours. In a spell of rain it comes
 * and goes in showers; and on some mornings of a clear or overcast spell a
 * fog lies over the city from before the sun is up until a while after.
 * What the rain leaves wet stays wet a while after it stops, drying off
 * over DRY hours.
 *
 * What it is, at any time (Weather.at): how much of the sky is cloud, how
 * thick the fog, how hard it rains, how stormy, how wet the ground, and how
 * hard the wind blows over all - a share of how it would blow (client/wind)
 * - for the city to be drawn by (client/lighting, client/glview LIT_FS).
 *
 * ?weather=clear|cloudy|fog|rain|storm holds it at one kind; W goes round
 * them, and back to the clock's.
 */

var HOUR = 3600000;

//each kind of weather: its name, as it is shown; how much of the sky is
//cloud, how thick the fog, how hard it rains, how stormy, 0..1; and how
//hard the wind blows, as a share of how it would
var KINDS = {
  clear: { name: "Clear", cloud: 0.12, fog: 0, rain: 0, storm: 0, wind: 0.6 },
  cloudy: {
    name: "Overcast",
    cloud: 0.85,
    fog: 0.08,
    rain: 0,
    storm: 0,
    wind: 1,
  },
  fog: { name: "Fog", cloud: 0.9, fog: 1, rain: 0, storm: 0, wind: 0.2 },
  rain: { name: "Rain", cloud: 0.95, fog: 0.3, rain: 0.7, storm: 0, wind: 1.3 },
  storm: {
    name: "Storm",
    cloud: 1,
    fog: 0.4,
    rain: 1,
    storm: 1,
    wind: 2.3,
  },
};

var ORDER = ["clear", "cloudy", "fog", "rain", "storm"],
  //how likely each is, for a spell
  ODDS = [0.46, 0.2, 0.08, 0.18, 0.08];

//how long a spell lasts, and how long one takes to go over into the next,
//hours; how long the ground takes to dry off after rain; how many mornings
//in a clear or overcast spell have a fog, and from when to when it lies
var SPELL = 8,
  BLEND = 1.5,
  DRY = 3,
  MORNING_FOG = 0.3,
  FOG_FROM = 3,
  FOG_TO = 9.5;

//a number 0..1 for n and a seed, always the same for them
function hash(n, s) {
  var h = (n * 374761393 + s * 668265263) | 0;

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

//the kind of spell number n
function kindOf(n) {
  var r = hash(n, 7),
    k = 0;

  while (k < ORDER.length - 1 && r >= ODDS[k]) r -= ODDS[k++];

  return ORDER[k];
}

function smooth(k) {
  k = Math.max(0, Math.min(1, k));

  return k * k * (3 - 2 * k);
}

//what of it there is at hour h of the game's time - from its beginning -
//going by the clock: {cloud, fog, rain, storm, wind, kind}
function byClock(h) {
  var n = Math.floor(h / SPELL),
    into = h - n * SPELL,
    k = smooth(into / BLEND),
    now = KINDS[kindOf(n)],
    was = KINDS[kindOf(n - 1)],
    out = {};

  ["cloud", "fog", "rain", "storm", "wind"].forEach(function (f) {
    out[f] = was[f] + (now[f] - was[f]) * k;
  });
  out.kind = k < 0.5 ? kindOf(n - 1) : kindOf(n);

  //in showers, the rain: heavier and lighter by turns
  out.rain *= 0.55 + 0.45 * Math.sin(h * 2.3 + n);

  //a morning's fog, thinning off as the day warms
  var day = Math.floor(h / 24),
    hour = h - day * 24;

  if (
    (out.kind === "clear" || out.kind === "cloudy") &&
    hash(day, 11) < MORNING_FOG
  ) {
    var thick =
      smooth((hour - FOG_FROM) / 1.5) * smooth((FOG_TO - hour) / 2.5) * 0.85;

    if (thick > out.fog) {
      out.fog = thick;
      out.cloud = Math.max(out.cloud, thick * 0.9);
      out.wind = Math.min(out.wind, 1 - thick * 0.7);
      if (thick > 0.4) out.kind = "fog";
    }
  }

  return out;
}

//one kind, held (the override)
function held(kind) {
  var k = KINDS[kind],
    out = {};

  ["cloud", "fog", "rain", "storm", "wind"].forEach(function (f) {
    out[f] = k[f];
  });
  out.kind = kind;

  return out;
}

var Weather = {};

Weather.KINDS = KINDS;
Weather.ORDER = ORDER;

//one kind it is held at, or null for the clock's (?weather=, W)
Weather.override = (function () {
  var m =
    typeof location !== "undefined" &&
    /[?&]weather=(\w+)/.exec(location.search);

  return m && KINDS[m[1]] ? m[1] : null;
})();

/**
 * The weather at `now`, the game's time, ms.
 *
 * @returns {{cloud: number, fog: number, rain: number, storm: number,
 *          wind: number, wet: number, kind: string, name: string}}
 */
Weather.at = function (now) {
  var h = now / HOUR,
    out;

  if (Weather.override !== null) {
    out = held(Weather.override);
    out.wet = out.rain > 0 ? 0.6 + 0.4 * out.rain : 0;
  } else {
    out = byClock(h);

    //wet from the rain there was, drying off over DRY hours after
    var wet = 0;

    for (var k = 0; k <= 6; k++) {
      var ago = (k * DRY) / 6,
        r = k === 0 ? out.rain : byClock(h - ago).rain;

      wet = Math.max(wet, Math.min(1, r * 1.6) * (1 - ago / DRY));
    }

    out.wet = wet;
  }

  out.name = KINDS[out.kind].name;

  return out;
};

/**
 * A flash of lightning, in a storm, at `wall` - the page's clock, ms: how
 * bright, 0..1 - flickering on and off a couple of times - and, for the
 * first of it, a number for the bolt to be drawn by; or null for none.
 * Every few seconds or so in a full storm, rarely in a lesser one.
 */
var FLASH_SLOT = 1700,
  FLASH_ODDS = 0.22;

Weather.flash = function (wall, storm) {
  if (storm < 0.3) return null;

  var slot = Math.floor(wall / FLASH_SLOT),
    seed = hash(slot, 3);

  if (seed > FLASH_ODDS * storm) return null;

  var at = hash(slot, 5) * (FLASH_SLOT - 600),
    t = wall - slot * FLASH_SLOT - at;

  if (t < 0 || t > 520) return null;

  //on, off for a moment, on again, and fading
  var bright =
    t < 70 ? 1 : t < 130 ? 0.15 : t < 210 ? 0.85 : 0.85 * (1 - (t - 210) / 310);

  return { bright: bright, bolt: t < 210 ? slot : -1 };
};

/**
 * The bolt of flash number `slot` on a screen w by h: the points of a
 * jagged line from over its top edge down to where it strikes, x, y from
 * its top left - at most n of them.
 */
Weather.bolt = function (slot, w, h, n) {
  var x = w * (0.15 + 0.7 * hash(slot, 13)),
    end = h * (0.35 + 0.4 * hash(slot, 17)),
    out = [[x, -10]],
    i;

  for (i = 1; i < n; i++) {
    var y = -10 + ((end + 10) * i) / (n - 1);

    x += (hash(slot * 31 + i, 19) - 0.5) * 34;
    out.push([x, y]);
  }

  return out;
};

/**
 * W goes round the kinds of weather, held at each - and after the last,
 * back to the clock's.
 */
Weather.install = function () {
  if (typeof window === "undefined") return;

  window.addEventListener("keydown", function (e) {
    var target = e.target && e.target.tagName;

    if (target === "INPUT" || target === "TEXTAREA" || e.repeat) return;
    if (e.key !== "w" && e.key !== "W") return;

    var i = ORDER.indexOf(Weather.override);

    Weather.override = i === ORDER.length - 1 ? null : ORDER[i + 1];
  });
};

export default Weather;

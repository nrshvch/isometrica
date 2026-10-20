/**
 * The samples drawn for one colour (lab/directions): not the colour ones
 * turned white (art.js), but drawn again to read without colour - a strong
 * silhouette first, then as few cuts as tell what it is, every cut the same
 * width (CUT), nothing solid thinner than 4, what stands over something
 * else apart from it by a gap (GAP), and simpler where colour told the rest
 * - a road without its tile, a flag on its own hill.
 *
 * An icon is layers, back to front, each of them:
 *
 *   solid    [d]                 what it is - fill-rule evenodd, so a ring
 *                                is a path of two circles
 *   holes    [d]                 cut out of it: a door, a lens, a pip
 *   cuts     [[d, width, dash?]] lines cut through it: where two of its
 *                                parts meet, a road's middle line, a dollar
 *   strokes  [[d, width]]        lines drawn on it: a clock's hands
 *   gap      true                to stand apart from the layers under it
 *
 * On the same 64 by 64 artboard as the colour ones; rendered by render.js
 * (renderMono).
 */

export var CUT = 3;

function circle(cx, cy, r) {
  return (
    "M" +
    (cx - r) +
    " " +
    cy +
    "a" +
    r +
    " " +
    r +
    " 0 1 0 " +
    2 * r +
    " 0" +
    "a" +
    r +
    " " +
    r +
    " 0 1 0 " +
    -2 * r +
    " 0Z"
  );
}

var TILE_TOP =
    "M13 16H51Q58 16 58 22V38Q58 44 51 44H13Q6 44 6 38V22Q6 16 13 16Z",
  TILE_SIDE = "M6 38V45Q6 52 13 52H51Q58 52 58 45V38Q58 44 51 44H13Q6 44 6 38Z",
  //where the tile's top meets its front
  TILE_EDGE = "M6.5 38.5Q7 44.5 13 44.5H51Q57 44.5 57.5 38.5";

/* --- in the world ------------------------------------------------------ */

var build = [
  {
    solid: [
      "M42 8H49V12H48V21H43V12H42Z",
      "M34 31L55 25V47L34 54Z",
      "M22 16L46 9.5L58.5 25L35.5 32.5Z",
      "M12 33L23 21L34 33V54H12Z",
      "M8.5 34.5L23 17L37.5 34.5L33.5 36.2L23 23.6L12.5 36.2Z",
    ],
    holes: [
      "M19 43H27V54H19Z",
      circle(23, 31, 2.8),
      "M39.5 36.6L47 34.4V42L39.5 44.2Z",
    ],
    cuts: [
      //the roof off the walls, and the front off the side
      ["M13.4 37.8L23 26.4L32.6 37.8", CUT],
      ["M34 34.6L56 28", CUT],
      ["M34.5 37V54.5", 2.4],
    ],
  },
  {
    gap: true,
    solid: [circle(49, 49, 10)],
    holes: ["M47 42.5H51V47H55.5V51H51V55.5H47V51H42.5V47H47Z"],
  },
];

var road = [
  {
    solid: ["M8 59V33Q8 9 32 9H59V29H36Q29 29 29 36V59Z"],
    cuts: [["M18.5 58V34.5Q18.5 19 34 19H58", CUT, "6 5"]],
  },
];

var clear = [
  {
    solid: [
      "M22 14H26V27H22Z",
      "M31 27L33.5 11.5H48.5L51 27Z",
      "M31.5 9H50.5V12.5H31.5Z",
      "M17 40V31Q17 27 21 27H51Q55 27 55 31V40Z",
      "M10 35.5L18 33V38L10 40.5Z",
      "M15 41H54Q60 41 60 47Q60 53 54 53H15Q9 53 9 47Q9 41 15 41Z",
    ],
    holes: [
      "M35.5 15H45L46.2 23H34.5Z",
      circle(17, 47, 3),
      circle(26.5, 47, 3),
      circle(36, 47, 3),
      circle(45.5, 47, 3),
      circle(53.5, 47, 2.6),
    ],
    cuts: [
      ["M13 40.5H57", CUT],
      ["M20 34H52", 2.4],
    ],
  },
  {
    gap: true,
    solid: ["M4 25.5Q9 24.5 10 26Q8 39 10 51.5Q9 53 4 52.5Q2 39.5 4 25.5Z"],
  },
];

var land = [
  {
    solid: [TILE_TOP, TILE_SIDE],
    cuts: [
      [TILE_EDGE, CUT],
      [
        "M15 21H49Q52 21 52 24V36Q52 39 49 39H15Q12 39 12 36V24Q12 21 15 21Z",
        2.6,
        "5 4",
      ],
    ],
  },
  {
    gap: true,
    solid: [
      "M39.5 27H43.5V42H39.5Z",
      "M27 9H56Q58 9 58 11V26Q58 28 56 28H27Q25 28 25 26V11Q25 9 27 9Z",
    ],
    cuts: [
      [
        "M45.6 13.6C44.3 12.4 38.6 12.2 38.4 15.4C38.2 18.6 45.9 17.7 45.9 21.2C45.9 24.6 39.6 24.4 37.9 22.7",
        CUT,
      ],
      ["M42 10.6V26.4", 2.4],
    ],
  },
];

var found = [
  { solid: ["M5 57Q17 33 32 33Q47 33 59 57Z"] },
  {
    gap: true,
    solid: [
      "M30.5 9H34V41H30.5Z",
      circle(32.25, 8, 3),
      "M34 10Q43 6.5 51 10.5Q54.5 12 58 11V27Q53.5 28.5 49 26.5Q42 23 34 26Z",
    ],
    holes: [
      "M45 13.4L46.4 16.2L49.5 16.6L47.2 18.8L47.8 21.9L45 20.4L42.2 21.9L42.8 18.8L40.5 16.6L43.6 16.2Z",
    ],
  },
];

/* --- signs ------------------------------------------------------------- */

var close = [
  {
    solid: [
      "M14 21L21 14L32 25L43 14L50 21L39 32L50 43L43 50L32 39L21 50L14 43L25 32Z",
    ],
  },
];

var check = [{ solid: ["M9 34L17 26L27 36L47 15L55 23L27 52Z"] }];

var menu = [
  {
    solid: [15, 28.5, 42].map(function (y) {
      return (
        "M11.5 " +
        y +
        "H52.5Q56 " +
        y +
        " 56 " +
        (y + 3.5) +
        "Q56 " +
        (y + 7) +
        " 52.5 " +
        (y + 7) +
        "H11.5Q8 " +
        (y + 7) +
        " 8 " +
        (y + 3.5) +
        "Q8 " +
        y +
        " 11.5 " +
        y +
        "Z"
      );
    }),
  },
];

var SPEAKER = "M8 24H19L32 12V52L19 40H8Z";

var soundOn = [
  {
    solid: [
      SPEAKER,
      "M38 22A13 13 0 0 1 38 42L34.6 38.8A8.6 8.6 0 0 0 34.6 25.2Z",
      "M44.5 15A22 22 0 0 1 44.5 49L41 45.8A17.4 17.4 0 0 0 41 18.2Z",
    ],
    cuts: [["M19.5 25V39", 2.4]],
  },
];

var soundOff = [
  {
    solid: [
      SPEAKER,
      "M37.5 26L41.5 22L46 26.5L50.5 22L54.5 26L50 30.5L54.5 35L50.5 39L46 34.5L41.5 39L37.5 35L42 30.5Z",
    ],
    cuts: [["M19.5 25V39", 2.4]],
  },
];

var clock = [
  {
    solid: [circle(32, 32, 25) + circle(32, 32, 20)],
    strokes: [
      ["M32 20.5V32L41 37.5", 4.2],
      ["M32 14.5V17.5M32 46.5V49.5M14.5 32H17.5M46.5 32H49.5", 3],
    ],
  },
];

var coin = [
  {
    solid: [circle(32, 35, 24)],
    cuts: [[circle(32, 31, 24), CUT]],
  },
  {
    solid: [circle(32, 31, 24)],
    cuts: [
      [circle(32, 31, 18.5), 2.4],
      [
        "M38.4 23.6C36.6 21.8 27.4 21.4 27.2 26.4C27 31.4 38.8 30 38.8 35.6C38.8 41 29 40.6 26.4 37.8",
        4,
      ],
      ["M32.8 17V22M32.8 40V45", 3.4],
    ],
  },
];

var zoom = [
  {
    solid: [
      circle(27, 27, 20) + circle(27, 27, 14),
      "M41 45L45 41L57.5 53.5Q59 55 57.5 56.5L56.5 57.5Q55 59 53.5 57.5Z",
    ],
    strokes: [["M18.5 24A9 9 0 0 1 24 18.5", 3]],
  },
];

function crescent(cx, cy, r, bx, by, br) {
  var d = Math.hypot(bx - cx, by - cy),
    a = (r * r - br * br + d * d) / (2 * d),
    h = Math.sqrt(r * r - a * a),
    ux = (bx - cx) / d,
    uy = (by - cy) / d,
    px = cx + ux * a,
    py = cy + uy * a,
    n = function (v) {
      return Math.round(v * 100) / 100;
    };

  return (
    "M" +
    n(px - uy * h) +
    " " +
    n(py + ux * h) +
    "A" +
    r +
    " " +
    r +
    " 0 1 1 " +
    n(px + uy * h) +
    " " +
    n(py - ux * h) +
    "A" +
    br +
    " " +
    br +
    " 0 0 0 " +
    n(px - uy * h) +
    " " +
    n(py + ux * h) +
    "Z"
  );
}

var dayNight = [
  {
    solid: [
      "M21 3L24.4 12.6L33.7 8.3L29.4 17.6L39 21L29.4 24.4L33.7 33.7L24.4 29.4L21 39L17.6 29.4L8.3 33.7L12.6 24.4L3 21L12.6 17.6L8.3 8.3L17.6 12.6Z",
    ],
    cuts: [[circle(21, 21, 10.5), 2.4]],
  },
  { gap: true, solid: [crescent(38, 39, 20, 50, 28, 16)] },
];

var map = [
  {
    solid: [
      "M7 14L22 8.5V51L7 56.5Z",
      "M22 8.5L42 14.5V57L22 51Z",
      "M42 14.5L57 9V51.5L42 57Z",
    ],
    cuts: [
      ["M22 9V51M42 15V56.5", CUT],
      ["M11 48Q18 42.5 25 44.5", 2.6, "4 3.4"],
    ],
  },
  {
    gap: true,
    solid: [
      "M32 14A8 8 0 0 1 40 22C40 28.5 32 37 32 37C32 37 24 28.5 24 22A8 8 0 0 1 32 14Z",
    ],
    holes: [circle(32, 22, 3)],
  },
];

var locate = [
  {
    solid: [
      circle(32, 32, 17.5) + circle(32, 32, 12),
      "M29.5 5H34.5V15H29.5Z",
      "M29.5 49H34.5V59H29.5Z",
      "M5 29.5H15V34.5H5Z",
      "M49 29.5H59V34.5H49Z",
      circle(32, 32, 5.5),
    ],
  },
];

export var MONO = {
  build: build,
  road: road,
  clear: clear,
  land: land,
  found: found,
  close: close,
  check: check,
  menu: menu,
  "sound-on": soundOn,
  "sound-off": soundOff,
  clock: clock,
  coin: coin,
  zoom: zoom,
  "day-night": dayNight,
  map: map,
  locate: locate,
};

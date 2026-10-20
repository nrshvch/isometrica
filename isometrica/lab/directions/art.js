/**
 * The icon directions' samples (lab/directions): a few of the games' icons
 * drawn by hand in the direction picked - flat colour, a dark outline, the
 * light from the top left, seen from a little above - to be rendered in
 * colour or in one colour (render.js) and decided between before the whole
 * set is drawn.
 *
 * An icon is layers, back to front - a badge over the rest is a layer too -
 * each of them:
 *
 *   pieces  [d, fill, "hole"?] what it is made of, each outlined; "hole"
 *           for a window, a door, a lens, cut out of it in one colour
 *   shade   [d, fill]          tones over the pieces, light and shadow -
 *           in colour only
 *   lines   [d, width, colour?, dash?] strokes over it all - a road's
 *           middle line, a dollar - ink unless said; cut out in one colour
 *   marks   [d, fill]          small marks over it all: a knob, a hub -
 *           ink ones cut out in one colour, the others in colour only
 *
 * On a 64 by 64 artboard, kept within 4 of its edges.
 */

export var INK = "#1e2235";

export var C = {
  grass: "#6cc24a",
  grassDark: "#4c9b37",
  grassLight: "#9bdc68",
  dirt: "#b9825a",
  dirtDark: "#8e5f3d",
  asphalt: "#5a6172",
  asphaltDark: "#444a58",
  line: "#ffd23f",
  white: "#ffffff",
  wood: "#d79a5a",
  woodDark: "#a9703f",
  woodLight: "#f0c08a",
  red: "#ee5a45",
  redDark: "#c4402e",
  redLight: "#ff8a6c",
  cream: "#f8ead0",
  creamDark: "#e3c99f",
  glass: "#8fd4f7",
  glassLight: "#e2f6ff",
  gold: "#ffc83d",
  goldDark: "#e09b14",
  goldLight: "#ffe597",
  machine: "#ffbe1f",
  machineDark: "#e39200",
  machineLight: "#ffe27d",
  steel: "#a7b3c3",
  steelDark: "#76839a",
  steelLight: "#dde4ec",
  track: "#3d4352",
  blue: "#4fb0f0",
  ok: "#4cc864",
  okLight: "#8fe39f",
  brown: "#8a5a36",
  moon: "#b3c1ff",
  moonDark: "#8597ea",
  shadow: "rgba(60, 40, 20, 0.22)",
};

//a circle, as a path - the other way round for a hole in what it is in
function circle(cx, cy, r, back) {
  return (
    "M" +
    (cx - r) +
    " " +
    cy +
    "a" +
    r +
    " " +
    r +
    " 0 1 " +
    (back ? 1 : 0) +
    " " +
    2 * r +
    " 0" +
    "a" +
    r +
    " " +
    r +
    " 0 1 " +
    (back ? 1 : 0) +
    " " +
    -2 * r +
    " 0Z"
  );
}

//the tile the things in the world stand on: its top, and the front of it
var TILE_TOP =
    "M13 16H51Q58 16 58 22V38Q58 44 51 44H13Q6 44 6 38V22Q6 16 13 16Z",
  TILE_SIDE = "M6 38V45Q6 52 13 52H51Q58 52 58 45V38Q58 44 51 44H13Q6 44 6 38Z";

function tile(extra) {
  return {
    pieces: [
      [TILE_SIDE, C.dirt],
      [TILE_TOP, C.grass],
    ].concat(extra && extra.pieces ? extra.pieces : []),
    shade: [
      //the light catching the near edge of the top
      [
        "M13 18H51Q56 18 56 22V23Q56 20 51 20H13Q8 20 8 23V22Q8 18 13 18Z",
        C.grassLight,
      ],
      ["M6 46Q6 52 13 52H51Q58 52 58 46V54H6Z", C.dirtDark],
    ].concat(extra && extra.shade ? extra.shade : []),
    lines: extra && extra.lines ? extra.lines : [],
    marks: extra && extra.marks ? extra.marks : [],
  };
}

/* --- in the world ------------------------------------------------------ */

//a plus in a gold disc, over the bottom right: something new goes up
export function plusBadge() {
  return {
    pieces: [
      [circle(49, 49, 10), C.gold],
      ["M47 42.5H51V47H55.5V51H51V55.5H47V51H42.5V47H47Z", C.white],
    ],
    shade: [
      [
        "M41.4 46.2A8.4 8.4 0 0 1 46 41.1L46.6 43A6.4 6.4 0 0 0 43.2 46.8Z",
        C.goldLight,
      ],
    ],
  };
}

var build = [
  {
    pieces: [
      ["M42 8H49V12H48V21H43V12H42Z", "#b56447"],
      ["M34 31L55 25V47L34 54Z", C.creamDark],
      ["M22 16L46 9.5L58.5 25L35.5 32.5Z", C.red],
      ["M12 33L23 21L34 33V54H12Z", C.cream],
      ["M8.5 34.5L23 17L37.5 34.5L33.5 36.2L23 23.6L12.5 36.2Z", C.redDark],
      ["M19 42H27V54H19Z", C.brown, "hole"],
      [circle(23, 29.5, 2.8), C.glass, "hole"],
      ["M38.5 35.2L45 33.3V40.3L38.5 42.2Z", C.glass, "hole"],
      ["M48.2 32.4L52.4 31.2V38.2L48.2 39.4Z", C.glass, "hole"],
    ],
    shade: [
      ["M24.5 18.2L45.8 12.4L47.6 14.6L26.6 20.6Z", C.redLight],
      ["M33.6 30.3L56.6 23.2L58.5 25L35.5 32.5Z", C.redDark],
      ["M12.5 36.2L23 23.6L33.5 36.2V39L23 26.6L12.5 39Z", C.shadow],
      ["M34 33.6L55 27.4V25L34 31Z", C.shadow],
      ["M39.6 36.2L41.8 35.6V38L39.6 38.6Z", C.glassLight],
    ],
    marks: [[circle(25.2, 48.6, 0.9), INK]],
  },
  //and a plus over it: something new goes up
  plusBadge(),
];

var road = [
  tile({
    pieces: [
      ["M19 44V35Q19 22 33 22H58V33H38Q35 33 35 36V44Z", C.asphalt],
      ["M19 44H35V52H19Z", C.asphaltDark],
      [circle(12.5, 25.5, 3.4), C.grassDark],
      [circle(48, 39, 3), C.grassDark],
    ],
    shade: [
      ["M35 33H38Q35 33 35 36V44H37V36.5Q37 35 39 35H58V33Z", C.asphaltDark],
    ],
    lines: [["M27 43.5V35.5Q27 27.5 35 27.5H57.5", 2.2, C.line, "4 3.4"]],
  }),
];

var clear = [
  {
    pieces: [
      ["M22 14H26V27H22Z", C.steelDark],
      ["M31 27L33.5 11.5H48.5L51 27Z", C.machine],
      ["M31.5 9H50.5V12.5H31.5Z", C.machineDark],
      ["M17 40V31Q17 27 21 27H51Q55 27 55 31V40Z", C.machine],
      ["M10 35.5L18 33V38L10 40.5Z", C.machineDark],
      [
        "M15 39H54Q60 39 60 45.5Q60 52 54 52H15Q9 52 9 45.5Q9 39 15 39Z",
        C.track,
      ],
      [circle(16, 45.5, 3.4), C.steel],
      [circle(25.5, 45.5, 3.4), C.steel],
      [circle(35, 45.5, 3.4), C.steel],
      [circle(44.5, 45.5, 3.4), C.steel],
      [circle(53.5, 45.5, 3.4), C.steel],
      [
        "M5 25.5Q10 24.5 11 26Q9 39 11 51.5Q10 53 5 52.5Q3 39.5 5 25.5Z",
        C.steelLight,
      ],
      ["M35.5 15H45L46.2 23H34.5Z", C.glass, "hole"],
    ],
    shade: [
      ["M17 36H55V40H17Z", C.machineDark],
      [
        "M21 28.5H51Q53.5 28.5 53.5 31V31.5H18.5V31Q18.5 28.5 21 28.5Z",
        C.machineLight,
      ],
      ["M36.6 16.2H39.2L38 21.8H35.9Z", C.glassLight],
      [
        "M7.6 27.2Q8.6 26.8 9.2 27.2Q7.6 39 9.3 50.4Q8.6 50.8 7.6 50.6Q6 39.5 7.6 27.2Z",
        C.white,
      ],
    ],
    marks: [16, 25.5, 35, 44.5, 53.5].map(function (x) {
      return [circle(x, 45.5, 1.2), INK];
    }),
  },
];

var land = [
  tile({
    lines: [
      [
        "M15 21H49Q52 21 52 24V36Q52 39 49 39H15Q12 39 12 36V24Q12 21 15 21Z",
        2,
        C.white,
        "3.6 3",
      ],
    ],
  }),
  {
    pieces: [
      ["M39.5 27H43.5V42H39.5Z", C.woodDark],
      [
        "M27 9H56Q58 9 58 11V26Q58 28 56 28H27Q25 28 25 26V11Q25 9 27 9Z",
        C.woodLight,
      ],
    ],
    shade: [["M25 24H58V26Q58 28 56 28H27Q25 28 25 26Z", C.wood]],
    lines: [
      [
        "M45.6 13.6C44.3 12.4 38.6 12.2 38.4 15.4C38.2 18.6 45.9 17.7 45.9 21.2C45.9 24.6 39.6 24.4 37.9 22.7",
        2.4,
        "#2f7d32",
      ],
      ["M42 10.6V26.4", 1.8, "#2f7d32"],
    ],
  },
];

var found = [
  tile({
    pieces: [["M17 41Q23 31 32 31Q41 31 47 41Z", C.dirt]],
    shade: [
      [
        "M20 38Q25 33.5 32 33.5Q36 33.5 39 35Q35 32 32 32Q24 32 20 38Z",
        C.woodLight,
      ],
    ],
  }),
  {
    pieces: [
      ["M30.5 9H33.5V37H30.5Z", C.steelDark],
      [
        "M33.5 10Q42 7 50 10.5Q53.5 12 56 11V26Q52 27.5 48 25.5Q41 22 33.5 25Z",
        C.red,
      ],
      [circle(32, 8, 2.6), C.gold],
      [
        "M44 13.2L45.3 15.9L48.3 16.3L46.1 18.4L46.6 21.4L44 20L41.4 21.4L41.9 18.4L39.7 16.3L42.7 15.9Z",
        C.gold,
      ],
    ],
    shade: [
      [
        "M33.5 21.5Q41 18.5 48 22Q52 24 56 22.5V26Q52 27.5 48 25.5Q41 22 33.5 25Z",
        C.redDark,
      ],
    ],
  },
];

/* --- signs ------------------------------------------------------------- */

var close = [
  {
    pieces: [
      [
        "M14 21L21 14L32 25L43 14L50 21L39 32L50 43L43 50L32 39L21 50L14 43L25 32Z",
        C.red,
      ],
    ],
    shade: [
      ["M15.5 21L21 15.5L23 17.5L17.5 23Z", C.redLight],
      ["M41 17.5L43 15.5L48.5 21L46.5 23Z", C.redLight],
    ],
  },
];

var check = [
  {
    pieces: [["M9 34L17 26L27 36L47 15L55 23L27 52Z", C.ok]],
    shade: [
      ["M10.5 34L17 27.5L19 29.5L12.5 36Z", C.okLight],
      ["M45 17L47 15L53.5 21.5L51.5 23.5Z", C.okLight],
    ],
  },
];

var menu = [
  {
    pieces: [14, 28, 42].map(function (y) {
      return [
        "M12 " +
          y +
          "H52Q56 " +
          y +
          " 56 " +
          (y + 4) +
          "Q56 " +
          (y + 8) +
          " 52 " +
          (y + 8) +
          "H12Q8 " +
          (y + 8) +
          " 8 " +
          (y + 4) +
          "Q8 " +
          y +
          " 12 " +
          y +
          "Z",
        C.white,
      ];
    }),
    shade: [14, 28, 42].map(function (y) {
      return [
        "M10 " +
          (y + 5.5) +
          "H54V" +
          (y + 6.5) +
          "Q53 " +
          (y + 8) +
          " 52 " +
          (y + 8) +
          "H12Q11 " +
          (y + 8) +
          " 10 " +
          (y + 6.5) +
          "Z",
        "#d6dbe5",
      ];
    }),
  },
];

function speaker() {
  return [
    ["M9 24H19L32 12V52L19 40H9Z", C.steelLight],
    ["M9 24H19V40H9Z", C.steel],
  ];
}

var soundOn = [
  {
    pieces: speaker().concat([
      ["M38 22A13 13 0 0 1 38 42L35 38.8A8.6 8.6 0 0 0 35 25.2Z", C.blue],
      [
        "M44.5 15A22 22 0 0 1 44.5 49L41.4 45.8A17.4 17.4 0 0 0 41.4 18.2Z",
        C.blue,
      ],
    ]),
    shade: [["M20.5 25.5L30.5 16.2V19L20.5 28Z", C.white]],
  },
];

var soundOff = [
  {
    pieces: speaker().concat([
      [
        "M38 26L42 22L46 26L50 22L54 26L50 30L54 34L50 38L46 34L42 38L38 34L42 30Z",
        C.red,
      ],
    ]),
    shade: [["M20.5 25.5L30.5 16.2V19L20.5 28Z", C.white]],
  },
];

var clock = [
  {
    pieces: [
      [circle(32, 32, 25), C.gold],
      [circle(32, 32, 19.5), C.white],
    ],
    shade: [
      [
        "M13.6 26A19.5 19.5 0 0 1 26 13.6L26.6 15.6A17.5 17.5 0 0 0 15.6 26.6Z",
        C.goldLight,
      ],
    ],
    lines: [["M32 19.5V32L41 37", 3.6]],
    marks: [
      [circle(32, 32, 2.6), INK],
      ["M30.8 14.5H33.2V18H30.8Z", INK],
      ["M30.8 46H33.2V49.5H30.8Z", INK],
      ["M14.5 30.8H18V33.2H14.5Z", INK],
      ["M46 30.8H49.5V33.2H46Z", INK],
    ],
  },
];

var coin = [
  {
    pieces: [
      [circle(32, 35, 24), C.goldDark],
      [circle(32, 31, 24), C.gold],
    ],
    shade: [
      [circle(32, 31, 18.5), C.goldLight],
      [circle(32, 32, 16.5), C.gold],
    ],
    lines: [
      [
        "M38.4 23.6C36.6 21.8 27.4 21.4 27.2 26.4C27 31.4 38.8 30 38.8 35.6C38.8 41 29 40.6 26.4 37.8",
        3.6,
        C.goldDark,
      ],
      ["M32.8 18.6V43.6", 3, C.goldDark],
    ],
  },
];

var zoom = [
  {
    pieces: [
      [
        "M40.5 44.5L45 40L57 52Q58.5 53.5 57 55L55 57Q53.5 58.5 52 57Z",
        C.brown,
      ],
      [circle(27, 27, 19), C.steel],
      [circle(27, 27, 14), C.glass, "hole"],
    ],
    shade: [
      [
        "M16.2 24.6A11 11 0 0 1 24.6 16.2L25.2 19.4A8 8 0 0 0 19.4 25.2Z",
        C.white,
      ],
      ["M43 42L45 40L57 52Q58.5 53.5 57 55L56 56Z", C.woodDark],
    ],
  },
];

//a crescent: what of one circle is not under another
function crescent(cx, cy, r, bx, by, br) {
  var d = Math.hypot(bx - cx, by - cy),
    a = (r * r - br * br + d * d) / (2 * d),
    h = Math.sqrt(r * r - a * a),
    ux = (bx - cx) / d,
    uy = (by - cy) / d,
    px = cx + ux * a,
    py = cy + uy * a,
    p1 = [px - uy * h, py + ux * h],
    p2 = [px + uy * h, py - ux * h];

  function n(v) {
    return Math.round(v * 100) / 100;
  }

  return (
    "M" +
    n(p1[0]) +
    " " +
    n(p1[1]) +
    "A" +
    r +
    " " +
    r +
    " 0 1 1 " +
    n(p2[0]) +
    " " +
    n(p2[1]) +
    "A" +
    br +
    " " +
    br +
    " 0 0 0 " +
    n(p1[0]) +
    " " +
    n(p1[1]) +
    "Z"
  );
}

var dayNight = [
  {
    pieces: [
      [
        "M21 3L24.4 12.6L33.7 8.3L29.4 17.6L39 21L29.4 24.4L33.7 33.7L24.4 29.4L21 39L17.6 29.4L8.3 33.7L12.6 24.4L3 21L12.6 17.6L8.3 8.3L17.6 12.6Z",
        C.goldDark,
      ],
      [circle(21, 21, 9.5), C.gold],
    ],
    shade: [
      [
        "M13.6 19A8 8 0 0 1 19 13.6L19.6 15.6A6 6 0 0 0 15.6 19.6Z",
        C.goldLight,
      ],
    ],
  },
  {
    pieces: [[crescent(38, 39, 20, 50, 28, 16), C.moon]],
    shade: [[crescent(38, 39, 20, 41, 36, 18.5), C.moonDark]],
  },
];

var map = [
  {
    pieces: [
      ["M8 14L22 9V50L8 55Z", C.cream],
      ["M22 9L42 15V56L22 50Z", C.creamDark],
      ["M42 15L56 10V51L42 56Z", C.cream],
    ],
    shade: [
      ["M10 30Q16 26 20 30V40Q15 44 10 40Z", C.grassLight],
      ["M44 36Q50 33 54 37V46Q49 49 44 46Z", C.grassLight],
      ["M22 22Q30 27 34 24Q38 21 42 26V29Q38 25 34 28Q29 31 22 26Z", C.glass],
    ],
    lines: [["M11 47Q18 42 25 44Q33 46 40 38", 2, C.red, "3 2.6"]],
  },
  {
    pieces: [
      [
        "M44 12A7 7 0 0 1 51 19C51 24.5 44 32 44 32C44 32 37 24.5 37 19A7 7 0 0 1 44 12Z",
        C.red,
      ],
    ],
    marks: [[circle(44, 19, 2.6), C.white]],
  },
];

var locate = [
  {
    pieces: [
      [circle(32, 32, 17) + circle(32, 32, 11.5, true), C.red],
      ["M29.5 5H34.5V16H29.5Z", C.red],
      ["M29.5 48H34.5V59H29.5Z", C.red],
      ["M5 29.5H16V34.5H5Z", C.red],
      ["M48 29.5H59V34.5H48Z", C.red],
      [circle(32, 32, 5), C.red],
    ],
    shade: [
      [
        "M17.4 29A15 15 0 0 1 29 17.4L29.4 19.4A13 13 0 0 0 19.4 29.4Z",
        C.redLight,
      ],
    ],
  },
];

/**
 * The samples, by what they are for: some of what stands in the world, and
 * some signs.
 */
export var WORLD = [
  { name: "build", label: "Build", art: build },
  { name: "road", label: "Road", art: road },
  { name: "clear", label: "Clear", art: clear },
  { name: "land", label: "Buy land", art: land },
  { name: "found", label: "Found a city", art: found },
];

export var SIGNS = [
  { name: "close", label: "Cancel", art: close },
  { name: "check", label: "Done", art: check },
  { name: "menu", label: "Menu", art: menu },
  { name: "sound-on", label: "Sound on", art: soundOn },
  { name: "sound-off", label: "Sound off", art: soundOff },
  { name: "clock", label: "Time", art: clock },
  { name: "coin", label: "Money", art: coin },
  { name: "zoom", label: "Zoom", art: zoom },
  { name: "day-night", label: "Day and night", art: dayNight },
  { name: "map", label: "View from above", art: map },
  { name: "locate", label: "Back to the city", art: locate },
];

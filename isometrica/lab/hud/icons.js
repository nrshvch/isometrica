/**
 * The game's own icons, where Lucide has none fit: drawn the way Lucide's
 * are, to stand among them - on a 24 grid, within 2 of its edge, lines as
 * wide as the others' with round ends and joins, a corner rounded by 1 to 3
 * - but for the roads, flat tiles of the world (below).
 */
import { createElement, forwardRef } from "react";
import { createLucideIcon } from "lucide-react";

function icon(name, node) {
  return createLucideIcon(
    name,
    node.map(function (n, i) {
      return [n[0], Object.assign({ key: name + i }, n[1])];
    }),
  );
}

/*
 * The roads, each a flat tile of it as the world has it, the road along it
 * from its front left edge to its back right, between its kerbs - told
 * apart by what it is laid with. A flat tile is half as high as it is wide,
 * so they are drawn on a grid WIDE times wider than high, shown that much
 * wider than the others - and finer, their lines STROKE however wide the
 * others' are, to have room for what they are laid with.
 */
var WIDE = 4 / 3,
  STROKE = 1.25;

function n(v) {
  return Math.round(v * 100) / 100;
}

//a point of the tile, 22 by 11 round the middle of the 24 by 18 grid: u
//along the road and v across it, 0 to 1
function at(u, v) {
  return [n(1 + 11 * u + 11 * v), n(9 - 5.5 * u + 5.5 * v)];
}

function line(u0, v0, u1, v1) {
  return [
    "path",
    { d: "M" + at(u0, v0).join(" ") + "L" + at(u1, v1).join(" ") },
  ];
}

//a stone of the gravel, a dot of r
function stone(u, v, r) {
  var p = at(u, v);

  return [
    "circle",
    { cx: p[0], cy: p[1], r: r, fill: "currentColor", stroke: "none" },
  ];
}

var KERB = 0.2,
  ROADBED = [
    [
      "path",
      { d: "M" + [at(0, 0), at(1, 0), at(1, 1), at(0, 1)].join("L") + "Z" },
    ],
    line(0, KERB, 1, KERB),
    line(0, 1 - KERB, 1, 1 - KERB),
  ];

function road(name, surface) {
  var C = createLucideIcon({
    name: name,
    width: 24,
    height: 24 / WIDE,
    node: ROADBED.concat(surface).map(function (n, i) {
      return [n[0], Object.assign({ key: name + i }, n[1])];
    }),
  });

  //as high as asked, WIDE as wide; its lines STROKE wide on a 24 grid as
  //high, as the others' are on theirs
  return forwardRef(function (props, ref) {
    var size = props.size || 24;

    return createElement(
      C,
      Object.assign({}, props, {
        ref: ref,
        size: undefined,
        width: size * WIDE,
        height: size,
        strokeWidth: STROKE / WIDE,
      }),
    );
  });
}

//its middle line dashed
export var Asphalt = road("asphalt", [
  line(0.1, 0.5, 0.3, 0.5),
  line(0.4, 0.5, 0.6, 0.5),
  line(0.7, 0.5, 0.9, 0.5),
]);

export var Gravel = road(
  "gravel",
  [
    [0.08, 0.38, 0.85],
    [0.2, 0.62, 0.75],
    [0.34, 0.39, 0.9],
    [0.48, 0.62, 0.8],
    [0.62, 0.38, 0.75],
    [0.76, 0.62, 0.9],
    [0.9, 0.39, 0.75],
  ].map(function (s) {
    return stone(s[0], s[1], s[2]);
  }),
);

//two rows of stones, their joints apart
export var Cobbles = road("cobbles", [
  line(0, 0.5, 1, 0.5),
  line(0.25, KERB, 0.25, 0.5),
  line(0.58, KERB, 0.58, 0.5),
  line(0.42, 0.5, 0.42, 1 - KERB),
  line(0.75, 0.5, 0.75, 1 - KERB),
]);

//a bulldozer from the side, going right: its tracks round two wheels, the
//cab over the back of them, the blade held out ahead, its edge to the ground
export var Bulldozer = icon("bulldozer", [
  ["circle", { cx: "4", cy: "18", r: "2" }],
  ["circle", { cx: "14", cy: "18", r: "2" }],
  ["path", { d: "M4 16h10" }],
  ["path", { d: "M4 20h10" }],
  ["path", { d: "M5 16v-3a1 1 0 0 1 1-1h9v4" }],
  ["path", { d: "M7 12V6a1 1 0 0 1 1-1h2.5a1 1 0 0 1 .95.68L13.5 12" }],
  ["path", { d: "M16 18h3" }],
  ["path", { d: "M19 11v6a3 3 0 0 0 3 3" }],
]);

//a plot of land, as Lucide's land-plot has it, a sign up on it for sale
export var LandSale = icon("land-sale", [
  ["rect", { x: "5", y: "2", width: "14", height: "7", rx: "1.5" }],
  ["path", { d: "M12 9v3" }],
  [
    "path",
    {
      d: "m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12",
    },
  ],
  ["path", { d: "m6.49 12.85 11.02 6.3" }],
  ["path", { d: "M17.51 12.85 6.5 19.15" }],
]);

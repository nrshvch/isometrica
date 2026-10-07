/**
 * Paints the cars, vans, trucks, lorries and buses that drive about the
 * roads - and the machines that work on building sites and never drive them.
 *
 * Every vehicle is a handful of boxes - body, cabin, windows, wheels, lights -
 * and each picture is those boxes seen the way the game sees the world: one
 * ray per pixel, straight into the scene, coloured by the box it hits first and
 * shaded by which way the face it hits looks. So all of them are lit the same,
 * and every body type comes out in every colour without anybody drawing it.
 *
 * A vehicle is painted four times, once for each way it can drive: along x or
 * y, towards + or -. Unlike a mirrored picture, a truck driving away still has
 * its cab in front and the light still comes from the same side.
 *
 * Units: one along the ground is one pixel across the screen - a tile is 32 of
 * them each way, a road about 20 wide, a lane 10. Heights are in pixels.
 * +x runs up and to the right on the screen, +y up and to the left.
 *
 * It paints into plain pictures, {width, height, data} with the pixels as
 * RGBA: the game paints them as it starts (client/generated), and nothing is
 * shipped but this.
 */
import * as Looks from "./looks.js";
import { BRANDS, NAMES as BRAND_NAMES, panel as emblem } from "./brands.js";

var COLORS = {
  orange: [236, 128, 32],
  yellow: [242, 198, 38],
  red: [196, 36, 40],
  blue: [44, 92, 204],
  green: [48, 146, 64],
  black: [44, 44, 52],
  white: [228, 230, 232],
};

var GLASS = [96, 150, 196],
  TYRE = [28, 28, 32],
  CHASSIS = [52, 52, 58],
  HEADLIGHT = [255, 244, 180],
  TAILLIGHT = [220, 30, 30],
  BUMPER = [120, 122, 128],
  SIGN = [250, 238, 196],
  LAMP_BLUE = [48, 96, 236],
  LAMP_RED = [228, 44, 44],
  LIVERY_DARK = [32, 32, 38],
  LIVERY_LIGHT = [242, 244, 246],
  CARGO = [214, 214, 206],
  GRAVEL = [170, 162, 150],
  BUCKET = [72, 74, 80];

//the colour of a look: one of COLORS, or a firm's (shared/gen/brands), in
//whose colours a delivery truck or van goes about
function colorOf(key) {
  return COLORS[key] || (BRANDS[key] && BRANDS[key].main);
}

/**
 * A firm's emblem on both sides of a vehicle, a cell a unit square: along
 * it from l0, w cells, and up from z0, h - read from the front on the left
 * side, from the back on the right, so that it faces the way it goes on
 * both.
 */
function livery(boxes, brand, l0, z0, w, h, width) {
  var ink = emblem(brand, w, h);

  for (var i = 0; i < w; i++)
    for (var j = 0; j < h; j++) {
      var c = ink(i, j);

      boxes.push(box(l0 + i, l0 + i + 1, -0.15, 0, z0 + j, z0 + j + 1, c));
      boxes.push(
        box(
          l0 + w - 1 - i,
          l0 + w - i,
          width,
          width + 0.15,
          z0 + j,
          z0 + j + 1,
          c,
        ),
      );
    }
}

function mix(c, to, k) {
  return [
    c[0] + (to[0] - c[0]) * k,
    c[1] + (to[1] - c[1]) * k,
    c[2] + (to[2] - c[2]) * k,
  ];
}

function lighter(c, k) {
  return mix(c, [255, 255, 255], k);
}

function darker(c, k) {
  return mix(c, [0, 0, 0], k);
}

/**
 * A box in the vehicle's own frame: l along it from the front (0) back, w
 * across it from its left side, z up from the ground.
 */
function box(l0, l1, w0, w1, z0, z1, color) {
  return { l0: l0, l1: l1, w0: w0, w1: w1, z0: z0, z1: z1, color: color };
}

//glass all round a cabin, leaving pillars at the corners
function windows(boxes, l0, l1, w0, w1, z0, z1, pillar, sides) {
  var e = 0.15;

  //front and back
  boxes.push(box(l0 - e, l1 + e, w0 + pillar, w1 - pillar, z0, z1, GLASS));

  //sides, cut into panes
  for (var i = 0; i < sides.length; i++)
    boxes.push(box(sides[i][0], sides[i][1], w0 - e, w1 + e, z0, z1, GLASS));
}

function wheels(boxes, length, width, axles, radius) {
  for (var i = 0; i < axles.length; i++)
    boxes.push(
      box(
        axles[i] - radius,
        axles[i] + radius,
        -0.3,
        width + 0.3,
        0,
        radius * 2.1,
        TYRE,
      ),
    );

  //the underside between them
  boxes.push(box(1, length - 1, 0.8, width - 0.8, 0.6, 1.2, CHASSIS));
}

function lights(boxes, length, width, z0, z1, inset, size) {
  var e = 0.2;

  boxes.push(box(-e, 0, inset, inset + size, z0, z1, HEADLIGHT));
  boxes.push(
    box(-e, 0, width - inset - size, width - inset, z0, z1, HEADLIGHT),
  );
  boxes.push(box(length, length + e, inset, inset + size, z0, z1, TAILLIGHT));
  boxes.push(
    box(
      length,
      length + e,
      width - inset - size,
      width - inset,
      z0,
      z1,
      TAILLIGHT,
    ),
  );
}

//the shape every saloon shares - the plain one, the cab and the police car are
//the same car underneath, only painted differently
function sedanBoxes(c) {
  var b = [];
  wheels(b, 13, 6, [2.6, 10.4], 1.2);
  b.push(box(0, 13, 0, 6, 1.2, 3.8, c));
  b.push(box(-0.2, 0, 0.3, 5.7, 1.2, 2.2, BUMPER));
  b.push(box(13, 13.2, 0.3, 5.7, 1.2, 2.2, BUMPER));
  lights(b, 13, 6, 2.4, 3.3, 0.4, 1.3);
  b.push(box(3.6, 9.6, 0.5, 5.5, 3.8, 6.6, c));
  windows(b, 3.6, 9.6, 0.5, 5.5, 4.2, 6.1, 0.6, [
    [4.2, 6.4],
    [6.9, 9.0],
  ]);
  return b;
}

//a panel painted on both doors. A chequer would be the thing for a cab, but
//four squares of two pixels read as one blur - a plain panel, and the sign on
//the roof, say cab well enough at this size
function panel(boxes, l0, l1, width, z0, z1, color) {
  var e = 0.12;

  boxes.push(box(l0, l1, -e, width + e, z0, z1, color));
}

//Anything that gives off light of its own - a police car's lamp, a cab's sign -
//is painted apart from the car it sits on and laid over it as it is drawn. Two
//reasons: the lamp can flash without a picture of the whole car per flash, and
//once night falls and the cars are darkened, what is lit can be left alone.
//
//The lamp is painted where it stands on the car, so its own middle-of-the-
//vehicle-on-the-ground pivot puts it back exactly where it belongs.

//the base a police car's lamp stands on - this part is just paint, so it stays
//on the car
var LAMP_BASE = [5.1, 7.5, 0.9, 5.1, 6.6, 7.1];

//its two domes, one lit and one dim, turn and turn about
function lampBoxes(blueLit) {
  var l0 = 5.4,
    l1 = 7.2,
    w0 = 1.2,
    w1 = 4.8,
    mid = 3.0,
    z0 = 7.1,
    z1 = 8.0;

  return [
    box(
      l0,
      l1,
      w0,
      mid,
      z0,
      z1,
      blueLit ? lighter(LAMP_BLUE, 0.3) : darker(LAMP_BLUE, 0.55),
    ),
    box(
      l0,
      l1,
      mid,
      w1,
      z0,
      z1,
      blueLit ? darker(LAMP_RED, 0.55) : lighter(LAMP_RED, 0.3),
    ),
  ];
}

//where smoke comes out of a type, as points in its own frame - l, w and z like
//a box's: its tailpipe, low under the back bumper on the right, puffs as it
//drives; its engine smokes when it breaks down - under the bonnet on most, low
//on the front of a lorry's cab, which sits over it, and at the back of a bus
var TYPES = {
  sedan: {
    length: 13,
    width: 6,
    speed: 1,
    weight: 5,
    engine: [1.8, 3, 3.8],
    tailpipe: [13.2, 4.8, 1.0],
    build: sedanBoxes,
  },
  //a cab: always yellow, with the chequer down its sides and a sign on top
  taxi: {
    length: 13,
    width: 6,
    speed: 1,
    weight: 2,
    engine: [1.8, 3, 3.8],
    tailpipe: [13.2, 4.8, 1.0],
    colors: ["yellow"],
    build: function (c) {
      var b = sedanBoxes(c);
      panel(b, 4.6, 8.6, 6, 2.0, 3.6, LIVERY_LIGHT);
      //what the sign stands on; the lit part of it is laid over the car
      b.push(box(5.4, 7.6, 1.6, 4.4, 6.6, 7.0, LIVERY_DARK));
      return b;
    },
    //the sign is always on - one frame, so it never changes
    lamps: function () {
      return [[box(5.4, 7.6, 1.6, 4.4, 7.0, 8.0, SIGN)]];
    },
  },
  //a police car: white with black doors and a lamp on the roof
  police: {
    length: 13,
    width: 6,
    speed: 1.1,
    weight: 1,
    engine: [1.8, 3, 3.8],
    tailpipe: [13.2, 4.8, 1.0],
    colors: ["white"],
    build: function (c) {
      var b = sedanBoxes(c);
      //doors, and the pillars between them
      b.push(box(3.4, 9.8, -0.12, 6.12, 1.2, 3.8, LIVERY_DARK));
      b.push(box(3.6, 9.6, 0.38, 5.62, 3.8, 4.3, LIVERY_DARK));
      b.push(
        box(
          LAMP_BASE[0],
          LAMP_BASE[1],
          LAMP_BASE[2],
          LAMP_BASE[3],
          LAMP_BASE[4],
          LAMP_BASE[5],
          LIVERY_DARK,
        ),
      );
      return b;
    },
    //blue, then red, and round again
    lamps: function () {
      return [lampBoxes(true), lampBoxes(false)];
    },
  },
  hatchback: {
    length: 11,
    width: 6,
    speed: 1,
    weight: 4,
    engine: [1.6, 3, 3.8],
    tailpipe: [11.2, 4.8, 1.0],
    build: function (c) {
      var b = [];
      wheels(b, 11, 6, [2.3, 8.8], 1.2);
      b.push(box(0, 11, 0, 6, 1.2, 3.8, c));
      b.push(box(-0.2, 0, 0.3, 5.7, 1.2, 2.2, BUMPER));
      b.push(box(11, 11.2, 0.3, 5.7, 1.2, 2.2, BUMPER));
      lights(b, 11, 6, 2.4, 3.3, 0.4, 1.3);
      b.push(box(3.2, 10.6, 0.5, 5.5, 3.8, 6.8, c));
      windows(b, 3.2, 10.6, 0.5, 5.5, 4.2, 6.3, 0.6, [
        [3.8, 6.6],
        [7.1, 10.0],
      ]);
      return b;
    },
  },
  pickup: {
    length: 14,
    width: 6,
    speed: 0.95,
    weight: 3,
    engine: [1.8, 3, 4.0],
    tailpipe: [14.2, 4.8, 1.2],
    build: function (c) {
      var b = [];
      wheels(b, 14, 6, [2.7, 11.3], 1.4);
      b.push(box(0, 14, 0, 6, 1.4, 4.0, c));
      b.push(box(-0.2, 0, 0.3, 5.7, 1.4, 2.4, BUMPER));
      b.push(box(14, 14.2, 0.3, 5.7, 1.4, 2.4, BUMPER));
      lights(b, 14, 6, 2.6, 3.5, 0.4, 1.3);
      //cab
      b.push(box(3.6, 7.8, 0.4, 5.6, 4.0, 7.2, c));
      windows(b, 3.6, 7.8, 0.4, 5.6, 4.5, 6.6, 0.6, [[4.1, 7.2]]);
      //the bed: open at the top, a floor and low walls
      b.push(box(8.2, 14, 0, 0.6, 4.0, 5.2, c));
      b.push(box(8.2, 14, 5.4, 6, 4.0, 5.2, c));
      b.push(box(13.4, 14, 0, 6, 4.0, 5.2, c));
      b.push(box(8.2, 13.4, 0.6, 5.4, 3.6, 4.0, darker(c, 0.35)));
      return b;
    },
  },
  //a van in any colour - or white, with a firm's emblem on its sides
  van: {
    length: 13,
    width: 6.5,
    speed: 0.9,
    weight: 3,
    engine: [1.2, 3.25, 4.2],
    tailpipe: [13.2, 5.3, 1.1],
    colors: Object.keys(COLORS).concat(BRAND_NAMES),
    build: function (c, key) {
      var b = [],
        firm = BRANDS[key] !== undefined;

      if (firm) c = COLORS.white;
      wheels(b, 13, 6.5, [2.4, 10.6], 1.3);
      b.push(box(0, 2.4, 0, 6.5, 1.3, 4.2, c));
      b.push(box(2.4, 13, 0, 6.5, 1.3, 8.6, c));
      b.push(box(-0.2, 0, 0.3, 6.2, 1.3, 2.3, BUMPER));
      b.push(box(13, 13.2, 0.3, 6.2, 1.3, 2.3, BUMPER));
      lights(b, 13, 6.5, 2.6, 3.5, 0.4, 1.3);
      b.push(box(2.25, 2.4, 0.6, 5.9, 5.2, 7.8, GLASS));
      b.push(box(2.9, 5.2, -0.15, 6.65, 5.2, 7.6, GLASS));
      if (firm) livery(b, key, 5.6, 2.6, 7, 5, 6.5);
      return b;
    },
  },
  //a box truck in any colour - or in a firm's, its emblem along the box
  truck: {
    length: 21,
    width: 7,
    speed: 0.75,
    weight: 2,
    engine: [0, 3.5, 3.2],
    tailpipe: [21.2, 5.8, 1.2],
    colors: Object.keys(COLORS).concat(BRAND_NAMES),
    build: function (c, key) {
      var b = [];
      wheels(b, 21, 7, [2.8, 14.6, 17.8], 1.5);
      //cab
      b.push(box(0, 5.6, 0, 7, 1.5, 9.4, c));
      b.push(box(-0.2, 0, 0.3, 6.7, 1.5, 2.8, BUMPER));
      b.push(box(-0.15, 0, 0.8, 6.2, 5.4, 8.4, GLASS));
      b.push(box(1.0, 4.4, -0.15, 7.15, 5.4, 8.2, GLASS));
      b.push(box(-0.2, 0, 0.4, 1.6, 3.2, 4.2, HEADLIGHT));
      b.push(box(-0.2, 0, 5.4, 6.6, 3.2, 4.2, HEADLIGHT));
      //cargo box
      b.push(box(6.0, 21, 0, 7, 2.2, 11.6, CARGO));
      b.push(box(6.0, 21, -0.1, 7.1, 9.6, 10.6, c));
      b.push(box(5.6, 6.0, 1.0, 6.0, 1.5, 7.0, CHASSIS));
      b.push(box(21, 21.2, 0.4, 1.6, 2.4, 3.4, TAILLIGHT));
      b.push(box(21, 21.2, 5.4, 6.6, 2.4, 3.4, TAILLIGHT));
      if (BRANDS[key] !== undefined) livery(b, key, 7, 3, 13, 6, 7);
      return b;
    },
  },
  //a tipper lorry, come to a building site with a load of gravel
  lorry: {
    length: 17,
    width: 7,
    speed: 0.75,
    weight: 1,
    engine: [0, 3.5, 3.2],
    tailpipe: [5.2, 6.2, 1.2],
    colors: ["orange", "yellow", "white", "red"],
    build: function (c) {
      var b = [],
        bed = darker(c, 0.18);
      wheels(b, 17, 7, [2.8, 11.6, 14.6], 1.6);
      //cab
      b.push(box(0, 5, 0, 7, 1.6, 9.4, c));
      b.push(box(-0.2, 0, 0.3, 6.7, 1.6, 2.9, BUMPER));
      b.push(box(-0.15, 0, 0.8, 6.2, 5.4, 8.4, GLASS));
      b.push(box(0.8, 4.2, -0.15, 7.15, 5.4, 8.2, GLASS));
      b.push(box(-0.2, 0, 0.4, 1.6, 3.2, 4.2, HEADLIGHT));
      b.push(box(-0.2, 0, 5.4, 6.6, 3.2, 4.2, HEADLIGHT));
      b.push(box(5, 5.6, 1, 6, 1.6, 6, CHASSIS));
      //the tipping body: its floor, sides and tailgate, a tall headboard
      //over the back of the cab - and the gravel heaped in it
      b.push(box(5.6, 17, 0, 7, 3.4, 4.4, bed));
      b.push(box(5.6, 17, 0, 0.6, 4.4, 9, bed));
      b.push(box(5.6, 17, 6.4, 7, 4.4, 9, bed));
      b.push(box(16.4, 17, 0, 7, 4.4, 9, bed));
      b.push(box(5.6, 6.2, 0, 7, 4.4, 10.4, bed));
      b.push(box(6.2, 16.4, 0.6, 6.4, 4.4, 8.4, GRAVEL));
      b.push(box(7.4, 15, 1.4, 5.6, 8.4, 9.4, lighter(GRAVEL, 0.08)));
      b.push(box(9, 13.2, 2.4, 4.6, 9.4, 10, lighter(GRAVEL, 0.15)));
      b.push(box(17, 17.2, 0.4, 1.6, 2.4, 3.4, TAILLIGHT));
      b.push(box(17, 17.2, 5.4, 6.6, 2.4, 3.4, TAILLIGHT));
      return b;
    },
  },
  //a digger on its tracks, its arm out over the front and down to the
  //ground: a building site's, never out on the roads (street: false)
  excavator: {
    length: 11,
    width: 8,
    speed: 0.3,
    weight: 0,
    street: false,
    engine: [8, 2, 7],
    tailpipe: [9.2, 1.2, 9],
    colors: ["yellow"],
    build: function (c) {
      var b = [],
        dark = darker(c, 0.25);
      b.push(box(0, 11, 0, 2.5, 0, 2.5, TYRE));
      b.push(box(0, 11, 5.5, 8, 0, 2.5, TYRE));
      b.push(box(1, 10, 0.5, 7.5, 2.5, 5, c));
      //the counterweight at the back, the engine beside the cab
      b.push(box(7.5, 10.5, 0.5, 7.5, 5, 7.5, dark));
      b.push(box(5, 7.5, 0.5, 4, 5, 7, c));
      b.push(box(9, 9.5, 1, 1.5, 7.5, 9.5, CHASSIS));
      //the cab, glazed all round
      b.push(box(1, 5, 4, 7.5, 5, 10, c));
      b.push(box(0.85, 5.15, 4.3, 7.2, 7, 9.5, GLASS));
      b.push(box(1.3, 4.7, 3.85, 7.65, 7, 9.5, GLASS));
      //the boom up and out over the front, the stick down, the bucket
      b.push(box(-1, 4, 1.4, 3.4, 8, 10, c));
      b.push(box(-5, -1, 1.4, 3.4, 4, 10, c));
      b.push(box(-7.5, -4, 1, 3.8, 0, 4, BUCKET));
      return b;
    },
  },
  bus: {
    length: 25,
    width: 7.5,
    speed: 0.7,
    weight: 1,
    engine: [25.2, 3.75, 4.2],
    tailpipe: [25.2, 6.3, 1.2],
    build: function (c) {
      var b = [],
        panes = [],
        l;
      wheels(b, 25, 7.5, [4.0, 19.5], 1.5);
      b.push(box(0, 25, 0, 7.5, 1.5, 11.4, c));
      //roof, a shade lighter
      b.push(box(0.6, 24.4, 0.6, 6.9, 11.4, 12.0, lighter(c, 0.45)));
      b.push(box(-0.2, 0, 0.3, 7.2, 1.5, 3.0, BUMPER));
      b.push(box(25, 25.2, 0.3, 7.2, 1.5, 3.0, BUMPER));
      lights(b, 25, 7.5, 3.2, 4.2, 0.4, 1.4);
      //a band of windows down each side, a big one front and back
      for (l = 1.4; l + 2.4 <= 24.2; l += 3.1) panes.push([l, l + 2.4]);
      windows(b, 0, 25, 0, 7.5, 5.6, 9.8, 0.5, panes);
      //a stripe under them
      b.push(box(0.2, 24.8, -0.1, 7.6, 4.0, 4.8, lighter(c, 0.7)));
      return b;
    },
  },
};

//the four ways a vehicle drives, and where its own frame lies in the world
var DIRECTIONS = {
  "x+": { alongX: true, forward: true },
  "x-": { alongX: true, forward: false },
  "y+": { alongX: false, forward: true },
  "y-": { alongX: false, forward: false },
};

/**
 * The boxes in world axes, for a vehicle of this length and width going that
 * way with its middle at the origin. Its front is at the end it is going to;
 * its left side is to the left of the way it is going.
 */
function place(boxes, length, width, dir) {
  return boxes.map(function (b) {
    //along the way it goes, front first
    var a0 = dir.forward ? length / 2 - b.l1 : b.l0 - length / 2,
      a1 = dir.forward ? length / 2 - b.l0 : b.l1 - length / 2,
      //across: left of +x is +y, left of +y is -x
      c0,
      c1;

    if (dir.alongX !== dir.forward) {
      c0 = b.w0 - width / 2;
      c1 = b.w1 - width / 2;
    } else {
      c0 = width / 2 - b.w1;
      c1 = width / 2 - b.w0;
    }

    return dir.alongX
      ? { x0: a0, x1: a1, y0: c0, y1: c1, z0: b.z0, z1: b.z1, color: b.color }
      : { x0: c0, x1: c1, y0: a0, y1: a1, z0: b.z0, z1: b.z1, color: b.color };
  });
}

//a tile is this many units along the ground, and a step up of the land this
//many pixels on the screen
var TILE = 32,
  STEP = 8;

/**
 * Where a point in the vehicle's own frame is when it goes that way: off its
 * middle on the ground, [x, z, y] - along the ground in tiles, up in steps of
 * the land, the way a building gives where its chimney smokes.
 */
function placePoint(p, length, width, dir) {
  var b = place(
    [box(p[0], p[0], p[1], p[1], p[2], p[2])],
    length,
    width,
    dir,
  )[0];

  return [round(b.x0 / TILE), round(b.z0 / STEP), round(b.y0 / TILE)];
}

function round(v) {
  //no "-0" in the data
  return Math.round(v * 1000) / 1000 || 0;
}

//where a point in the world lands on the screen, the origin at 0, 0
function project(x, y, z) {
  return [x - y, -(x + y) / 2 - z];
}

//a face looking up is lit the most, one looking down and to the left (-x)
//less, down and to the right (-y) the least
function shade(color, face) {
  if (face === 2) return lighter(color, 0.22);
  else if (face === 0) return darker(color, 0.1);
  else return darker(color, 0.3);
}

/**
 * The first box a ray through that point on the screen hits, with the face it
 * goes in through. The ray comes from in front, above, and goes along
 * (1, 1, -1), which is what every point that lands on the same pixel lies on.
 */
function cast(boxes, sx, sy) {
  //a point on the ray, well in front of everything
  var y = -100,
    x = y + sx,
    z = -(x + y) / 2 - sy,
    best = Infinity,
    hit = null,
    face = -1,
    i,
    b,
    tx0,
    tx1,
    ty0,
    ty1,
    tz0,
    tz1,
    tin,
    tout,
    f;

  for (i = 0; i < boxes.length; i++) {
    b = boxes[i];
    tx0 = b.x0 - x;
    tx1 = b.x1 - x;
    ty0 = b.y0 - y;
    ty1 = b.y1 - y;
    //z goes down along the ray
    tz0 = z - b.z1;
    tz1 = z - b.z0;

    tin = tx0;
    f = 0;
    if (ty0 > tin) {
      tin = ty0;
      f = 1;
    }
    if (tz0 > tin) {
      tin = tz0;
      f = 2;
    }
    tout = Math.min(tx1, ty1, tz1);

    if (tin < tout && tin < best) {
      best = tin;
      hit = b;
      face = f;
    }
  }

  hitColor = hit === null ? null : hit.color;
  hitFace = face;

  return hit === null ? null : shade(hit.color, face);
}

//what the last ray cast hit: its colour, and the face it went in through
var hitColor = null,
  hitFace = -1;

/**
 * @param boxes {object[]}
 * @param [lit] {boolean} true for something that gives off light: no darkened
 *        edge round it, which would only dirty a lamp of three pixels
 */
/**
 * Where on the screen the boxes are, as a picture of them would be cut: its
 * top left corner off the origin, and its size - without painting it.
 */
function measure(boxes) {
  var minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    corners,
    p;

  boxes.forEach(function (b) {
    corners = [
      [b.x0, b.y0, b.z0],
      [b.x1, b.y0, b.z0],
      [b.x0, b.y1, b.z0],
      [b.x1, b.y1, b.z0],
      [b.x0, b.y0, b.z1],
      [b.x1, b.y0, b.z1],
      [b.x0, b.y1, b.z1],
      [b.x1, b.y1, b.z1],
    ];

    corners.forEach(function (c) {
      p = project(c[0], c[1], c[2]);
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    });
  });

  minX = Math.floor(minX);
  minY = Math.floor(minY);

  return {
    x: minX,
    y: minY,
    w: Math.ceil(maxX) - minX,
    h: Math.ceil(maxY) - minY,
  };
}

function render(boxes, lit) {
  var at = measure(boxes),
    minX = at.x,
    minY = at.y,
    w = at.w,
    h = at.h,
    pixels = [],
    color,
    i,
    j;

  for (j = 0; j < h; j++) {
    for (i = 0; i < w; i++) {
      color = cast(boxes, minX + i + 0.5, minY + j + 0.5);
      pixels.push(color);
    }
  }

  if (lit !== true) outline(pixels, w, h);

  return { w: w, h: h, pixels: pixels, pivotX: -minX, pivotY: -minY };
}

/**
 * Its faces side by side (shared/gen/looks): every pixel in the colour a
 * top of it is in the sun, on the picture of the face the ray went in
 * through, and black on the others - its edge darkened on all of them, as
 * render darkens it.
 */
function renderFaces(boxes) {
  var at = measure(boxes),
    w = at.w,
    h = at.h,
    sections = [[], [], []],
    i,
    j,
    k;

  for (j = 0; j < h; j++)
    for (i = 0; i < w; i++) {
      var c = cast(boxes, at.x + i + 0.5, at.y + j + 0.5);

      for (k = 0; k < 3; k++)
        sections[k].push(
          c === null ? null : k === hitFace ? shade(hitColor, 2) : [0, 0, 0],
        );
    }

  var out = Looks.blank(w, h, 3);

  sections.forEach(function (pixels, k) {
    outline(pixels, w, h);
    pixels.forEach(function (c, n) {
      if (c !== null) Looks.put(out, w, k, n % w, (n / w) | 0, c);
    });
  });

  return out;
}

//darkens the pixels along the edge of the picture a little, so a vehicle
//stands out against a road of about its own darkness - all but the top
//edge, which the light falls on
function outline(pixels, w, h) {
  var edge = [],
    i,
    j,
    k;

  function empty(i, j) {
    return i < 0 || j < 0 || i >= w || j >= h || pixels[j * w + i] === null;
  }

  for (j = 0; j < h; j++) {
    for (i = 0; i < w; i++) {
      k = j * w + i;
      if (
        pixels[k] !== null &&
        !empty(i, j - 1) &&
        (empty(i - 1, j) || empty(i + 1, j) || empty(i, j + 1))
      )
        edge.push(k);
    }
  }

  edge.forEach(function (k) {
    pixels[k] = darker(pixels[k], 0.3);
  });
}

/**
 * Paints every vehicle.
 *
 * @returns {{images: Object, types: Object}} images, every picture by its
 *          sprite name, each with the pivot it is drawn by - the middle of the
 *          vehicle, on the ground; types, every body type by name, with how
 *          fast it drives next to a car (1) and how often it turns up next to
 *          the others, and for each colour and each way it drives (x+, x-, y+,
 *          y-) the name of its picture, its pivot and where smoke comes out:
 *          engine and tailpipe, each [x, z, y] off its middle - along x, up
 *          and along y, in tiles and steps of the land, like a building's
 *          smokeSource. The tailpipe puffs as it drives, the engine smokes
 *          when it breaks down. lamps, for a type with anything lit on it,
 *          the pictures laid over it, one set per flash.
 */
export function generate() {
  var images = {};

  return {
    images: images,
    types: walk(function (name, boxes, lit) {
      var rendered = render(boxes, lit);

      images[name] = toImage(rendered);

      return { pivotX: rendered.pivotX, pivotY: rendered.pivotY };
    }),
  };
}

/**
 * What generate paints, without painting it: every picture's size, and the
 * body types as generate gives them.
 *
 * @returns {{sizes: Object, types: Object}} sizes, {w, h} by picture name
 */
export function describe() {
  var sizes = {};

  return {
    sizes: sizes,
    types: walk(function (name, boxes) {
      var at = measure(boxes);

      sizes[name] = { w: at.w, h: at.h };

      return { pivotX: -at.x, pivotY: -at.y };
    }),
  };
}

/**
 * Goes through every picture there is, handing see(name, boxes, lit) the
 * boxes of each placed the way it drives, and puts together the body types
 * out of what see says the pivot of each is.
 */
function walk(see) {
  var types = {};

  function picture(name, boxes, lit) {
    var look = see(name, boxes, lit);

    return { sprite: name, pivotX: look.pivotX, pivotY: look.pivotY };
  }

  Object.keys(TYPES).forEach(function (type) {
    var t = TYPES[type];

    types[type] = { speed: t.speed, weight: t.weight, colors: {} };

    //a machine for building sites - never sent out into the traffic
    if (t.street === false) types[type].street = false;

    //most types come in every colour; a cab or a police car has its own
    (t.colors || Object.keys(COLORS)).forEach(function (color) {
      var boxes = t.build(colorOf(color), color);

      types[type].colors[color] = {};

      Object.keys(DIRECTIONS).forEach(function (d) {
        var look = picture(
          "gen/vehicles/" + type + "/" + color + "/" + d,
          place(boxes, t.length, t.width, DIRECTIONS[d]),
        );

        look.engine = placePoint(t.engine, t.length, t.width, DIRECTIONS[d]);
        look.tailpipe = placePoint(
          t.tailpipe,
          t.length,
          t.width,
          DIRECTIONS[d],
        );
        types[type].colors[color][d] = look;
      });
    });

    //the lit bits that are laid over it, one picture per flash
    if (t.lamps !== undefined) {
      types[type].lamps = t.lamps().map(function (phase, i) {
        var at = {};

        Object.keys(DIRECTIONS).forEach(function (d) {
          at[d] = picture(
            "gen/vehicles/" + type + "/lamp" + i + "/" + d,
            place(phase, t.length, t.width, DIRECTIONS[d]),
            true,
          );
        });

        return at;
      });
    }
  });

  return types;
}

/**
 * One picture, by the name generate gives it: "gen/vehicles/sedan/red/x+",
 * or "gen/vehicles/police/lamp1/y-" for a flash of what is lit on it.
 *
 * @returns {{width, height, data}}
 */
export function paint(name, look) {
  var parts = name.split("/"),
    t = TYPES[parts[2]],
    dir = DIRECTIONS[parts[4]],
    lamp = /^lamp(\d+)$/.exec(parts[3] || "");

  if (parts.length !== 5 || t === undefined || dir === undefined)
    throw new Error("no such vehicle picture: " + name);

  if (lamp !== null) {
    var phase = t.lamps !== undefined ? t.lamps()[+lamp[1]] : undefined;

    if (phase === undefined)
      throw new Error("no such vehicle picture: " + name);

    var picture = toImage(render(place(phase, t.length, t.width, dir), true));

    //a lamp is lit as a top is, and at night shines (client/carman draws it
    //where things look up, and with what shines)
    if (look === "faces") return lampFaces(picture);
    if (look === "night") return Looks.night(picture);

    return picture;
  }

  if (
    colorOf(parts[3]) === undefined ||
    (t.colors || Object.keys(COLORS)).indexOf(parts[3]) === -1
  )
    throw new Error("no such vehicle picture: " + name);

  var boxes = place(
    t.build(colorOf(parts[3]), parts[3]),
    t.length,
    t.width,
    dir,
  );

  //painted for the light to be worked out as it is drawn (shared/gen/looks)
  if (look === "faces") return renderFaces(boxes);
  if (look === "night") return renderNight(boxes);

  return toImage(render(boxes));
}

/**
 * For the night (shared/gen/looks): its headlights shining white and its
 * tail lights red, and all of it black.
 */
function renderNight(boxes) {
  var at = measure(boxes),
    w = at.w,
    h = at.h,
    out = Looks.blank(w, h, 2);

  for (var j = 0; j < h; j++)
    for (var i = 0; i < w; i++) {
      if (cast(boxes, at.x + i + 0.5, at.y + j + 0.5) === null) continue;

      Looks.put(out, w, 0, i, j, shines(hitColor));
      Looks.put(out, w, 1, i, j, [0, 0, 0]);
    }

  return out;
}

//what a colour of a vehicle shines at night: its headlights and its tail
//lights, nothing else
function shines(c) {
  if (same(c, HEADLIGHT)) return [255, 248, 214];
  if (same(c, TAILLIGHT)) return [255, 36, 24];

  return [0, 0, 0];
}

function same(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

//a lamp's picture on the picture of what looks up, black on the others
function lampFaces(picture) {
  var w = picture.width,
    out = Looks.blank(w, picture.height, 3);

  for (var n = 0; n < w * picture.height; n++) {
    if (picture.data[n * 4 + 3] === 0) continue;

    var c = [
      picture.data[n * 4],
      picture.data[n * 4 + 1],
      picture.data[n * 4 + 2],
    ];

    Looks.put(out, w, 0, n % w, (n / w) | 0, [0, 0, 0]);
    Looks.put(out, w, 1, n % w, (n / w) | 0, [0, 0, 0]);
    Looks.put(out, w, 2, n % w, (n / w) | 0, c);
  }

  return out;
}

function toImage(p) {
  var data = new Uint8ClampedArray(p.w * p.h * 4),
    c,
    k;

  for (var i = 0; i < p.pixels.length; i++) {
    c = p.pixels[i];
    if (c === null) continue;

    k = i * 4;
    data[k] = Math.round(c[0]);
    data[k + 1] = Math.round(c[1]);
    data[k + 2] = Math.round(c[2]);
    data[k + 3] = 255;
  }

  return { width: p.w, height: p.h, data: data };
}

//for whatever else is painted with cars in it: a car park full of them
export { TYPES, COLORS, DIRECTIONS, place };

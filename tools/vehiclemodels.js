/**
 * The cars, vans, trucks and buses that drive about the roads, as boxes: what
 * src/shared/gen/vehicles.js paints them from, and what tools/genbuildings.js parks
 * in its car parks, so a parked car is the same car as a driving one.
 *
 * Units as in shared/gen/vehicles: one along the ground is one pixel across the
 * screen, a tile 32 each way; heights in pixels.
 */

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
  CARGO = [214, 214, 206];

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

var TYPES = {
  sedan: {
    length: 13,
    width: 6,
    speed: 1,
    weight: 5,
    build: function (c) {
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
    },
  },
  hatchback: {
    length: 11,
    width: 6,
    speed: 1,
    weight: 4,
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
  van: {
    length: 13,
    width: 6.5,
    speed: 0.9,
    weight: 3,
    build: function (c) {
      var b = [];
      wheels(b, 13, 6.5, [2.4, 10.6], 1.3);
      b.push(box(0, 2.4, 0, 6.5, 1.3, 4.2, c));
      b.push(box(2.4, 13, 0, 6.5, 1.3, 8.6, c));
      b.push(box(-0.2, 0, 0.3, 6.2, 1.3, 2.3, BUMPER));
      b.push(box(13, 13.2, 0.3, 6.2, 1.3, 2.3, BUMPER));
      lights(b, 13, 6.5, 2.6, 3.5, 0.4, 1.3);
      b.push(box(2.25, 2.4, 0.6, 5.9, 5.2, 7.8, GLASS));
      b.push(box(2.9, 5.2, -0.15, 6.65, 5.2, 7.6, GLASS));
      return b;
    },
  },
  truck: {
    length: 21,
    width: 7,
    speed: 0.75,
    weight: 2,
    build: function (c) {
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
      return b;
    },
  },
  bus: {
    length: 25,
    width: 7.5,
    speed: 0.7,
    weight: 1,
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

module.exports = {
  COLORS: COLORS,
  TYPES: TYPES,
  DIRECTIONS: DIRECTIONS,
  place: place,
  mix: mix,
  lighter: lighter,
  darker: darker,
};

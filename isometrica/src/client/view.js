/**
 * Which way round the camera looks at the world: turned a quarter turn at a
 * time about the ground in the middle of the screen, 0 to 3 times (see
 * Vkaria#turnView). Where anything is in the world stays where it is, and
 * the camera works out where that is on the screen, and which of two things
 * is in front (CameraComponent#depthAxes). What the turn changes is which
 * picture a thing shows - every one is painted from the one side the camera
 * looks from unturned - and so these say how something in the world looks
 * as seen from the side the camera is on now: which way a way along the
 * ground goes as it is seen, which corner of a tile is seen on its left, and
 * so on.
 *
 * "As seen" is in the camera's own terms: the way the world would have to go
 * unturned to look the same. Tiles are x, y as Terrain has them.
 */
import Events from "events";

var turns = 0,
  //looked at from straight above, as a map - north up, the camera unturned
  //all the while (Vkaria#setTopView)
  top = false;

var events = {
  //the camera turned, or went over to looking from above or back: {turns,
  //from, top}
  change: 0,
};

var View = { events: events };

View.turns = function () {
  return turns;
};

/**
 * Turns to t quarter turns - and tells whoever listens. It is the camera's
 * to call, once it has turned (Vkaria#turnView).
 */
View.setTurns = function (t) {
  var from = turns;

  t = ((t % 4) + 4) % 4;
  if (t === turns) return;

  turns = t;
  Events.fire(View, events.change, { turns: t, from: from, top: top });
};

/**
 * Whatever fn works out, as it would be seen from t quarter turns round -
 * without turning, and without telling anyone: for what is to be ready
 * before the camera turns there (client/preloader).
 */
View.peek = function (t, fn) {
  var was = turns;

  turns = ((t % 4) + 4) % 4;
  try {
    return fn();
  } finally {
    turns = was;
  }
};

/**
 * Whether the world is looked at from straight above, as a map: every
 * picture of it painted from above too, a tile a square 64 a side, north up.
 */
View.top = function () {
  return top;
};

/**
 * Goes over to looking from above, or back - and tells whoever listens, as
 * a turn does. The camera's to call, once it looks that way
 * (Vkaria#setTopView), unturned.
 */
View.setTop = function (t) {
  t = t === true;
  if (t === top) return;

  top = t;
  Events.fire(View, events.change, { turns: turns, from: turns, top: top });
};

/**
 * A way along the ground in the world, as it is seen: [dx, dy].
 */
View.vector = function (dx, dy) {
  for (var k = 0; k < turns; k++) {
    var t = dx;

    dx = dy;
    dy = -t;
  }

  return [dx, dy];
};

/**
 * A way along the ground as it is seen, in the world.
 */
View.unvector = function (dx, dy) {
  for (var k = 0; k < turns; k++) {
    var t = dy;

    dy = dx;
    dx = -t;
  }

  return [dx, dy];
};

//a tile's corners, off the tile's own x, y - in the order a slope is read in
//(see client/terrain, shared/gen/terrain heights): on the left as seen
//unturned (W), at the top (N), on the right (E), at the bottom (S)
var CORNERS = [
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

/**
 * The corner of a tile that is seen where corner k is unturned (CORNERS), off
 * the tile's x, y: [dx, dy], each 0 or 1.
 */
View.corner = function (k) {
  var c = CORNERS[k],
    w = View.unvector(c[0] - 0.5, c[1] - 0.5);

  return [w[0] + 0.5, w[1] + 0.5];
};

/**
 * How high the ground is at corner k of tile x, y as it is seen (corner).
 *
 * @param terrain {Terrain} core terrain
 */
View.cornerHeight = function (terrain, x, y, k) {
  var c = View.corner(k);

  return terrain.getGridPointHeight(x + c[0], y + c[1]);
};

/**
 * Something standing on sizeX by sizeY tiles from tile x, y, as it is seen:
 * the tile of it a picture of it is drawn from - the one in the corner where
 * x and y as seen are smallest, the corner the tile x, y is in unturned - and
 * how many tiles it is across and deep as seen.
 *
 * @returns {{x, y, sizeX, sizeY}} x, y the tile in the world
 */
View.anchor = function (x, y, sizeX, sizeY) {
  var best = null,
    corners = [
      [x, y],
      [x + sizeX - 1, y],
      [x, y + sizeY - 1],
      [x + sizeX - 1, y + sizeY - 1],
    ];

  corners.forEach(function (c) {
    var s = View.vector(c[0], c[1]);

    if (best === null || s[0] + s[1] < best.s) best = { c: c, s: s[0] + s[1] };
  });

  return {
    x: best.c[0],
    y: best.c[1],
    sizeX: turns & 1 ? sizeY : sizeX,
    sizeY: turns & 1 ? sizeX : sizeY,
  };
};

var HEADINGS = {
  "x+": [1, 0],
  "x-": [-1, 0],
  "y+": [0, 1],
  "y-": [0, -1],
  "x+y+": [1, 1],
  "x-y+": [-1, 1],
  "x-y-": [-1, -1],
  "x+y-": [1, -1],
};

//the eight headings round from +x, anticlockwise seen from above
var ROUND = ["x+", "x+y+", "y+", "x-y+", "x-", "x-y-", "y-", "x+y-"];

//which way each heading goes as it is seen, at each of the four turns:
//worked out once, as heading would work it out - a car asks it every frame
var SEEN = [0, 1, 2, 3].map(function (t) {
  var seen = {};

  Object.keys(HEADINGS).forEach(function (heading) {
    var dx = HEADINGS[heading][0],
      dy = HEADINGS[heading][1],
      k,
      s;

    //as View.vector turns it
    for (k = 0; k < t; k++) {
      s = dx;
      dx = dy;
      dy = -s;
    }

    seen[heading] =
      (dx > 0 ? "x+" : dx < 0 ? "x-" : "") +
      (dy > 0 ? "y+" : dy < 0 ? "y-" : "");
  });

  return seen;
});

/**
 * Which way something going `heading` in the world - "x+", "y-", or one of
 * the four half way between, "x+y-" - goes as it is seen.
 */
View.heading = function (heading) {
  return SEEN[turns][heading];
};

/**
 * The nearest of the eight headings to going (dx, dy) in the world, or null
 * for not going anywhere.
 */
View.headingOf = function (dx, dy) {
  if (dx === 0 && dy === 0) return null;

  var k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));

  return ROUND[(k + 8) % 8];
};

/**
 * A heading's way along the ground, [dx, dy] - a unit long.
 */
View.headingVector = function (heading) {
  var v = HEADINGS[heading],
    l = Math.sqrt(v[0] * v[0] + v[1] * v[1]);

  return [v[0] / l, v[1] / l];
};

/**
 * The joins of a piece of road as it is seen, each of -x, -y, +x, +y in that
 * order - each a quarter turn further round with every turn.
 *
 * @param joins {number[]} 0 or 1 for each of -x, -y, +x, +y in the world
 */
View.joins = function (joins) {
  var sides = [
      [-1, 0],
      [0, -1],
      [1, 0],
      [0, 1],
    ],
    out = [0, 0, 0, 0];

  sides.forEach(function (s, i) {
    var d = View.vector(s[0], s[1]);

    for (var j = 0; j < 4; j++)
      if (sides[j][0] === d[0] && sides[j][1] === d[1]) out[j] = joins[i];
  });

  return out;
};

/**
 * A ramp as it is seen: 1 up towards -y, 2 -x, 3 +y, 4 +x (see shared/gen/roads
 * RAMPS).
 */
View.ramp = function (id) {
  var ups = [
      [0, -1],
      [-1, 0],
      [0, 1],
      [1, 0],
    ],
    d = View.vector(ups[id - 1][0], ups[id - 1][1]);

  for (var j = 0; j < 4; j++)
    if (ups[j][0] === d[0] && ups[j][1] === d[1]) return j + 1;

  return id;
};

export default View;

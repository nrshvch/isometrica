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

var turns = 0;

var events = {
  //the camera turned: {turns, from}
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
  Events.fire(View, events.change, { turns: t, from: from });
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
//(see client/terrain): on the left as seen unturned, at the bottom, on the
//right, at the top
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

var HEADINGS = { "x+": [1, 0], "x-": [-1, 0], "y+": [0, 1], "y-": [0, -1] };

/**
 * Which way something going `heading` in the world - "x+", "y-" - goes as it
 * is seen.
 */
View.heading = function (heading) {
  var v = HEADINGS[heading],
    d = View.vector(v[0], v[1]);

  return d[0] > 0 ? "x+" : d[0] < 0 ? "x-" : d[1] > 0 ? "y+" : "y-";
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

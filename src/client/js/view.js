/**
 * Which way round the world is seen: turned a quarter turn at a time, 0 to 3
 * times. The camera never turns - it looks at the ground from the one side
 * every picture is painted for - the world is turned under it instead: what
 * stands on a tile is drawn on the tile the turn brings it to, as it looks
 * from the side the turn brings round to face the camera. So the order things
 * are drawn in, worked out from where they are drawn, takes care of itself,
 * and only which picture each thing shows has to be told the turn - a
 * building turned that many more times, a road joined up the other ways, a
 * car going the other way, a slope of the ground sloping the other way.
 *
 * Points go round the middle of the map. A point is in tiles, as a tile's
 * index is - the middle of tile x, y is at x, y, its corners half a tile
 * off it - and a grid point gx, gy, the corner where tiles meet, at gx - 0.5,
 * gy - 0.5.
 */
import Events from "events";

//the last tile along either side, as Terrain indexes them (16 bits each)
var LAST = 0xffff;

var turns = 0;

var events = {
  //the world turned: {turns, from}
  change: 0,
};

var View = {};

View.events = events;

View.turns = function () {
  return turns;
};

/**
 * Turns the world round to t quarter turns - and tells whoever listens.
 */
View.setTurns = function (t) {
  var from = turns;

  t = ((t % 4) + 4) % 4;
  if (t === turns) return;

  turns = t;
  Events.fire(View, events.change, { turns: t, from: from });
};

/**
 * A point of the world, in tiles, where it is drawn: [x, y].
 */
View.point = function (x, y) {
  for (var k = 0; k < turns; k++) {
    var t = x;

    x = y;
    y = LAST - t;
  }

  return [x, y];
};

/**
 * Where a point drawn at x, y is in the world.
 */
View.unpoint = function (x, y) {
  for (var k = 0; k < turns; k++) {
    var t = y;

    y = x;
    x = LAST - t;
  }

  return [x, y];
};

/**
 * A grid point - the corner where four tiles meet - where it is drawn, as a
 * grid point.
 */
View.grid = function (gx, gy) {
  var p = View.point(gx - 0.5, gy - 0.5);

  return [p[0] + 0.5, p[1] + 0.5];
};

View.ungrid = function (gx, gy) {
  var p = View.unpoint(gx - 0.5, gy - 0.5);

  return [p[0] + 0.5, p[1] + 0.5];
};

/**
 * A way to go in the world, the way it goes as drawn.
 */
View.vector = function (dx, dy) {
  for (var k = 0; k < turns; k++) {
    var t = dx;

    dx = dy;
    dy = -t;
  }

  return [dx, dy];
};

View.unvector = function (dx, dy) {
  for (var k = 0; k < turns; k++) {
    var t = dy;

    dy = dx;
    dx = -t;
  }

  return [dx, dy];
};

/**
 * Something sizeX by sizeY tiles from tile x, y on, as drawn: the tile it is
 * drawn from - the one nearest the world's origin as drawn - and its size,
 * the sides swapped on an odd turn.
 */
View.rect = function (x, y, sizeX, sizeY) {
  var a = View.point(x, y),
    b = View.point(x + sizeX - 1, y + sizeY - 1);

  return {
    x: Math.min(a[0], b[0]),
    y: Math.min(a[1], b[1]),
    sizeX: turns & 1 ? sizeY : sizeX,
    sizeY: turns & 1 ? sizeX : sizeY,
  };
};

/**
 * How high the ground is at a grid point as drawn.
 *
 * @param terrain {Terrain} core terrain
 */
View.gridHeight = function (terrain, gx, gy) {
  var g = View.ungrid(gx, gy);

  return terrain.getGridPointHeight(g[0], g[1]);
};

var HEADINGS = { "x+": [1, 0], "x-": [-1, 0], "y+": [0, 1], "y-": [0, -1] };

/**
 * Which way something going `heading` in the world - "x+", "y-" - goes as
 * drawn.
 */
View.heading = function (heading) {
  var v = HEADINGS[heading],
    d = View.vector(v[0], v[1]);

  return d[0] > 0 ? "x+" : d[0] < 0 ? "x-" : d[1] > 0 ? "y+" : "y-";
};

/**
 * The joins of a piece of road as drawn - each of -x, -y, +x, +y in the
 * world, in that order, is that many quarter turns further round: a turn
 * takes -x to +y, -y to -x, +x to -y and +y to +x.
 *
 * @param joins {number[]} 0 or 1 for each of -x, -y, +x, +y
 */
View.joins = function (joins) {
  var out = joins.slice();

  for (var k = 0; k < turns; k++) out = [out[1], out[2], out[3], out[0]];

  return out;
};

/**
 * A ramp as drawn: 1 up towards -y, 2 -x, 3 +y, 4 +x (see shared/gen/roads
 * RAMPS) - each a quarter turn further round with every turn.
 */
View.ramp = function (id) {
  return ((id - 1 + turns) % 4) + 1;
};

export default View;

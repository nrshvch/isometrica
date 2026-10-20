/**
 * The grid over the ground: a line along every edge of every tile there is,
 * drawn as lines over the ground's pictures rather than painted into them -
 * so putting it away and bringing it back (client/terrain showGrid) paints
 * nothing, and every tile is drawn with the same picture either way.
 *
 * It goes where the tiles' outlines are painted: through their corners, at
 * the heights the tiles are drawn at - a tile of water flat at its surface -
 * on the same pixels as the pictures under it, by how high each tile's
 * corners were when it was last shaped (client/terrain shapeTile). A run of
 * edges that lines up is one line.
 *
 * The lines are worked out for the tiles on the screen and a way past its
 * edges (MARGIN), and drawn from there for as long as the camera has not
 * moved further than that, nor turned or zoomed, and none of those tiles has
 * changed - every frame they are only put where they are on the screen.
 */
import Engine from "engine";
import Config from "../config";
import RenderLayer from "../renderlayer";
import View from "../view";

//see-through black along every edge of every tile, a pixel into each tile
//either side - a line two pixels wide where two tiles meet, as the tiles
//drawn by hand had it
var COLOR = "rgba(0,0,0,0.14)",
  WIDTH = 2,
  NO_DASH = [];

//how high the ground can stand, in steps (core/terrain calcZ) - and how low,
//a shore going down under the water - for how far off the screen a tile can
//be and still show on it
var HIGHEST = 16,
  LOWEST = -2;

//how far past the edges of the screen the lines are worked out, in pixels:
//how far the camera can move before they are worked out again
var MARGIN = 128;

//a tile's corners, as the heights it keeps have them (client/terrain
//shapeTile): A at x, y, B at x + 1, y, C at x, y + 1, D at x + 1, y + 1.
//An edge along x at y has A, B of the tile at y and C, D of the one at
//y - 1; one along y at x, A, C of the tile at x and B, D of the one at x - 1
var ALONG_X = [0, 1, 2, 3],
  ALONG_Y = [0, 2, 1, 3];

//the corners of what is gone over, as grid points (lines): of the screen and
//its margin on the ground at the lowest it goes, and at the highest
var hullX = new Float64Array(8),
  hullY = new Float64Array(8),
  span = new Float64Array(2);

/**
 * @param terrain {Terrain} the client's terrain, whose tiles it goes over
 * @constructor
 */
function TerrainGridRenderer(terrain) {
  Engine.Renderer.call(this);

  this.layer = RenderLayer.groundLayer;
  this.terrain = terrain;
  //the lines last worked out: x, y, z - a grid point and how many steps
  //high - and whether a line starts there, point after point
  this.points = [];
  //the edges of a tile drawn where its neighbour draws them differently,
  //gone over after the rest: [x0, y0, z0, x1, y1, z1, ...]
  this.extra = [];
  //what they were worked out for: the way the camera looked - M but where
  //it was - the screen's size, and where the camera was (moved)
  this.view = new Float64Array(8);
  this.at = new Float64Array(2);
  //and the grid points they go over, x0, y0, x1, y1 (changed)
  this.box = [0, 0, -1, -1];
}

TerrainGridRenderer.prototype = Object.create(Engine.Renderer.prototype);

//whether it is drawn (client/terrain showGrid)
TerrainGridRenderer.prototype.shown = true;
//whether a tile the lines go over has changed since they were worked out
TerrainGridRenderer.prototype.stale = true;

//over the whole screen whenever it is drawn at all
TerrainGridRenderer.prototype.cullingTest = function () {
  return this.shown;
};

/**
 * Tile x, y has been shaped, or put away (client/terrain): the lines are
 * worked out again if they go along it.
 */
TerrainGridRenderer.prototype.changed = function (x, y) {
  var box = this.box;

  if (x >= box[0] - 1 && x <= box[2] && y >= box[1] - 1 && y <= box[3])
    this.stale = true;
};

TerrainGridRenderer.prototype.render = function (
  ctx,
  viewportrenderer,
  viewport,
) {
  var M = viewportrenderer.M,
    points = this.points,
    ts = Config.tileSize,
    zStep = Config.tileZStep,
    //the pixels of the picture under it: from the side, a tile's corners
    //are painted half a pixel above where they are (shared/gen/terrain
    //screenCorners)
    lift = View.top() ? 0 : 0.5,
    wx,
    wy,
    wz,
    sx,
    sy,
    i;

  if (this.stale || moved(this, M, viewport.width, viewport.height)) {
    this.stale = false;
    lines(this, M, viewport.width, viewport.height);
  }

  if (points.length === 0) return;

  ctx.beginPath();

  //to the pixel, as the pictures under them are put (engine Canvas2dRenderer
  //cull)
  for (i = 0; i < points.length; i += 4) {
    wx = points[i] * ts - ts / 2;
    wy = points[i + 2] * zStep;
    wz = points[i + 1] * ts - ts / 2;
    sx = Math.floor(M[0] * wx + M[4] * wy + M[8] * wz + M[12] + 0.5);
    sy = Math.floor(M[1] * wx + M[5] * wy + M[9] * wz + M[13] + 0.5) - lift;

    if (points[i + 3] === 1) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }

  ctx.save();
  ctx.setLineDash(NO_DASH);
  ctx.strokeStyle = COLOR;
  ctx.lineWidth = WIDTH;
  //drawn even in a frame of the city drawn bare, as the ground is
  //(client/glcanvas ground)
  ctx.ground = true;
  ctx.stroke();
  ctx.restore();
};

/**
 * Whether the camera has turned or zoomed, the screen changed size, or the
 * camera moved further than the margin the lines were worked out with, since
 * they were - and if so, it is remembered as it is now.
 */
function moved(self, M, w, h) {
  var view = self.view,
    at = self.at;

  if (
    view[0] === M[0] &&
    view[1] === M[1] &&
    view[2] === M[4] &&
    view[3] === M[5] &&
    view[4] === M[8] &&
    view[5] === M[9] &&
    view[6] === w &&
    view[7] === h &&
    Math.abs(M[12] - at[0]) <= MARGIN &&
    Math.abs(M[13] - at[1]) <= MARGIN
  )
    return false;

  view[0] = M[0];
  view[1] = M[1];
  view[2] = M[4];
  view[3] = M[5];
  view[4] = M[8];
  view[5] = M[9];
  view[6] = w;
  view[7] = h;
  at[0] = M[12];
  at[1] = M[13];

  return true;
}

/**
 * Works the lines out, into self's points: over the tiles that can show on
 * a screen w by h or within MARGIN of it - each line of the grid only as far
 * as it goes through that, from where its corners would be on the ground at
 * the lowest and at the highest it goes.
 */
function lines(self, M, w, h) {
  var tiles = self.terrain.tiles,
    points = self.points,
    extra = self.extra,
    box = self.box,
    det = M[0] * M[9] - M[8] * M[1],
    ts = Config.tileSize,
    zStep = Config.tileZStep,
    k,
    up,
    sx,
    sy,
    i;

  points.length = 0;
  extra.length = 0;
  box[0] = box[1] = 0;
  box[2] = box[3] = -1;

  if (det === 0) return;

  for (k = 0; k < 8; k++) {
    up = (k < 4 ? LOWEST : HIGHEST) * zStep;
    sx = (k & 1 ? w + MARGIN : -MARGIN) - M[4] * up - M[12];
    sy = (k & 2 ? h + MARGIN : -MARGIN) - M[5] * up - M[13];
    //the world's x, z there, as grid points
    hullX[k] = (sx * M[9] - M[8] * sy) / det / ts + 0.5;
    hullY[k] = (M[0] * sy - M[1] * sx) / det / ts + 0.5;
  }

  box[0] = Math.max(0, Math.floor(Math.min.apply(null, hullX)));
  box[1] = Math.max(0, Math.floor(Math.min.apply(null, hullY)));
  box[2] = Math.ceil(Math.max.apply(null, hullX));
  box[3] = Math.ceil(Math.max.apply(null, hullY));

  for (i = box[1]; i <= box[3]; i++)
    if (across(hullY, hullX, i))
      gridLine(
        points,
        tiles,
        extra,
        i,
        Math.max(0, Math.floor(span[0])),
        Math.ceil(span[1]),
        true,
      );
  for (i = box[0]; i <= box[2]; i++)
    if (across(hullX, hullY, i))
      gridLine(
        points,
        tiles,
        extra,
        i,
        Math.max(0, Math.floor(span[0])),
        Math.ceil(span[1]),
        false,
      );

  for (i = 0; i < extra.length; i += 6)
    points.push(
      extra[i],
      extra[i + 1],
      extra[i + 2],
      1,
      extra[i + 3],
      extra[i + 4],
      extra[i + 5],
      0,
    );
}

/**
 * How far along the line where u is c the corners u, v go round, into span
 * - [from, to] along v - by where the line crosses the lines between every
 * two of them: the ends of that are where it goes in and out of them all.
 * false where it misses them.
 */
function across(u, v, c) {
  var lo = Infinity,
    hi = -Infinity,
    p,
    q,
    t;

  for (p = 0; p < 8; p++) {
    if (u[p] === c) {
      lo = Math.min(lo, v[p]);
      hi = Math.max(hi, v[p]);
    }

    for (q = p + 1; q < 8; q++)
      if ((u[p] - c) * (u[q] - c) < 0) {
        t = (c - u[p]) / (u[q] - u[p]);
        lo = Math.min(lo, v[p] + t * (v[q] - v[p]));
        hi = Math.max(hi, v[p] + t * (v[q] - v[p]));
      }
  }

  span[0] = lo;
  span[1] = hi;

  return lo <= hi;
}

/**
 * Line at of the grid - along x if alongX, else along y - from grid point
 * from to grid point to: into points, where there are tiles either side
 * of it, as one line for as long as it goes on straight; and where the tiles
 * either side have it at heights of their own, the second of them into
 * extra.
 */
function gridLine(points, tiles, extra, at, from, to, alongX) {
  var c = alongX ? ALONG_X : ALONG_Y,
    //the line's start and how far it has got, and how much it climbs a tile
    open = false,
    endK = 0,
    endZ = 0,
    climb = 0,
    k,
    a,
    b,
    za,
    zb;

  for (k = from; k < to; k++) {
    a = alongX ? tiles[(at << 16) ^ k] : tiles[(k << 16) ^ at];
    b =
      at === 0
        ? undefined
        : alongX
          ? tiles[((at - 1) << 16) ^ k]
          : tiles[(k << 16) ^ (at - 1)];

    if (a === undefined && b === undefined) {
      if (open) end(points, alongX, at, endK, endZ);
      open = false;
      continue;
    }

    if (a !== undefined) {
      za = a.heights[c[0]];
      zb = a.heights[c[1]];

      if (b !== undefined && (b.heights[c[2]] !== za || b.heights[c[3]] !== zb))
        alongX
          ? extra.push(k, at, b.heights[c[2]], k + 1, at, b.heights[c[3]])
          : extra.push(at, k, b.heights[c[2]], at, k + 1, b.heights[c[3]]);
    } else {
      za = b.heights[c[2]];
      zb = b.heights[c[3]];
    }

    if (open && endZ === za && zb - za === climb) {
      //straight on
      endK = k + 1;
      endZ = zb;
      continue;
    }

    if (open && endZ === za) {
      //on from where it got to, turning
      end(points, alongX, at, endK, endZ);
    } else {
      if (open) end(points, alongX, at, endK, endZ);
      end(points, alongX, at, k, za, true);
    }

    open = true;
    endK = k + 1;
    endZ = zb;
    climb = zb - za;
  }

  if (open) end(points, alongX, at, endK, endZ);
}

//a point k along line at of the grid, z steps high, into points - a line
//starting there if start
function end(points, alongX, at, k, z, start) {
  if (alongX) points.push(k, at, z, start ? 1 : 0);
  else points.push(at, k, z, start ? 1 : 0);
}

export default TerrainGridRenderer;

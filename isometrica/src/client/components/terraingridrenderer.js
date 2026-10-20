/**
 * The grid over the ground: a line along every edge of every tile there is,
 * drawn as lines over the ground's pictures rather than painted into them -
 * so putting it away and bringing it back (client/terrain showGrid) paints
 * nothing, and every tile is drawn with the same picture either way.
 *
 * It goes where the tiles' outlines are painted: through their corners, at
 * the heights the tiles are drawn at - a tile of water flat at its surface -
 * on the same pixels as the pictures under it. Only the tiles on the screen
 * are gone over, every frame, by how high each tile's corners were when it
 * was last shaped (client/terrain shapeTile), and a run of edges that lines
 * up is drawn as one line.
 */
import Engine from "engine";
import Core from "../../core/main";
import Config from "../config";
import RenderLayer from "../renderlayer";
import View from "../view";

var CoreTerrain = Core.Terrain;

//see-through black along every edge of every tile, a pixel into each tile
//either side - a line two pixels wide where two tiles meet, as the tiles
//drawn by hand had it
var COLOR = "rgba(0,0,0,0.14)",
  WIDTH = 2;

//how high the ground can stand, in steps (core/terrain calcZ) - and how low,
//a shore going down under the water - for how far off the screen a tile can
//be and still show on it
var HIGHEST = 16,
  LOWEST = -2;

//a tile's corners, as the heights it keeps have them (client/terrain
//shapeTile): A at x, y, B at x + 1, y, C at x, y + 1, D at x + 1, y + 1.
//An edge along x at y has A, B of the tile at y and C, D of the one at
//y - 1; one along y at x, A, C of the tile at x and B, D of the one at x - 1
var ALONG_X = [0, 1, 2, 3],
  ALONG_Y = [0, 2, 1, 3];

var range = new Float64Array(4),
  NO_DASH = [];

/**
 * @param terrain {Terrain} the client's terrain, whose tiles it goes over
 * @constructor
 */
function TerrainGridRenderer(terrain) {
  Engine.Renderer.call(this);

  this.layer = RenderLayer.groundLayer;
  this.terrain = terrain;
  //the lines over the tiles on the screen, as they were last gone over:
  //x, y, z - a grid point and how many steps high - and whether a line
  //starts there, point after point; for which grid points, x0, y0, x1, y1
  this.points = [];
  this.over = [0, 0, -1, -1];
  //the edges of a tile drawn where its neighbour draws them differently,
  //gone over after the rest: [x0, y0, z0, x1, y1, z1, ...]
  this.extra = [];
}

TerrainGridRenderer.prototype = Object.create(Engine.Renderer.prototype);

//whether it is drawn (client/terrain showGrid)
TerrainGridRenderer.prototype.shown = true;
//whether the tiles have changed since they were last gone over - a tile
//shaped, or put away (client/terrain)
TerrainGridRenderer.prototype.stale = true;

//over the whole screen whenever it is drawn at all
TerrainGridRenderer.prototype.cullingTest = function () {
  return this.shown;
};

TerrainGridRenderer.prototype.render = function (
  ctx,
  viewportrenderer,
  viewport,
) {
  var M = viewportrenderer.M;

  if (!seen(M, viewport.width, viewport.height)) return;

  var x0 = Math.max(0, Math.floor(range[0])),
    y0 = Math.max(0, Math.floor(range[1])),
    x1 = Math.ceil(range[2]),
    y1 = Math.ceil(range[3]),
    over = this.over,
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

  if (x1 < x0 || y1 < y0) return;

  //gone over again only once other tiles come on the screen, or they change
  if (
    this.stale ||
    x0 !== over[0] ||
    y0 !== over[1] ||
    x1 !== over[2] ||
    y1 !== over[3]
  ) {
    over[0] = x0;
    over[1] = y0;
    over[2] = x1;
    over[3] = y1;
    this.stale = false;
    lines(this, x0, y0, x1, y1);
  }

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
 * Goes over the tiles from grid point x0, y0 to x1, y1 for the lines over
 * them, into self's points.
 */
function lines(self, x0, y0, x1, y1) {
  var tiles = self.terrain.tiles,
    points = self.points,
    extra = self.extra,
    i;

  points.length = 0;
  extra.length = 0;

  for (i = y0; i <= y1; i++) gridLine(points, tiles, extra, i, x0, x1, true);
  for (i = x0; i <= x1; i++) gridLine(points, tiles, extra, i, y0, y1, false);

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
 * The tiles that can show on a screen w by h, by grid point, into range -
 * [x0, y0, x1, y1] - from where its corners would be on the ground at the
 * lowest and at the highest it goes. false if the ground cannot be seen.
 */
function seen(M, w, h) {
  var det = M[0] * M[9] - M[8] * M[1],
    ts = Config.tileSize,
    zStep = Config.tileZStep,
    k,
    up,
    sx,
    sy,
    x,
    y;

  if (det === 0) return false;

  range[0] = range[1] = Infinity;
  range[2] = range[3] = -Infinity;

  for (k = 0; k < 8; k++) {
    up = (k < 4 ? LOWEST : HIGHEST) * zStep;
    sx = (k & 1 ? w : 0) - M[4] * up - M[12];
    sy = (k & 2 ? h : 0) - M[5] * up - M[13];
    //the world's x, z there, as grid points
    x = (sx * M[9] - M[8] * sy) / det / ts + 0.5;
    y = (M[0] * sy - M[1] * sx) / det / ts + 0.5;

    range[0] = Math.min(range[0], x);
    range[1] = Math.min(range[1], y);
    range[2] = Math.max(range[2], x);
    range[3] = Math.max(range[3], y);
  }

  return true;
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
    a = alongX
      ? tiles[CoreTerrain.convertToIndex(k, at)]
      : tiles[CoreTerrain.convertToIndex(at, k)];
    b =
      at === 0
        ? undefined
        : alongX
          ? tiles[CoreTerrain.convertToIndex(k, at - 1)]
          : tiles[CoreTerrain.convertToIndex(at - 1, k)];

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

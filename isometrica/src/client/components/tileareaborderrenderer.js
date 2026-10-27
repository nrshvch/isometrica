/**
 * Draws a continuous border around a set of tiles - the same way the city
 * limits and the blocks of land for sale are drawn, rather than as a grid of
 * per tile hilites.
 *
 * Hand it tiles and it works out the perimeter itself (see client/tileoutline),
 * so it will outline any shape: a square block, a water tower's round reach, or
 * several separate pieces at once.
 */
import Engine from "engine";
import * as glMatrix from "gl-matrix";
import RenderLayer from "../renderlayer";
import { outline } from "../tileoutline";

var Vec3 = glMatrix.vec3;
var float32Buffer = new Float32Array(3);

/**
 * @param terrain {Terrain} core terrain, for grid point heights
 * @param tiles {number[]}
 * @param [padding] {number} how far inside the edge to draw, see tileoutline
 * @constructor
 */
function TileAreaBorderRenderer(terrain, tiles, padding) {
  Engine.Renderer.call(this);

  this.layer = RenderLayer.groundDrawLayer;
  this.terrain = terrain;
  this.padding = padding;
  this.paths = outline(tiles || [], terrain, padding);
  //how far its outline spans across the screen and up it, but for where the
  //camera is moved to (spans): the least and the most of each, and the
  //turn and zoom they are for, of the paths they are for
  this.spans = new Float64Array(10);
  this.spansOf = null;
}

TileAreaBorderRenderer.prototype = Object.create(Engine.Renderer.prototype);

TileAreaBorderRenderer.prototype.fillColor = "rgba(0,160,255,0.35)";
TileAreaBorderRenderer.prototype.borderColor = "rgba(0,192,255,0.9)";
TileAreaBorderRenderer.prototype.borderWidth = 2;
TileAreaBorderRenderer.prototype.dash = [6, 4];
TileAreaBorderRenderer.prototype.paths = null;

/**
 * @param tiles {number[]}
 */
TileAreaBorderRenderer.prototype.setTiles = function (tiles) {
  this.paths = outline(tiles || [], this.terrain, this.padding);
};

//drawn whenever any of it is on screen: what its outline spans, rather than
//where its corners are - an area round the camera, its corners all off
//screen, is still there to see
TileAreaBorderRenderer.prototype.cullingTest = function (viewport, vprender) {
  var V = vprender.V,
    s = spans(this, V),
    //each point on the screen is its part of the span and where the camera
    //is moved to, as a 32 bit float - the least and the most of them as well
    minX = Math.fround(s[0] + V[12]),
    maxX = Math.fround(s[1] + V[12]),
    minY = Math.fround(s[2] + V[13]),
    maxY = Math.fround(s[3] + V[13]);

  return minX < 1 && maxX > -1 && minY < 1 && maxY > -1;
};

/**
 * The least and the most of what the outline's points come to across the
 * screen and up it through V, but for where V moves them to - worked out
 * again only when the outline or how V turns and zooms changes: a pan
 * moves them all alike. In the order a point is taken through V (gl-matrix
 * vec3 transformMat4), for each to come to the same.
 */
function spans(self, V) {
  var s = self.spans,
    paths = self.paths;

  if (
    self.spansOf === paths &&
    s[4] === V[0] &&
    s[5] === V[4] &&
    s[6] === V[8] &&
    s[7] === V[1] &&
    s[8] === V[5] &&
    s[9] === V[9]
  )
    return s;

  var minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    path,
    p,
    x,
    y,
    i,
    j;

  for (i = 0; i < paths.length; i++) {
    path = paths[i];

    for (j = 0; j < path.length; j++) {
      p = path[j];
      x = V[0] * p[0] + V[4] * p[1] + V[8] * p[2];
      y = V[1] * p[0] + V[5] * p[1] + V[9] * p[2];

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  s[0] = minX;
  s[1] = maxX;
  s[2] = minY;
  s[3] = maxY;
  s[4] = V[0];
  s[5] = V[4];
  s[6] = V[8];
  s[7] = V[1];
  s[8] = V[5];
  s[9] = V[9];
  self.spansOf = paths;

  return s;
}

TileAreaBorderRenderer.prototype.render = function (ctx, viewportrenderer) {
  var paths = this.paths,
    m = viewportrenderer.M,
    buffer = float32Buffer,
    path,
    i,
    j;

  if (paths.length === 0) return;

  ctx.beginPath();

  for (i = 0; i < paths.length; i++) {
    path = paths[i];

    if (path.length === 0) continue;

    Vec3.transformMat4(buffer, path[0], m);
    ctx.moveTo(buffer[0], buffer[1]);

    for (j = 1; j < path.length; j++) {
      Vec3.transformMat4(buffer, path[j], m);
      ctx.lineTo(buffer[0], buffer[1]);
    }

    ctx.closePath();
  }

  ctx.save();
  //this layer is shared with the city border, so the dash is always set
  ctx.setLineDash(this.dash);
  ctx.fillStyle = this.fillColor;
  ctx.fill();
  ctx.strokeStyle = this.borderColor;
  ctx.lineWidth = this.borderWidth;
  ctx.stroke();
  ctx.restore();
};

export default TileAreaBorderRenderer;

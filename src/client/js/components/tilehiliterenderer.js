/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 07.04.14
 * Time: 13:55
 * To change this template use File | Settings | File Templates.
 */
import engine from "engine/main";
import Config from "../config";
import * as glMatrix from "gl-matrix";

var vec3Buffer1 = new Float32Array(3),
    mat4Buffer1 = new Float32Array(16);

//an arrow lying on the tile: how far out from its middle the tip reaches, how
//far back the base sits and how wide the base is either side - in tiles. Half
//as long as it is wide
var ARROW_TIP = 0.11,
    ARROW_BASE = 0.11,
    ARROW_HALF_WIDTH = 0.22;

//a square lying in the middle of the tile, half as wide as it is either way -
//in tiles. As wide as an arrow is long
var SQUARE_HALF = 0.11;

function Renderer(){
    engine.Renderer.call(this);

    var ts = Config.tileSize;
    var p0 = new Float32Array([-ts / 2, 0, -ts / 2]),
        p1 = new Float32Array([-ts / 2, 0, ts / 2]),
        p2 = new Float32Array([ts / 2, 0, ts / 2]),
        p3 = new Float32Array([ts / 2, 0, -ts / 2]);

    this.points = [p0,p1,p2,p3];
}

Renderer.prototype = Object.create(engine.Renderer.prototype);

Renderer.prototype.fillColor = "rgba(0,255,0,0.5)";
Renderer.prototype.borderColor = "rgba(0,0,0,0.5)";
Renderer.prototype.borderWidth = 1;
//a dash pattern for the border, or null for a solid line
Renderer.prototype.borderDash = null;
//[dx, dy] in tiles - an arrow drawn on the tile pointing that way, or null
Renderer.prototype.arrow = null;
//a small square drawn in the middle of the tile
Renderer.prototype.square = false;
//the arrow's or the square's
Renderer.prototype.markerColor = "white";

Renderer.prototype.points = null;

/**
 * Where the point u, v tiles off the middle of the tile is on screen, lifted
 * the way the tile's corners are so that it lies on its slope.
 */
function surfacePoint(out, points, u, v, M) {
    var ts = Config.tileSize,
        fx = u + 0.5,
        fz = v + 0.5;

    //the corners are p0 (-,-), p1 (-,+), p2 (+,+) and p3 (+,-)
    out[0] = u * ts;
    out[1] = points[0][1] * (1 - fx) * (1 - fz) + points[3][1] * fx * (1 - fz)
        + points[1][1] * (1 - fx) * fz + points[2][1] * fx * fz;
    out[2] = v * ts;

    return glMatrix.vec3.transformMat4(out, out, M);
}

function renderArrow(self, layer, M) {
    var dx = self.arrow[0],
        dz = self.arrow[1],
        len = Math.sqrt(dx * dx + dz * dz),
        points = self.points,
        p = vec3Buffer1;

    dx /= len;
    dz /= len;

    layer.beginPath();
    surfacePoint(p, points, dx * ARROW_TIP, dz * ARROW_TIP, M);
    layer.moveTo(p[0], p[1]);
    surfacePoint(p, points, -dx * ARROW_BASE - dz * ARROW_HALF_WIDTH, -dz * ARROW_BASE + dx * ARROW_HALF_WIDTH, M);
    layer.lineTo(p[0], p[1]);
    surfacePoint(p, points, -dx * ARROW_BASE + dz * ARROW_HALF_WIDTH, -dz * ARROW_BASE - dx * ARROW_HALF_WIDTH, M);
    layer.lineTo(p[0], p[1]);
    layer.closePath();

    layer.save();
    layer.fillStyle = self.markerColor;
    layer.fill();
    layer.restore();
}

function renderSquare(self, layer, M) {
    var points = self.points,
        p = vec3Buffer1,
        h = SQUARE_HALF;

    layer.beginPath();
    surfacePoint(p, points, -h, -h, M);
    layer.moveTo(p[0], p[1]);
    surfacePoint(p, points, h, -h, M);
    layer.lineTo(p[0], p[1]);
    surfacePoint(p, points, h, h, M);
    layer.lineTo(p[0], p[1]);
    surfacePoint(p, points, -h, h, M);
    layer.lineTo(p[0], p[1]);
    layer.closePath();

    layer.save();
    layer.fillStyle = self.markerColor;
    layer.fill();
    layer.restore();
}

Renderer.prototype.render = function(layer, viewportRenderer){
    var vec3 = glMatrix.vec3,
        M = glMatrix.mat4.mul(mat4Buffer1, viewportRenderer.M, this.gameObject.transform.getLocalToWorld()),
        points = this.points;

    layer.beginPath();
    vec3.transformMat4(vec3Buffer1, points[0], M);
    layer.moveTo(vec3Buffer1[0], vec3Buffer1[1]);
    vec3.transformMat4(vec3Buffer1, points[1], M);
    layer.lineTo(vec3Buffer1[0], vec3Buffer1[1]);
    vec3.transformMat4(vec3Buffer1, points[2], M);
    layer.lineTo(vec3Buffer1[0], vec3Buffer1[1]);
    vec3.transformMat4(vec3Buffer1, points[3], M);
    layer.lineTo(vec3Buffer1[0], vec3Buffer1[1]);
    layer.closePath();

    layer.save();
    if(this.borderColor !== undefined){
        layer.strokeStyle = this.borderColor;
        layer.lineWidth = this.borderWidth;
        if (this.borderDash !== null)
            layer.setLineDash(this.borderDash);
        layer.stroke();
    }

    if(this.fillColor !== undefined){
        layer.fillStyle = this.fillColor;
        layer.fill();
    }
    layer.restore();

    if (this.arrow !== null)
        renderArrow(this, layer, M);

    if (this.square)
        renderSquare(this, layer, M);
};

export default Renderer;

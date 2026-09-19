/**
 * Outlines and tints one block of land that is up for sale.
 *
 * The outline follows the terrain grid points along the block perimeter, so it
 * hugs hills the same way the city border does, and the whole block is drawn as
 * a single shape - a per tile hilite would put a grid all over it.
 */
import Engine from "engine/main";
import * as glMatrix from "gl-matrix";
import Config from "../config";
import RenderLayer from "../renderlayer";

var Vec3 = glMatrix.vec3;
var float32Buffer = new Float32Array(3);

function gridPoint(terrain, gx, gy) {
    var ts = Config.tileSize,
        //everything below zero is sea bed, and the water is drawn as a flat
        //surface at zero - so the outline rides the waves rather than diving
        //down to the bottom of the bay
        z = Math.max(terrain.getGridPointHeight(gx, gy), 0);

    return new Float32Array([
        gx * ts - ts / 2,
        z * Config.tileZStep,
        gy * ts - ts / 2
    ]);
}

function calculatePerimeter(terrain, block) {
    var x0 = block.x0,
        y0 = block.y0,
        x1 = block.x1 + 1,
        y1 = block.y1 + 1,
        points = [],
        i;

    for (i = x0; i <= x1; i++)
        points.push(gridPoint(terrain, i, y0));

    for (i = y0 + 1; i <= y1; i++)
        points.push(gridPoint(terrain, x1, i));

    for (i = x1 - 1; i >= x0; i--)
        points.push(gridPoint(terrain, i, y1));

    for (i = y1 - 1; i > y0; i--)
        points.push(gridPoint(terrain, x0, i));

    return points;
}

/**
 * @param terrain {Terrain} core terrain, for grid point heights
 * @param block {Object} block descriptor from CityService.Area
 * @constructor
 */
function LandBlockRenderer(terrain, block) {
    Engine.Renderer.call(this);

    this.layer = RenderLayer.groundDrawLayer;
    this.block = block;
    this.points = calculatePerimeter(terrain, block);
}

LandBlockRenderer.prototype = Object.create(Engine.Renderer.prototype);

LandBlockRenderer.prototype.fillColor = "rgba(0,255,0,0.05)";
LandBlockRenderer.prototype.borderColor = "rgba(0,255,0,0.7)";
LandBlockRenderer.prototype.borderWidth = 2;
LandBlockRenderer.prototype.dash = [4];
LandBlockRenderer.prototype.points = null;
LandBlockRenderer.prototype.block = null;

LandBlockRenderer.prototype.cullingTest = function (viewport, vprender) {
    var buffer = float32Buffer,
        points = this.points;

    for (var i = 0; i < points.length; i++) {
        Vec3.transformMat4(buffer, points[i], vprender.V);
        if (buffer[0] > -1 && buffer[0] < 1 && buffer[1] > -1 && buffer[1] < 1)
            return true;
    }

    return false;
};

LandBlockRenderer.prototype.render = function (ctx, viewportrenderer) {
    var points = this.points,
        l = points.length,
        m = viewportrenderer.M,
        buffer = float32Buffer;

    ctx.beginPath();
    Vec3.transformMat4(buffer, points[0], m);
    ctx.moveTo(buffer[0], buffer[1]);

    for (var i = 1; i < l; i++) {
        Vec3.transformMat4(buffer, points[i], m);
        ctx.lineTo(buffer[0], buffer[1]);
    }

    ctx.closePath();

    ctx.save();
    //the city border shares this layer, so the dash is always set explicitly
    ctx.setLineDash(this.dash);
    ctx.fillStyle = this.fillColor;
    ctx.fill();
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = this.borderWidth;
    ctx.stroke();
    ctx.restore();
};

export default LandBlockRenderer;

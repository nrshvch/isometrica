/**
 * Draws a continuous border around a set of tiles - the same way the city
 * limits and the blocks of land for sale are drawn, rather than as a grid of
 * per tile hilites.
 *
 * Hand it tiles and it works out the perimeter itself (see client/tileoutline),
 * so it will outline any shape: a square block, a water tower's round reach, or
 * several separate pieces at once.
 */
import Engine from "engine/main";
import * as glMatrix from "gl-matrix";
import RenderLayer from "../renderlayer";
import {outline} from "../tileoutline";

var Vec3 = glMatrix.vec3;
var float32Buffer = new Float32Array(3);

/**
 * @param terrain {Terrain} core terrain, for grid point heights
 * @param tiles {number[]}
 * @constructor
 */
function TileAreaBorderRenderer(terrain, tiles) {
    Engine.Renderer.call(this);

    this.layer = RenderLayer.groundDrawLayer;
    this.terrain = terrain;
    this.paths = outline(tiles || [], terrain);
}

TileAreaBorderRenderer.prototype = Object.create(Engine.Renderer.prototype);

TileAreaBorderRenderer.prototype.fillColor = "rgba(0,160,255,0.10)";
TileAreaBorderRenderer.prototype.borderColor = "rgba(0,192,255,0.9)";
TileAreaBorderRenderer.prototype.borderWidth = 2;
TileAreaBorderRenderer.prototype.dash = [6, 4];
TileAreaBorderRenderer.prototype.paths = null;

/**
 * @param tiles {number[]}
 */
TileAreaBorderRenderer.prototype.setTiles = function (tiles) {
    this.paths = outline(tiles || [], this.terrain);
};

TileAreaBorderRenderer.prototype.cullingTest = function (viewport, vprender) {
    var buffer = float32Buffer,
        paths = this.paths,
        path, i, j;

    for (i = 0; i < paths.length; i++) {
        path = paths[i];

        for (j = 0; j < path.length; j++) {
            Vec3.transformMat4(buffer, path[j], vprender.V);

            if (buffer[0] > -1 && buffer[0] < 1 && buffer[1] > -1 && buffer[1] < 1)
                return true;
        }
    }

    return false;
};

TileAreaBorderRenderer.prototype.render = function (ctx, viewportrenderer) {
    var paths = this.paths,
        m = viewportrenderer.M,
        buffer = float32Buffer,
        path, i, j;

    if (paths.length === 0)
        return;

    ctx.beginPath();

    for (i = 0; i < paths.length; i++) {
        path = paths[i];

        if (path.length === 0)
            continue;

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

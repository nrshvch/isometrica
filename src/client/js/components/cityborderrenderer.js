/**
 * Draws the city limits as one continuous line around everything the city owns.
 *
 * The perimeter itself is worked out by client/tileoutline, which the blocks of
 * land for sale and the water towers' reach use as well - so every "these tiles,
 * together" outline in the game is the same shape of thing.
 */
import Engine from "engine/main";
import * as glMatrix from "gl-matrix";
import RenderLayer from "../renderlayer";
import Events from "events";
import {outline} from "../tileoutline";

var Vec3 = glMatrix.vec3;
var float32Buffer = new Float32Array(3);
var dash = [4];

function borderPoints(self) {
    return outline(self.city.area.getTiles(), self.city.world.terrain);
}

function onAreaChange(sender, args, self) {
    if (self.city)
        self.points = borderPoints(self);
}

/**
 * @param city {City}
 * @constructor
 */
function CityBorderRenderer(city) {
    this.layer = RenderLayer.groundDrawLayer;
    this.city = city;

    var area = city.area;
    Events.on(area, area.events.change, onAreaChange, this);
}

CityBorderRenderer.prototype = Object.create(Engine.Renderer.prototype);

/**
 * One array of border points per closed path.
 * @type {Array[]}
 */
CityBorderRenderer.prototype.points = null;

CityBorderRenderer.prototype.start = function () {
    this.points = borderPoints(this);
};

CityBorderRenderer.prototype.cullingTest = function (viewport, vprender) {
    var buffer = float32Buffer,
        points = this.points,
        path, i, j;

    for (i = 0; i < points.length; i++) {
        path = points[i];

        for (j = 0; j < path.length; j++) {
            Vec3.transformMat4(buffer, path[j], vprender.V);

            if (buffer[0] > -1 && buffer[0] < 1 && buffer[1] > -1 && buffer[1] < 1)
                return true;
        }
    }

    return false;
};

CityBorderRenderer.prototype.render = function (ctx, viewportrenderer) {
    var points = this.points,
        m = viewportrenderer.M,
        buffer = float32Buffer,
        path, i, j;

    ctx.beginPath();

    for (i = 0; i < points.length; i++) {
        path = points[i];

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

    ctx.lineWidth = 3;
    ctx.setLineDash(dash);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.stroke();
};

export default CityBorderRenderer;

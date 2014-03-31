define(function (require) {
    var engine = require("engine"),
        renderLayer = require("lib/renderlayer");

    function ToolScript() {

    }

    ToolScript.prototype = Object.create(engine.Component.prototype);

    var vec3Buffer1 = new Float32Array(3);

    ToolScript.prototype.start = function () {
        var pathRenderer = this.gameObject.addComponent(new engine.PathRenderer());

        pathRenderer.enabled = false;
        pathRenderer.layer = renderLayer.overlayLayer;
        pathRenderer.color = 0xFFFFFF.toString(16);
        pathRenderer.width = 2;

        var ts = engine.config.tileSize;

        var p0 = new Float32Array([-ts / 2, 0, -ts / 2]),
            p1 = new Float32Array([-ts / 2, 0, ts / 2]),
            p2 = new Float32Array([ts / 2, 0, ts / 2]),
            p3 = new Float32Array([ts / 2, 0, -ts / 2]);

        pathRenderer.points = [p0, p1, p2, p3];
    };

    ToolScript.prototype.setTile = function (tile, color) {
        this.gameObject.pathRenderer.enabled = true;

        //TODO colors are no more passed as HEX
        this.gameObject.pathRenderer.color = (color || 0xFFFFFF).toString(16);

        var pos = tile.gameObject.transform.getPosition(vec3Buffer1),
            points = this.gameObject.pathRenderer.points,
            zStep = engine.config.tileZStep;

        this.gameObject.transform.setPosition(pos[0], pos[1], pos[2]);

        if (tile.type === 0) {
            points[0][1] = 0;
            points[1][1] = 0;
            points[2][1] = 0;
            points[3][1] = 0;
        } else {
            points[0][1] = (tile.gridPoints[3] - tile.z) * zStep;
            points[1][1] = (tile.gridPoints[0] - tile.z) * zStep;
            points[2][1] = (tile.gridPoints[1] - tile.z) * zStep;
            points[3][1] = (tile.gridPoints[2] - tile.z) * zStep;
        }
    };

    ToolScript.prototype.disable = function(){
        this.gameObject.pathRenderer.enabled = false;
    };

    return ToolScript;
})

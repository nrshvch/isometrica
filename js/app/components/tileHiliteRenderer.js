/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 07.04.14
 * Time: 13:55
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var engine = require("engine"),
        glMatrix = engine.glMatrix;

    var vec3Buffer1 = new Float32Array(3),
        mat4Buffer1 = new Float32Array(16);

    function Renderer(){
        engine.Renderer.call(this);

        var ts = vkaria.config.tileSize;
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

    Renderer.prototype.points = null;

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

        if(this.borderColor !== undefined){
            layer.strokeStyle = this.borderColor;
            layer.lineWidth = this.borderWidth;
            layer.stroke();
        }

        if(this.fillColor !== undefined){
            layer.fillStyle = this.fillColor;
            layer.fill();
        }
    };

    return Renderer;
});
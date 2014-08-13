/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 07.04.14
 * Time: 15:21
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var namespace = require("namespace");
    var Component = require("./../Component");
    var vec3Buffer1 = new Float32Array(3);
    var glMatrix = require("../vendor/gl-matrix");
    var Vec3 = glMatrix.vec3;

    namespace("Isometrica.Engine").Renderer = Renderer;

    function Renderer(){
        Component.call(this);
    }

    Renderer.prototype = Object.create(Component.prototype);

    Renderer.prototype.cullingTest = function(viewport, viewportRenderer){
        this.gameObject.transform.getPosition(vec3Buffer1);
        Vec3.transformMat4(vec3Buffer1, vec3Buffer1, viewportRenderer.V);

        return vec3Buffer1[0] <= 1 && vec3Buffer1[0] >= -1 && vec3Buffer1[1] <= 1 && vec3Buffer1[1] >= -1;
    };

    Renderer.prototype.render = function(layer,viewportRenderer,viewport){
        this.gameObject.transform.getPosition(vec3Buffer1);
        Vec3.transformMat4(vec3Buffer1, vec3Buffer1, viewportRenderer.V);

        glMatrix.vec3.transformMat4(vec3Buffer1, this.gameObject.transform.getPosition(vec3Buffer1), viewportRenderer.M);

        layer.font = "normal 12px arial";
        layer.fillStyle = "red"
        layer.textAlign = "center";
        layer.textBaseline = "middle";
        layer.fillText("EMPTY RENDERER", vec3Buffer1[0], vec3Buffer1[1]);
    };
    Renderer.prototype.layer = 0;

    Renderer.prototype.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.renderer = this;
    };

    Renderer.prototype.unsetGameObject = function(){
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    };

    return Renderer;
});
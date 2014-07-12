/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 07.04.14
 * Time: 15:21
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var Component = require("./../Component");
    var vec3Buffer1 = new Float32Array(3);
    var glMatrix = require("../lib/gl-matrix");
    var Vec3 = glMatrix.vec3;

    function Renderer(){
        Component.call(this);
    }

    Renderer.prototype = Object.create(Component.prototype);

    Renderer.prototype.cullingTest = function(viewport, viewportRenderer){
        this.gameObject.transform.getPosition(vec3Buffer1);
        Vec3.transformMat4(vec3Buffer1, vec3Buffer1, viewportRenderer.V);

        return vec3Buffer1[0] <= 1 && vec3Buffer1[0] >= -1 && vec3Buffer1[1] <= 1 && vec3Buffer1[1] >= -1;
    };

    Renderer.prototype.render = null;
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
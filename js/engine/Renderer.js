/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 07.04.14
 * Time: 15:21
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var Component = require("./Component");

    function Renderer(){
        Component.call(this);
    }

    Renderer.prototype = Object.create(Component.prototype);

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
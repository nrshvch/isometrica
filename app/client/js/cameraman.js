define(function(require){
    var Engine = require("engine/main");
    var CameraScript = require("./components/camerascript");

   function CameraMan(root){
        this.root = root;
   }

    CameraMan.prototype._main = null;

    CameraMan.prototype.mainCamera = function(){
        if(this._main !== null)
            return this._main;

        var c = new engine.Camera("mainCamera");
        c.addComponent(new CameraScript());

        this._main = c;

        this.root.game.scene.addGameObject(c);

        return c;
    };

    CameraMan.prototype.createCamera = function(){
        var c = new Engine.Camera();
        var t = c.getComponent(Engine.TransformComponent);
        t.rotate(30, 45, 0, "self");

        this.root.game.scene.addGameObject(c);

        return c;
    };

    return CameraMan;
});
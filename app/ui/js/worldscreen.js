define(function (require) {
    var WorldScreenView = require("./views/worldscreenview");
    var Events = require("events");


    function WorldScreen(ui, client) {
        this.ui = ui;
        this.view = new WorldScreenView({
            controller: this
        });
        this.init(client);
    }

    WorldScreen.prototype.view = null;

    WorldScreen.prototype.init = function (client) {
        var cnv = this.view.getCanvas().get(0);
        var cam = client.camera;
        var viewport = client.game.graphics.createViewport(cnv);
        viewport.setCamera(cam);
        this.viewport = viewport;
    };

    WorldScreen.prototype.updateSize = function(){
        var cnv = this.view.getCanvas().get(0);
        this.viewport.setSize(cnv.offsetWidth, cnv.offsetHeight);
    };

    WorldScreen.prototype.show = function(name){
        switch(name){
            case "build":
                this.view.showBuildButtons();
                break;
            default:
                this.view.showMainButtons();
        }
    };

    return WorldScreen;
});

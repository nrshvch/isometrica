define(function (require) {
    var WorldScreenView = require("./views/worldscreenview");
    var Events = require("events");


    function WorldScreen(ui) {
        this.ui = ui;
        this.view = new WorldScreenView({
            controller: this
        });
    }

    WorldScreen.prototype.view = null;

    WorldScreen.prototype.init = function () {
        var ui = this.ui;
        var cnv = this.view.getCanvas().get(0);
        var cam = ui.gameClient.camera;
        var viewport = ui.gameClient.game.graphics.createViewport(cnv);
        viewport.setCamera(cam);

        viewport.setSize(cnv.offsetWidth, cnv.offsetHeight);
    };

    WorldScreen.prototype.show = function(name){
        switch(name){
            case "main":
                this.view.showMainButtons();
        }
    };

    return WorldScreen;
});

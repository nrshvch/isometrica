define(function (require) {
    var WorldScreenView = require("./views/worldscreenview");
    var Controls = require("./worldaction");

    function WorldScreen(ui, client) {
        this.ui = ui;
        this.view = new WorldScreenView({
            controller: this
        });
        this.client = client;
        this.init(client);

        window.worldScreen = this;
    }

    WorldScreen.prototype.view = null;

    WorldScreen.prototype.init = function (client) {
        var cnv = this.view.getCanvas();
        var cam = client.camera;
        var viewport = client.game.graphics.createViewport(cnv);
        viewport.setCamera(cam);
        this.viewport = viewport;
    };

    WorldScreen.prototype.updateSize = function () {
        var cnv = this.view.getCanvas();
        this.viewport.setSize(cnv.offsetWidth, cnv.offsetHeight);
    };

    WorldScreen.prototype.show = function (name) {
        switch (name) {
            case "build":
                this.view.showBuildButtons();
                break;
            default:
                this.view.showMainButtons();
        }
    };

    WorldScreen.prototype.showControls = function (controls) {
        if (controls === undefined)
            controls = new Controls();

        this.view.showActionButtons(controls);

        return controls;
    };



    WorldScreen.prototype.showHint = function(text){
        this.view.hint(text);
    };

    WorldScreen.prototype.hideHint = function(){
        this.view.hint("");
    };

    return WorldScreen;
});

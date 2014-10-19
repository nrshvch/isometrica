define(function (require) {
    var View = require("./views/gamescreenview");
    var TopBar = require("ui/modules/topbar/js/main");
    var WorldScreen = require("ui/modules/world/js/main");
    var Catalogue = require("ui/modules/catalogue/js/main");
    var Prompt = require("ui/modules/prompt/main");

    function GameScreen(ui) {
        this.ui = ui;

        this.view = new View({
            controller: this
        });

        this.view.head(this.topBar().view);
    }

    GameScreen.prototype.init = function (callback) {
        if (this.ready === true)
            callback(this);
        else {
            var self = this;
            this.ui.game(function (core, client) {
                self.ready = true;
                self.client = client;
                //loads assets
                client.prepare(function () {
                    core.start();
                    client.start();
                    callback(self);
                    client.startServices();
                });
            });
        }
    };

    GameScreen.prototype.view = null;

    GameScreen.prototype.worldScreen = function () {
        return this._worldScreen || (this._worldScreen = new WorldScreen(this.ui, this.client));
    };

    GameScreen.prototype.topBar = function () {
        return this._topBar || (this._topBar = new TopBar(this.ui));
    };

    GameScreen.prototype.catalogue = function () {
        return this._catalogue || (this._catalogue = new Catalogue(this));
    };

    GameScreen.prototype.prompt = function () {
        return this._prompt || (this._prompt = new Prompt(this));
    };

    GameScreen.prototype.show = function (name, args) {
        switch (name) {
            case "world":
                var vs = this.worldScreen();
                this.view.body(vs.view);
                vs.updateSize();
                break;
            case "catalogue":
                var catalogue = this.catalogue();
                var view = catalogue.execute.apply(catalogue, args);
                this.view.body(view);
                return catalogue;
                break;
            case "category":
                this.view.body(this.buildingCategory());
                return this.buildingCategory();
        }
    };

    GameScreen.prototype.showPrompt = function (message, callback, placeholder) {
        var view = this.prompt().open(message, placeholder, callback);
        this.view.body(view.render());
    };

    GameScreen.prototype.execute = function (module, args) {
        switch (module) {
            case "world":
                this.init(function (gs) {
                    gs.show("world");
                    var world = gs.worldScreen();
                    world.show.apply(world, args);
                });
                break;
            case "catalogue":
                this.init(function (gs) {
                    gs.show("catalogue", args);
                });
                break;
            case "build":
                this.init(function (gs) {
                    gs.show("world");
                    gs.client.buildman.build(args[0]);
                    //gs.worldScreen().show("build");
                    //gs.client.tools.selectTool(ToolCode.builder).setBuilding(args[0]);
                });
                break;
        }

    };

    GameScreen.prototype.showActionControls = function(){
         return this.worldScreen().showControls();
    };

    GameScreen.prototype.showWorld = function(){
        this.show("world");
        this.worldScreen().show();
    };

    return GameScreen;
});

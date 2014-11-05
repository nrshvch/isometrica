define(function (require) {
    var View = require("./views/gamescreenview");
    var TopBar = require("ui/modules/topbar/js/main");
    var WorldScreen = require("ui/modules/world/js/main");
    var Catalogue = require("ui/modules/catalogue/js/catalogue");
    var Prompt = require("ui/modules/prompt/prompt");
    var City = require("ui/modules/city/js/city");
    var Events = require("events");

    function GameScreen(ui) {
        this.ui = ui;

        this.onReady = Events.event("ready");

        this.view = new View({
            controller: this
        });

        this.onReady().on(function(s,a,d){
            d.client.core.cities.onNewCity().on(function(citysrv, city){

                d.view.head(d.topBar().view);
            });
        }, this);
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
                    self.onReady(this, null);
                });
            });
        }
    };

    GameScreen.prototype.view = null;

    GameScreen.prototype.worldScreen = function () {
        return this._worldScreen || (this._worldScreen = new WorldScreen(this.ui, this.client));
    };

    GameScreen.prototype.topBar = function () {
        return this._topBar || (this._topBar = new TopBar(this));
    };

    GameScreen.prototype.catalogue = function () {
        return this._catalogue || (this._catalogue = new Catalogue(this));
    };

    GameScreen.prototype.prompt = function () {
        return this._prompt || (this._prompt = new Prompt(this));
    };

    GameScreen.prototype.city = function(){
        return this._city || (this._city = new City(this));
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
            case "city":
                var city = this.city();
                var view = city.execute.apply(city, args);
                if(view) {
                    this.view.body(view);
                    return city;
                }
        }
    };

    GameScreen.prototype.showPrompt = function (message, callback, placeholder) {
        var view = this.prompt().open(message, placeholder, callback);
        this.view.body(view.render());
    };

    GameScreen.prototype.execute = function (module, args) {
        this.init(function (gs) {
            switch (module) {
                case "world":
                    gs.show("world");
                    var world = gs.worldScreen();
                    world.show.apply(world, args);
                    break;
                case "catalogue":
                    gs.show("catalogue", args);
                    break;
                case "build":
                    gs.show("world");
                    gs.client.buildman.build(args[0]);
                    //gs.worldScreen().show("build");
                    //gs.client.tools.selectTool(ToolCode.builder).setBuilding(args[0]);
                    break;
                case "destroy":
                    gs.show("world");
                    gs.client.buildman.destroy();
                    break;
                case "city":
                    gs.show("city", args);
                    break;
            }
        });
    };

    GameScreen.prototype.showActionControls = function () {
        return this.worldScreen().showControls();
    };

    GameScreen.prototype.showWorld = function () {
        this.show("world");
        this.worldScreen().show();
    };

    return GameScreen;
});

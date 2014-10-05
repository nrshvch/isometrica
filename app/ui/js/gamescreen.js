define(function (require) {
    var View = require("./views/gamescreenview");
    var TopBar = require("./topbar");
    var WorldScreen = require("./worldscreen");
    var BuildingsWindow = require("./buildingswindow");

    function GameScreen(ui) {
        this.ui = ui;

        this.view = new View({
            controller: this
        });

        this.view.head(this.topBar().view);
    }

    GameScreen.prototype.view = null;

    GameScreen.prototype.init = function () {
        var self = this;
        this.ui.startGame(function () {
            self.worldScreen().init();
        });
    };

    GameScreen.prototype.worldScreen = function () {
        return this._worldScreen || (this._worldScreen = new WorldScreen(this.ui));
    };

    GameScreen.prototype.topBar = function () {
        return this._topBar || (this._topBar = new TopBar(this.ui));
    };

    GameScreen.prototype.buildingsWindow = function () {
        return this._buildingsWin || (this._buildingsWin = new BuildingsWindow(this.ui));
    };

    GameScreen.prototype.show = function (name) {
        switch (name) {
            case "world":
                this.view.body(this.worldScreen().view);
                return this.worldScreen();
                break;
            case "buildings":
                this.view.body(this.buildingsWindow().view);
                return this.buildingsWindow();
                break;
        }
    };

    return GameScreen;
});

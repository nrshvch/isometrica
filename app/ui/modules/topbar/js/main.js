define(function (require) {
    var View = require("./views/topbarview");

    function TopBar(game) {
        this.app = game;
        this.ui = game.ui;
        this.view = new View({
            app: game,
            ui: game.ui
        });
    }

    TopBar.prototype.view = null;

    return TopBar;
});

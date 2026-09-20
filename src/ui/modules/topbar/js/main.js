import View from "./views/topbarview";

function TopBar(game) {
    this.app = game;
    this.ui = game.ui;
    this.view = new View({
        app: game,
        ui: game.ui
    });
}

TopBar.prototype.view = null;

export default TopBar;

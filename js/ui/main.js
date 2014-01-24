define(function (require) {
    require("backbone");
    
    function UIManager(){
        var GameView = require("./gameview");
        this.gameView = new GameView();
    }

    UIManager.prototype.start = function(){
        document.getElementById("ui").appendChild(this.gameView.el);
        this.gameView.start();
    };

    return UIManager;
});
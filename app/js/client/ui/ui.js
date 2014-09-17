define(function (require) {
    var GameView = require("./gameview");
    var PromptView = require("./views/promptview");
    
    function UIManager(root){
        this.root = root;
        this.view = null;
    }

    UIManager.prototype.start = function(){
        var gameView = this.view = new GameView({
            ui: this
        });
        document.getElementById("root").appendChild(gameView.el);
        gameView.start();
    };

    UIManager.prototype.showPrompt = function(text, val, action){
        this.view.openWindow(new PromptView({
            mainView: this.view,
            message: text,
            placeholder: "",
            value: val,
            callback: action
        }), "Input");
    };

    return UIManager;
});
define(function (require) {
    var MainRouter = require("./routers/mainrouter");
    var GameScreen = require("./gamescreen");
    var $ = require("jquery");
    var Events = require("events");
    var Core = require("core");
    var Client = require("client");

    var events = {
        ready: 0,
    };

    function UIManager() {
        this.rootNode = $(".game-ui");

        this.router = new MainRouter({
            ui: this
        });

        Backbone.history.start();
    }

    UIManager.events = events;

    UIManager.prototype._gameScreen = null;

    UIManager.prototype.startGame = function (callback) {
        this.gameCore = new Core.Logic();
        this.gameClient = new Client.Vkaria(this.gameCore, this, callback);
    };

    UIManager.prototype.gameScreen = function () {
        return this._gameScreen || (this._gameScreen = new GameScreen(this));
    };

    UIManager.prototype.log = function (val) {
        console.log(val);
    };

    UIManager.prototype.show = function(name){
        this.rootNode.empty();

        switch(name){
            case "game":
                var gs = this.gameScreen();
                this.rootNode.append(gs.view.el);
                gs.init();
                return gs;
                break;
        }
    };

    /*
     UIManager.prototype.showPrompt = function(text, val, action){
     this.view.openWindow(new PromptView({
     mainView: this.view,
     message: text,
     placeholder: "",
     value: val,
     callback: action
     }), "Input");
     };
     */
    return UIManager;
});

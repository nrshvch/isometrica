define(function (require) {
    var GameView = require("./views/gameview");
    var PromptView = require("./views/promptview");
    var $ = require("jquery");
    var Events = require("events");

    var events = {
        ready: 0,
    };

    function UIManager(root){
        this.root = root;
        this.view = null;
    }

    UIManager.events = events;

    UIManager.prototype.start = function(){
        var gameView = this.view = new GameView({
            ui: this
        });

        $(document.body).append(gameView.el);

        Events.fire(this, events.ready, true);
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
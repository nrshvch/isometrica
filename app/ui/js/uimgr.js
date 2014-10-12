define(function (require) {
    var MainRouter = require("./routers/mainrouter");
    var GameScreen = require("./gamescreen");
    var $ = require("jquery");
    var Events = require("events");

    var events = {
        ready: 0
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

    UIManager.prototype.game = function (callback) {
        var self = this;
        if(this._core && this._client){
            callback(this._core, this._client);
            return;
        }
        requirejs(["client/main"], function(Vkaria) {
            var Vkaria = Vkaria.Vkaria;
            var Core = Isometrica.Core;
            var core = self._core = new Core.Logic();
            var client = self._client = new Vkaria(core, self);

            core.start();
            client.run(function(){
                callback(core, client);
            });
        });
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
                this.rootNode.append(this.gameScreen().view.el);
                break;
        }
    };

    UIManager.prototype.back = function(){
        window.history.back();
    };

    UIManager.prototype.navigate = function(uri){
        this.router.navigate(uri, {
            trigger: true
        });
    };

    return UIManager;
});

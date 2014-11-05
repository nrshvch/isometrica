define(function (require) {
    var Config = require("./config");
    var MainRouter = require("./mainrouter");
    var SplashScreen = require("../modules/splash/js/main");
    var GameScreen = require("../modules/gamescreen/js/gamescreen");
    var $ = require("jquery");

    var events = {
        ready: 0
    };

    function UIManager() {
        this.rootNode = $(".game-ui");
    }

    UIManager.events = events;

    UIManager.prototype._gameScreen = null;

    UIManager.prototype.init = function () {
        //console.log("HAPPEN NOTHING!");
        //return;
        var self = this;
        var f = function () {
            self.router = new MainRouter({
                ui: self
            });

            Backbone.history.start();
        };

        if(typeof SHOW_SPLASH !== "undefined" && SHOW_SPLASH === false) {
            f();
        }else{
            this.show("splash");
            setTimeout(f, Config.splashTime);
        }
    };

    UIManager.prototype.game = function (callback) {
        var self = this;
        if (this._core && this._client) {
            callback(this._core, this._client);
            return;
        }
        requirejs(["client/main"], function (Vkaria) {
            var Vkaria = Vkaria.Vkaria;
            var Core = Isometrica.Core;
            var core = self._core = new Core.Logic();
            var client = self._client = new Vkaria(core, self);
            callback(core, client);
        });
    };

    UIManager.prototype.core = function () {
        return this._core || null;
    };

    UIManager.prototype.client = function () {
        return this._client || null;
    };

    UIManager.prototype.gameScreen = function () {
        return this._gameScreen || (this._gameScreen = new GameScreen(this));
    };

    UIManager.prototype.splashScreen = function () {
        return this._splashScreen || (this._splashScreen = new SplashScreen(this));
    };

    UIManager.prototype.log = function (val) {
        console.log(val);
    };

    UIManager.prototype.show = function (name) {
        this.rootNode.empty();

        switch (name) {
            case "game":
                this.rootNode.append(this.gameScreen().view.el);
                break;
            case "splash":
                this.rootNode.append(this.splashScreen().show().el)
        }
    };

    UIManager.prototype.back = function () {
        window.history.back();
    };

    UIManager.prototype.navigate = function (uri, trigger) {
        this.router.navigate(uri, {
            trigger: trigger === undefined ? true : trigger
        });
    };

    return UIManager;
});

import Config from "./config";
import MainRouter from "./mainrouter";
import SplashScreen from "../modules/splash/js/main";
import GameScreen from "../modules/gamescreen/js/gamescreen";
import $ from "jquery";
import Backbone from "backbone";

// Under RequireJS, Backbone's AMD branch always received jQuery and wired
// Backbone.$ itself. Vite's CJS interop takes Backbone's plain CommonJS
// branch instead, which leaves Backbone.$ unset, so views can't render.
Backbone.$ = $;

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
    Promise.all([import("client/main"), import("core/main")]).then(function (modules) {
        var Vkaria = modules[0].default.Vkaria;
        var Core = modules[1].default;
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

export default UIManager;

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
UIManager.prototype._cityId = null;

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

/**
 * The city the game is playing, by its six character id. Read off the url on
 * start up, and set to whatever the game actually opened once it knows.
 *
 * @param [value] {string|null}
 * @returns {string|null}
 */
UIManager.prototype.cityId = function (value) {
    if (value !== undefined)
        this._cityId = value;

    return this._cityId || null;
};

/**
 * Puts the city in the address bar, so the tab can be bookmarked or shared,
 * without going through the router again.
 *
 * @param id {string}
 */
UIManager.prototype.showCityInUrl = function (id) {
    this.cityId(id);

    if (!this.router || !Backbone.History.started)
        return;

    //keeps the router's idea of where we are in step, so the hash below does
    //not send it round the route again
    this.router.navigate("/" + id, {trigger: false, replace: true});

    //Backbone writes the fragment back without its leading slash, and the
    //address we want to hand out is /#/pA4b1c
    window.history.replaceState(null, "", "#/" + id);
};

/**
 * Opens another city, by starting the page over on it. The world, the engine
 * and everything hanging off them are built once on the way up, so this is
 * what switching cities means - and the city being left is written out on the
 * way, the same as closing the tab.
 *
 * @param id {string|null} null opens whichever city is the active one
 */
UIManager.prototype.reopen = function (id) {
    window.location.hash = id === null ? "" : "/" + id;
    window.location.reload();
};

/**
 * Leaves the city behind and starts a new one, blank, under an id of its own.
 * The old one stays in storage, to be come back to by its own address.
 */
UIManager.prototype.startFreshCity = function () {
    var core = this.core();

    this.reopen(core === null ? null : core.persistence.newCityId());
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

UIManager.prototype.navigate = function (module, args) {
    this.show("game");
    this.gameScreen().execute(module, args);
};

export default UIManager;

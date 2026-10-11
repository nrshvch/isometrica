import View from "./views/gamescreenview";
import TopBar from "../../topbar/js/main";
import WorldScreen from "../../world/js/main";
import Prompt from "../../prompt/prompt";
import Events from "events";

function GameScreen(ui) {
  this.ui = ui;

  this.onReady = Events.event("ready");

  this.view = new View({
    controller: this,
  });

  this.onReady().on(function (s, a, d) {
    var cities = d.client.core.cities;

    //a city out of a save is already standing by the time the client is
    //ready, so the bar goes up straight away rather than waiting on an
    //event that has been and gone
    if (cities.getCities().length > 0) showTopBar(d);

    cities.onNewCity().on(function (citysrv, city) {
      showTopBar(d);
    });
  }, this);
}

/**
 * The bar takes a slice off the top of the screen, so the world below it is
 * suddenly smaller than the canvas it was measured for - it has to be told,
 * or the view stays stretched until something else resizes it and the whole
 * picture jumps.
 */
function showTopBar(gameScreen) {
  gameScreen.view.head(gameScreen.topBar().view);
  gameScreen.worldScreen().updateSize();
}

GameScreen.prototype.init = function (callback) {
  if (this.ready === true) callback(this);
  else {
    var self = this;
    this.ui.game(function (core, client) {
      self.ready = true;
      self.client = client;
      //loads assets
      client.prepare(function () {
        core.start();

        //the saved city goes into the world before the client puts
        //anything on screen, so that what is drawn is drawn once
        self.ui.showCityInUrl(core.persistence.open(self.ui.cityId()));

        client.start();
        callback(self);
        client.startServices();
        self.onReady(this, null);
      });
    });
  }
};

GameScreen.prototype.view = null;

GameScreen.prototype.worldScreen = function () {
  return (
    this._worldScreen ||
    (this._worldScreen = new WorldScreen(this.ui, this.client))
  );
};

GameScreen.prototype.topBar = function () {
  return this._topBar || (this._topBar = new TopBar(this));
};

GameScreen.prototype.prompt = function () {
  return this._prompt || (this._prompt = new Prompt(this));
};

/**
 * One of the screens of the game played (games/*): the city builder's
 * catalogue, its city screen - made the first time it is asked for.
 *
 * @param name {string}
 * @returns {Object|null} null for a screen the game has none of
 */
GameScreen.prototype.screen = function (name) {
  var screens = this.ui.played.screens || {};

  if (screens[name] === undefined) return null;

  this._screens = this._screens || {};

  return this._screens[name] || (this._screens[name] = new screens[name](this));
};

/**
 * @returns {string|null} what the body shows - "world", or one of the game's
 *                        screens, "catalogue", "city" - or null before
 *                        anything has been shown
 */
GameScreen.prototype.showing = function () {
  return this._showing || null;
};

GameScreen.prototype.show = function (name, args) {
  this._showing = name;

  if (name === "world") {
    var vs = this.worldScreen();
    this.view.body(vs.view);
    vs.updateSize();
    return;
  }

  //one of the game's own
  var screen = this.screen(name),
    view = screen !== null ? screen.execute.apply(screen, args || []) : null;

  if (view) {
    this.view.body(view);
    return screen;
  }
};

GameScreen.prototype.showPrompt = function (
  message,
  callback,
  placeholder,
  onDiscard,
) {
  var view = this.prompt().open(message, placeholder, callback, onDiscard);
  this._showing = "prompt";
  this.view.body(view.render());
};

GameScreen.prototype.execute = function (module, args) {
  var game = this.ui.played;

  this.init(function (gs) {
    if (module === "world") {
      gs.show("world");
      var world = gs.worldScreen();
      world.show.apply(world, args);
      return;
    }

    //the rest is the game's own: building, shaping the ground, buying land
    //in the city builder (games/*)
    if (game.route) game.route(gs, module, args || []);
  });
};

GameScreen.prototype.showActionControls = function () {
  return this.worldScreen().showControls();
};

GameScreen.prototype.showToolControls = function (buttons) {
  return this.worldScreen().showTools(buttons);
};

GameScreen.prototype.showWorld = function () {
  this.show("world");
  this.worldScreen().show();
};

export default GameScreen;

import WorldScreenView from "./views/worldscreenview";
import Controls from "./worldaction";
import ReactiveProperty from "reactive-property";

function WorldScreen(ui, client) {
  this.ui = ui;

  //true while an action (build, destroy, buy land...) holds the buttons,
  //so world decorations know to stay out of the way
  this.busy = ReactiveProperty(false);

  this.view = new WorldScreenView({
    controller: this,
  });
  this.client = client;
  this.init(client);

  window.worldScreen = this;
}

WorldScreen.prototype.view = null;

WorldScreen.prototype.init = function (client) {
  var cnv = this.view.getCanvas();
  var cam = client.camera;
  var viewport = client.game.graphics.createViewport(cnv);
  viewport.setCamera(cam);
  this.viewport = viewport;
};

WorldScreen.prototype.updateSize = function () {
  var cnv = this.view.getCanvas();
  this.viewport.setSize(cnv.offsetWidth, cnv.offsetHeight);
};

/**
 * The world with nothing else going on: what the game played puts over it -
 * the city builder's building tools, the courier's panel (games/*).
 *
 * @param [name] {string} which of its states, for the game to make of
 */
WorldScreen.prototype.show = function (name) {
  this.busy(false);

  var game = this.ui.played;

  if (game.showWorld) game.showWorld(this, name);
  else this.showButtons([]);
};

/**
 * Puts up the buttons along the bottom, nothing holding them.
 *
 * @param buttons {Object[]} see WorldScreenView#showToolButtons
 */
WorldScreen.prototype.showButtons = function (buttons) {
  this.view.showToolButtons(buttons);
};

/**
 * Lays el over the world, under the buttons - a game's panel of its own.
 */
WorldScreen.prototype.addOverlay = function (el) {
  this.view.addOverlay(el);
};

WorldScreen.prototype.showControls = function (controls) {
  if (controls === undefined) controls = new Controls();

  this.view.showActionButtons(controls);
  this.busy(true);

  return controls;
};

/**
 * Hands the buttons to a mode of its own, which gives them back by showing
 * the world again.
 *
 * @param buttons {Object[]} see WorldScreenView#showToolButtons
 */
WorldScreen.prototype.showTools = function (buttons) {
  this.view.showToolButtons(buttons);
  this.busy(true);
};

WorldScreen.prototype.showHint = function (text) {
  this.view.hint(text);
};

WorldScreen.prototype.hideHint = function () {
  this.view.hint("");
};

export default WorldScreen;

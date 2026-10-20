import Backbone from "backbone";
import __templateSource from "../../templates/topbar.hbs?raw";
import Handlebars from "handlebars";
import Events from "events";
import Numeral from "numeral";
import $ from "jquery";
import WorldView from "isometrica/client/view";
import CameraControl from "isometrica/client/cameracontrol";

var template = Handlebars.compile(__templateSource);

function onTimeAdvance(s, a, d) {
  d.renderTime();
}

function onCityRename(s, a, d) {
  d.renderName();
}

function onCityUpdate(s, a, d) {
  d.render();
}

var View = Backbone.View.extend({
  events: {
    //the treasury is what the city screen is mostly about - clicked
    //again, it puts it away
    "click .money": "toggleCity",
    //the sounds on and off - the music is kept quiet (isometrica client/
    //audio/soundman)
    "click .sounds": "toggleSounds",
    //the day and the night going by, or the middle of the day all the while
    //(isometrica client/lighting setDayNight)
    "click .daynight": "toggleDayNight",
    //the world from straight above, as a map, and back (isometrica client/
    //vkaria setTopView)
    "click .view": "toggleView",
    //the camera back on the city, wherever it was panned off to (isometrica
    //client/cityman locate)
    "click .locate": "locateCity",
  },
  initialize: function (options) {
    this.onDispose = Events.event("dispose");

    this.options = options || {};

    this.setElement(template());

    this.city = options.app.client.player.city();

    this.time = options.app.client.core.time;

    //the money the game played shows instead of the city's, if any - the
    //courier's (games/*)
    var game = options.ui.played;

    this.purse = game.purse ? game.purse(options.app.client) : null;

    var tmTkn = Events.on(
      this.time,
      this.time.constructor.events.advance,
      onTimeAdvance,
      this,
    );

    var rnmTkn = this.city.rename().on(onCityRename, this);

    var updTkn = this.city.update().on(onCityUpdate, this);

    var self = this,
      sound = options.app.client.sound,
      lighting = options.app.client.lighting,
      unwatch =
        this.purse === null
          ? null
          : this.purse.watch(function () {
              self.render();
            });

    if (sound)
      sound.onChange(function () {
        self.renderSound();
      });

    if (lighting)
      lighting.onDayNight(function () {
        self.renderDayNight();
      });

    //from above or from the side, however it was switched - here, or by its
    //key
    var viewTkn = Events.on(WorldView, WorldView.events.change, function () {
      self.renderView();
    });

    //the zoom the camera is at, whenever it moves or zooms
    var camera = options.app.client.camera && options.app.client.camera.camera,
      onCamera = function () {
        self.renderZoom();
      };

    if (camera) camera.addEventListener(camera.events.update, onCamera);

    this.onDispose().once(function (s, a, self) {
      Events.off(WorldView, WorldView.events.change, viewTkn);
      Events.off(self.time, self.time.constructor.events.advance, tmTkn);
      self.city.rename().off(rnmTkn);
      self.city.update().off(updTkn);
      if (unwatch !== null) unwatch();
      if (camera) camera.removeEventListener(camera.events.update, onCamera);
    }, this);

    //render all
    this.render();
  },
  renderTime: function () {
    //and the weather, after the time, when it says what it is (client/
    //weather)
    var lighting = window.vkaria && window.vkaria.lighting,
      weather = lighting && lighting.weather;

    $(".time", this.$el).text(
      this.time.toHM() + (weather && weather.name ? "  " + weather.name : ""),
    );
    return this;
  },
  renderMoney: function () {
    if (this.purse !== null) {
      $(".money", this.$el).text(this.purse.text());
      return;
    }

    var money =
      this.city.resources.getResources()[Isometrica.Core.ResourceCode.money];
    $(".money", this.$el).text("$" + Numeral(money).format("0,0"));
  },
  renderSound: function () {
    var sound = this.options.app.client.sound,
      sounds = !!(sound && sound.wants.sounds);

    $(".sounds", this.$el)
      .text(sounds ? "\u266b on" : "\u266b off")
      .toggleClass("off", !sounds);
  },
  renderDayNight: function () {
    var lighting = this.options.app.client.lighting,
      on = !!(lighting && lighting.dayNight);

    $(".daynight", this.$el).toggleClass("off", !on);
  },
  toggleDayNight: function () {
    var lighting = this.options.app.client.lighting;

    if (lighting) lighting.setDayNight();
  },
  renderView: function () {
    var top = WorldView.top();

    $(".view", this.$el).text("\u25a6 top").toggleClass("off", !top);
  },
  toggleView: function () {
    var client = this.options.app.client;

    if (client.setTopView) client.setTopView(!WorldView.top());
  },
  locateCity: function () {
    var cityman = this.options.app.client.cityman;

    //gliding there, rather than jumping
    if (cityman) cityman.locate(this.city, true);
  },
  renderZoom: function () {
    var client = this.options.app.client,
      camera = client.camera && client.camera.camera,
      turner = client.cameraControl && client.cameraControl.turner;

    if (!camera) return;

    //while the world turns, the zoom it turns at - the camera is zoomed out
    //meanwhile for pictures of it (isometrica client/turner) - as its step,
    //1x the furthest out to 5x the closest in (isometrica client/
    //cameracontrol ZOOMS)
    var zoom = turner && turner.active ? turner.zoom : camera.zoom,
      text = CameraControl.zoomStep(zoom) + "x";

    if (text !== this.zoomText) {
      this.zoomText = text;
      $(".zoom", this.$el).text(text);
    }
  },
  //from the click itself, so that a phone lets them play
  toggleSounds: function () {
    var sound = this.options.app.client.sound;

    if (sound) sound.toggle("sounds");
  },
  toggleCity: function () {
    //whatever the game played makes of it - the city builder opens the
    //city screen (games/*)
    var game = this.options.ui.played;

    if (game.moneyClick) game.moneyClick(this.options.app, this.city);
  },
  render: function () {
    this.renderTime();
    this.renderMoney();
    this.renderSound();
    this.renderDayNight();
    this.renderView();
    this.renderZoom();
  },
  dispose: function () {
    this.onDispose(this, null);
  },
});

export default View;

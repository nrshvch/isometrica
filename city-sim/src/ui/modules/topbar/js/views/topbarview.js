import Backbone from "backbone";
import __templateSource from "../../templates/topbar.hbs?raw";
import Handlebars from "handlebars";
import Events from "events";
import Numeral from "numeral";
import $ from "jquery";

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
    //the music and the sounds, each on and off (isometrica client/audio/
    //soundman)
    "click .music": "toggleMusic",
    "click .sounds": "toggleSounds",
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

    this.onDispose().once(function (s, a, self) {
      Events.off(self.time, self.time.constructor.events.advance, tmTkn);
      self.city.rename().off(rnmTkn);
      self.city.update().off(updTkn);
      if (unwatch !== null) unwatch();
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
      music = !!(sound && sound.wants.music),
      sounds = !!(sound && sound.wants.sounds);

    $(".music", this.$el)
      .text(music ? "\u266b on" : "\u266b off")
      .toggleClass("off", !music);
    $(".sounds", this.$el)
      .text(sounds ? "fx on" : "fx off")
      .toggleClass("off", !sounds);
  },
  //from the click itself, so that a phone lets it play
  toggleMusic: function () {
    var sound = this.options.app.client.sound;

    if (sound) sound.toggle("music");
  },
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
  },
  dispose: function () {
    this.onDispose(this, null);
  },
});

export default View;

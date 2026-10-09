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
  },
  initialize: function (options) {
    this.onDispose = Events.event("dispose");

    this.options = options || {};

    this.setElement(template());

    this.city = options.app.client.player.city();

    this.time = options.app.client.core.time;

    //the delivery game shows the courier's money rather than the city's
    this.deliveryman = options.ui.editMode
      ? null
      : options.app.client.deliveryman;

    var tmTkn = Events.on(
      this.time,
      this.time.constructor.events.advance,
      onTimeAdvance,
      this,
    );

    var rnmTkn = this.city.rename().on(onCityRename, this);

    var updTkn = this.city.update().on(onCityUpdate, this);

    var dlvTkn =
      this.deliveryman === null
        ? null
        : Events.on(
            this.deliveryman,
            this.deliveryman.events.change,
            onCityUpdate,
            this,
          );

    this.onDispose().once(function (s, a, self) {
      Events.off(self.time, self.time.constructor.events.advance, tmTkn);
      self.city.rename().off(rnmTkn);
      self.city.update().off(updTkn);
      if (dlvTkn !== null)
        Events.off(self.deliveryman, self.deliveryman.events.change, dlvTkn);
    }, this);

    //render all
    this.render();
  },
  renderTime: function () {
    $(".time", this.$el).text(this.time.toHM());
    return this;
  },
  renderMoney: function () {
    var courier = this.deliveryman === null ? null : this.deliveryman.courier;

    if (this.deliveryman !== null) {
      $(".money", this.$el).text(
        "$" + Numeral(courier === null ? 0 : courier.money()).format("0,0.00"),
      );
      return;
    }

    var money =
      this.city.resources.getResources()[Isometrica.Core.ResourceCode.money];
    $(".money", this.$el).text("$" + Numeral(money).format("0,0"));
  },
  toggleCity: function () {
    //nothing of the city's to look at in the delivery game
    if (this.deliveryman !== null) return;

    if (this.options.app.showing() === "city") {
      this.options.ui.navigate("world");
      return;
    }

    //an action owns the world while it runs - opening the city screen from
    //under it would leave the action with no buttons and no way to finish
    if (this.options.app.worldScreen().busy()) return;

    this.options.ui.navigate("city", [this.city.id()]);
  },
  render: function () {
    this.renderTime();
    this.renderMoney();
  },
  dispose: function () {
    this.onDispose(this, null);
  },
});

export default View;

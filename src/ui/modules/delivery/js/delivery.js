/**
 * The courier's panel over the world: the board of orders to pick from while
 * the car stands free, and the order on - where to, what, how far along, and
 * the money to collect once it is handed over.
 *
 * What it shows moves on as the car drives and the clock goes round
 * (client/delivery/courier), so it is looked at a few times a second: the
 * bar and the times are moved along in place, and the whole of it drawn
 * again only when there is something else to show.
 *
 * When the car breaks down, a button goes up over it to call somebody out to
 * fix it (client/delivery Deliveryman#fix) - kept over the car every frame
 * while it is up.
 */
import Backbone from "backbone";
import Handlebars from "handlebars";
import Numeral from "numeral";
import Events from "events";
import $ from "jquery";
import __templateSource from "../templates/panel.hbs?raw";

var template = Handlebars.compile(__templateSource);

//how often what is shown is moved along, ms
var EVERY = 250;

/**
 * A stretch of time, as it is shown: 0:45, 12:05, 1:02:30.
 */
function duration(ms) {
  var s = Math.max(0, Math.ceil(ms / 1000)),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = s % 60,
    two = function (n) {
      return (n < 10 ? "0" : "") + n;
    };

  return h > 0 ? h + ":" + two(m) + ":" + two(ss) : m + ":" + two(ss);
}

function money(amount) {
  return "$" + Numeral(amount).format("0,0.00");
}

function itemsText(items) {
  return items
    .map(function (item) {
      return (item.qty > 1 ? item.qty + "× " : "") + item.name;
    })
    .join(", ");
}

var PHASES = {
  toRestaurant: function (order) {
    return "Driving to " + order.pickup.name;
  },
  atRestaurant: function (order, status) {
    return status.loading ? "Loading the order" : "Waiting for the food";
  },
  toCustomer: function (order) {
    return "Delivering to " + order.dropoff.name;
  },
  atDoor: function () {
    return "Handing it over";
  },
  delivered: function () {
    return "Delivered!";
  },
};

var View = Backbone.View.extend({
  events: {
    "click .take": "take",
    "click .collect": "collect",
    "click .fix": "fix",
  },

  initialize: function (options) {
    this.controller = options.controller;
    //what was drawn last, so it is drawn again only once it changes
    this.drawn = null;
    this.setElement($("<div class='delivery-slot'></div>"));
  },

  man: function () {
    return this.controller.client.deliveryman;
  },

  /**
   * What is to be shown, in so many words: when it is the same as what was
   * drawn, nothing needs drawing again.
   */
  what: function (status) {
    var man = this.man();

    if (man.courier === null) return "starting";
    if (!man.available()) return "unavailable";
    if (status.order === null) return "board:" + man.courier.boardAt();

    return "order:" + status.order.id + ":" + (status.phase === "delivered");
  },

  render: function () {
    var man = this.man(),
      status = man.courier === null ? null : man.status(),
      what = status === null ? "starting" : this.what(status);

    this.drawn = what;

    if (what === "starting") {
      this.$el.empty();
      return this;
    }

    var courier = man.courier,
      context = {
        unavailable: what === "unavailable",
        board: what.indexOf("board:") === 0,
        active: what.indexOf("order:") === 0,
        deliveries: courier.state.deliveries,
        earnedText: money(courier.state.earned),
      };

    if (context.board)
      context.offers = courier.offers().map(function (offer) {
        return $.extend({}, offer, {
          itemsText: itemsText(offer.items),
          //on empty roads: the traffic will have its say
          timeText: "~" + duration(offer.estimate),
          payText: money(offer.pay),
        });
      });

    if (context.active) {
      var order = status.order,
        t = status.times;

      context.order = $.extend({}, order, {
        itemsText: itemsText(order.items),
        payText: money(order.pay),
      });
      //where on the bar the food is picked up
      context.pickupAt = ((t.leave - t.taken) / (t.delivered - t.taken)) * 100;
    }

    this.$el.html(template(context));
    this.tick();

    return this;
  },

  /**
   * Moves what is shown along, and draws it all again when there is
   * something else to show.
   */
  tick: function () {
    var man = this.man();

    if (man.courier === null) return;

    var status = man.status(),
      now = Date.now();

    //the car is kept in sight above the panel, in the middle of what is left
    //of the screen
    man.raise = this.el.offsetHeight > 0 ? this.el.offsetHeight / 2 + 6 : 0;

    if (this.what(status) !== this.drawn) {
      this.render();
      return;
    }

    if (status.order === null) {
      $(".board-left", this.$el).text(
        duration(man.courier.boardAt() + man.boardTTL() - now),
      );
      return;
    }

    var order = status.order,
      delivered = status.phase === "delivered",
      broken = status.broken;

    $(".phase", this.$el).text(
      broken !== null
        ? broken.fixing
          ? "Getting the car going…"
          : "Broken down!"
        : PHASES[status.phase](order, status),
    );
    $(".breakdown", this.$el).toggle(broken !== null);
    if (broken !== null)
      $(".breakdown .when", this.$el).text(
        (broken.fixing ? "going in " : "going again by itself in ") +
          duration(broken.left),
      );
    $(".breakdown .fix", this.$el).toggle(broken !== null && !broken.fixing);
    $(".bar .fill", this.$el).css("width", status.done * 100 + "%");
    $(".left", this.$el).text(
      delivered ? "" : "~" + duration(status.left) + " to go",
    );
    var phase = status.phase,
      pickingUp = phase === "toRestaurant" || phase === "atRestaurant",
      t = status.times;

    //at the restaurant: the food cooking, then loading it
    $(".stop.pickup .when", this.$el).text(
      !pickingUp
        ? "✓ picked up"
        : status.loading
          ? "loading…"
          : status.readyIn > 0
            ? "ready in " + duration(status.readyIn)
            : "ready",
    );
    $(".stop.pickup .mini .fill", this.$el).css(
      "width",
      (pickingUp && status.loading ? status.step : status.cooked) * 100 + "%",
    );
    $(".stop.pickup .mini", this.$el).toggleClass(
      "loading",
      pickingUp && status.loading,
    );

    //at the customer's: the drive over, then handing it over
    $(".stop.dropoff .when", this.$el).text(
      phase === "toCustomer"
        ? "in ~" + duration(t.arriveCustomer - now)
        : phase === "atDoor"
          ? "handing over…"
          : delivered
            ? "✓ delivered"
            : "",
    );
    $(".stop.dropoff .mini .fill", this.$el).css(
      "width",
      (pickingUp ? 0 : delivered ? 1 : status.step) * 100 + "%",
    );
    $(".stop.dropoff .mini", this.$el).toggleClass(
      "loading",
      phase === "atDoor",
    );
    $(".stop.pickup", this.$el).toggleClass(
      "now",
      status.phase === "toRestaurant" || status.phase === "atRestaurant",
    );
    $(".stop.dropoff", this.$el).toggleClass(
      "now",
      status.phase === "toCustomer" || status.phase === "atDoor",
    );
    $(".collect", this.$el).toggle(delivered);
    $(".delivery-card.active", this.$el).toggleClass("delivered", delivered);
  },

  take: function (e) {
    this.man().accept($(e.currentTarget).attr("data-id"));
    this.render();
  },

  collect: function () {
    this.man().collect();
    this.render();
  },

  fix: function () {
    this.man().fix();
    this.tick();
  },
});

/**
 * The button over the car broken down, to call somebody out to it - kept
 * over the car as it is drawn, while it is broken down and nobody is called.
 */
function FixPopup(view) {
  var self = this;

  this.view = view;
  this.$el = $(
    "<button class='fix-popup' title='Call somebody out to fix it'>" +
      "<span class='icon'>🔧</span> Fix</button>",
  );
  //among the rest of the game's page, for its styles
  var page = $(".game-ui").first();

  this.$el.hide().appendTo(page.length > 0 ? page : document.body);
  this.$el.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    view.fix();
  });
  //the game takes the pointer going down on the canvas; this is not it
  this.$el.on("mousedown touchstart", function (e) {
    e.stopPropagation();
  });

  function frame() {
    self.place();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

FixPopup.prototype.place = function () {
  var man = this.view.man(),
    courier = man.courier,
    b = courier !== null ? courier.breakdown() : null,
    at = b !== null && !b.fixing ? man.carOnPage() : null;

  if (at === null || document.hidden) {
    this.$el.hide();
    return;
  }

  this.$el.show().css({
    left: Math.round(at.x) + "px",
    top: Math.round(at.y - 34) + "px",
  });
};

/**
 * @param client {Vkaria}
 */
function DeliveryPanel(client) {
  var self = this;

  this.client = client;
  this.view = new View({ controller: this });
  this.fixPopup = new FixPopup(this.view);

  Events.on(client.deliveryman, client.deliveryman.events.change, function () {
    self.view.tick();
  });

  setInterval(function () {
    //nothing to move along while the page is out of sight
    if (!document.hidden) self.view.tick();
  }, EVERY);
}

export default DeliveryPanel;

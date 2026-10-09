import WorldScreenView from "./views/worldscreenview";
import Controls from "./worldaction";
import ReactiveProperty from "reactive-property";
import BuildingCode from "data/buildingcode";
import DeliveryPanel from "ui/modules/delivery/js/delivery";

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

WorldScreen.prototype.show = function (name) {
  this.busy(false);

  //the delivery game: no building, just the courier's panel
  if (!this.ui.editMode) {
    this.view.showDeliveryButtons();
    this.deliveryPanel();
    return;
  }

  switch (name) {
    case "build":
      this.view.showBuildButtons();
      break;
    default:
      if (this.client.core.cities.getCity(0)) this.view.showBuildButtons();
      else this.view.showInitialButtons();
  }
};

/**
 * The courier's panel, put up over the world the first time it is asked for.
 */
WorldScreen.prototype.deliveryPanel = function () {
  if (this._deliveryPanel === undefined) {
    this._deliveryPanel = new DeliveryPanel(this.client);
    this.view.addOverlay(this._deliveryPanel.view.el);
  }

  return this._deliveryPanel;
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

/**
 * Asks whether the player really means to leave this city behind, and starts
 * a new blank one under a new id if they do. The city they are on is kept -
 * it stays in storage under its own address.
 */
WorldScreen.prototype.startFresh = function () {
  var self = this;

  this.showHint("Do you really want to start fresh?");

  var controls = this.showControls();
  controls.canRotate(false);

  controls.onSubmit = function () {
    self.hideHint();
    self.ui.startFreshCity();
  };

  controls.onDiscard = function () {
    self.hideHint();
    self.show();
  };

  return controls;
};

/**
 * Asks what a road is to be laid in before it is laid - gravel, the lanes of
 * a village and the default; cobbles; or asphalt - the way the ground is
 * shaped by picking what to do to it first, and then which ways it goes
 * (pickWay). Gravel laid by the old town comes out cobbled (client/road
 * materialAt).
 */
WorldScreen.prototype.pickRoad = function () {
  var self = this;

  function lay(material) {
    return function () {
      self.pickWay(material);
    };
  }

  this.showHint("Lay the road in gravel, cobbles or asphalt");
  this.showTools([
    {
      icon: "cross-icon",
      action: function () {
        self.hideHint();
        self.show();
      },
    },
    { icon: "gravel-road-icon", action: lay("gravel") },
    { icon: "cobble-road-icon", action: lay("cobble") },
    { icon: "road-icon", action: lay("asphalt") },
  ]);
};

/**
 * Asks, a road's material picked, whether it is driven both ways or one way
 * only - a one-way road going the way it is dragged (client/buildman) - or
 * back to the materials.
 */
WorldScreen.prototype.pickWay = function (material) {
  var self = this;

  function lay(way) {
    return function () {
      self.hideHint();
      self.ui.navigate("build", [BuildingCode.road, material, way]);
    };
  }

  this.showHint("Both ways, or one way only?");
  this.showTools([
    {
      icon: "back-icon",
      action: function () {
        self.pickRoad();
      },
    },
    { icon: "two-way-road-icon", action: lay("two") },
    { icon: "one-way-road-icon", action: lay("one") },
  ]);
};

WorldScreen.prototype.showHint = function (text) {
  this.view.hint(text);
};

WorldScreen.prototype.hideHint = function () {
  this.view.hint("");
};

export default WorldScreen;

/**
 * The building bench (lab/buildings.html): one building, whole, put together
 * out of its parts the way the game puts it together (client/buildingview,
 * client/compoundbuilding), on a patch of flat grass a little bigger than it
 * and nothing else (lab/bench/stage) - looked at from any side, turned any
 * way, a look of its own picked afresh - and brought down at the push of a
 * button the way it comes down in the game (client/demolition Demolition):
 * fenced off, every tile of it told to come down at once, and nothing else
 * of the game about it; then put back up.
 */
import Events from "events";
import BuildingView from "../../src/client/buildingview";
import Demolition from "../../src/client/demolition";
import View from "../../src/client/view";
import BuildingData from "../../src/data/buildings";
import BuildingState from "../../src/core/buildingstate";
import Rotation from "../../src/core/rotation";
import Terrain from "../../src/core/terrain";
import TileIterator from "../../src/core/tileiterator";
import { buildings } from "../bench/stage.js";

//how far the grass it stands on reaches out round it, tiles
var MARGIN = 2;

/**
 * @param stage {Stage} what it is drawn on (lab/bench/stage)
 * @param code {number|string} what stands
 */
export function Stand(stage, code) {
  var self = this;

  this.stage = stage;
  this.code = +code;
  this.rotation = 0;
  //what it looks like - kept, put up again - or undefined for a look of its
  //own, picked as it is first drawn
  this.look = undefined;
  //what stands, drawn, while it does; and what is coming down of it once it
  //is brought down
  this.building = null;
  this.demolition = null;

  //turned round: it stands as it is seen from the new side
  Events.on(View, View.events.change, function () {
    if (self.building !== null) self.building.view.update();
  });

  this.show();
}

//how it stands: its corner and its size, turned as it is, round the middle
function placed(self) {
  var data = BuildingData[self.code],
    sizeX = Rotation.sizeX(data, self.rotation),
    sizeY = Rotation.sizeY(data, self.rotation);

  return {
    x: -Math.floor(sizeX / 2),
    y: -Math.floor(sizeY / 2),
    sizeX: sizeX,
    sizeY: sizeY,
  };
}

/**
 * What stands, as the game's building is to what draws it (client/building,
 * client/buildingview): its kind, and the game's own building as far as the
 * drawing asks of it - where it stands, turned which way, looking which way,
 * up, and in nobody's city.
 */
function building(self, at) {
  var tile = self.stage.tile(at.x, at.y),
    data = {
      buildingCode: self.code,
      tile: tile,
      rotation: self.rotation,
      look: self.look,
      getState: function () {
        return BuildingState.ready;
      },
      getProgress: function () {
        return 1;
      },
      getCity: function () {
        return null;
      },
      occupiedTiles: function () {
        return new TileIterator(
          tile,
          tile + (at.sizeX - 1) + (at.sizeY - 1) * Terrain.dy,
        );
      },
    },
    out = {
      data: data,
      staticData: BuildingData[self.code],
      view: new BuildingView(),
    };

  out.view.setBuilding(out);

  return out;
}

//what stands let go of, and whatever is coming down gone at once
function clear(self) {
  if (self.demolition !== null) self.demolition.stop();
  self.demolition = null;

  if (self.building !== null) {
    self.building.view.dispose();
    self.building.view.gameObject.destroy();
  }
  self.building = null;
}

/**
 * Puts it up as it is to stand now, in the middle of the stage, on its
 * patch of grass - and the camera on it.
 */
Stand.prototype.show = function () {
  var at = placed(this);

  clear(this);
  this.stage.ground(
    at.x - MARGIN,
    at.y - MARGIN,
    at.sizeX + 2 * MARGIN,
    at.sizeY + 2 * MARGIN,
  );

  this.building = building(this, at);
  this.building.view.update();
  this.building.view.render();

  //the look it was given as it was first drawn, kept from here on
  this.look = this.building.data.look;

  this.stage.look(at.x + (at.sizeX - 1) / 2, at.y + (at.sizeY - 1) / 2);
};

/**
 * Another kind of building, a look of its own.
 */
Stand.prototype.pick = function (code) {
  this.code = +code;
  this.look = undefined;
  this.rotation = 0;
  this.show();
};

/**
 * Another look for the same kind - for one put together out of parts; one
 * drawn whole has the one.
 *
 * @returns {boolean} whether it has looks to pick from
 */
Stand.prototype.another = function () {
  this.look = undefined;
  this.show();

  return BuildingData[this.code].compound !== undefined;
};

/**
 * Any building at all, a look of its own.
 *
 * @returns {number} its code
 */
Stand.prototype.any = function () {
  var all = buildings();

  this.pick(all[Math.floor(Math.random() * all.length)].value);

  return this.code;
};

/**
 * Turned round a quarter turn on its ground, by either way - as it can be
 * put down turned.
 */
Stand.prototype.rotate = function (by) {
  this.rotation = (((this.rotation + by) % 4) + 4) % 4;
  this.show();
};

/**
 * Brought down, there and then: what it looks like stood up in its place
 * (Demolition), fenced off, and every tile of it told to come down at once.
 *
 * @returns {boolean} whether there was anything standing to bring down
 */
Stand.prototype.demolish = function () {
  var b = this.building,
    tiles = [];

  if (b === null) return false;

  var iter = b.data.occupiedTiles();

  while (!iter.done) tiles.push(iter.next());

  var demolition = (this.demolition = new Demolition.Demolition(
    this.stage.client,
    b,
    tiles,
  ));

  //its view let go of: the demolition stands in its place
  b.view.dispose();
  b.view.gameObject.destroy();
  this.building = null;

  tiles.forEach(function (tile) {
    demolition.knock(tile);
  });

  return true;
};

/**
 * Put back up as it stood, whatever is left of it coming down gone.
 */
Stand.prototype.restore = function () {
  this.show();
};

/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 20.09.13
 * Time: 18:56
 * To change this template use File | Settings | File Templates.
 */
import BuildingState from "./buildingstate";
import Resources from "./resources";
import Resource from "./resourcecode";
import Events from "events";
/**
 * @type {BuildingClassCode}
 */
import BuildingClassCode from "../data/classcode";
import BuildingData from "../data/buildings";
import TileIterator from "./tileiterator";
/**
 * @type {TileIteratorRadial}
 */
import TileIteratorRadial from "./tileiteratorradial";
/**
 * @type {TerrainType}
 */
import TerrainType from "./terraintype";
/**
 * @type {GatherReq}
 */
import GatherReq from "./gatherreq";
import Terrain from "./terrain";

import Construction from "./construction";
import Rotation from "./rotation";
import Surface from "./surface";

var events = {
  stateChange: 0,
};

function Building() {
  Construction.constructor(this);

  this.producing = {};
  this.demanding = {};
}

Building.events = events;

Building.prototype = Object.create(Construction.prototype);
Building.prototype.constructor = Building;

Building.prototype.createdAt = null; //game time
Building.prototype.demanding = null;
Building.prototype.producing = null;
Building.prototype.permanent = true;
//what it looks like, for a building put together out of parts: picked for it
//by whoever first draws it, and kept in the save with the rest of it - the
//core only keeps it, see client/compoundbuilding
Building.prototype.look = null;
//when it was set on fire, of the game's time (ignite) - kept in the save -
//or null for one that never was
Building.prototype.fire = null;

//how sound it is, 0..100 (getHealth): knocked about by a blast next to it
//(City#explode, damage) - kept in the save - and down once there is none
//of it left
Building.prototype.health = 100;

//for a heap of rubble a building blown up left (City#explode): when it was
//left smouldering, of the game's time - kept in the save - or null
Building.prototype.smoke = null;

var HOUR = 3600000;

/**
 * How a fire goes, of the game's time from when it was set: the building
 * burns, a window at a time and then a floor, till it comes down (BURNS);
 * what is left of it burns on (REMAINS), then smoulders (SMOULDERS) - and
 * after that it is a cold ruin, till it is cleared away. A day in all.
 */
Building.BURNS = 7 * HOUR;
Building.REMAINS = 15 * HOUR;
Building.SMOULDERS = 24 * HOUR;

/**
 * Sets it on fire at the game's time at: nobody lives or works in it from
 * then on, it makes nothing and costs nothing (BuildingState burning) -
 * and it burns down (burn).
 *
 * @param at {number} the game's time, ms
 */
Building.prototype.ignite = function (at) {
  this.fire = at;
  //going up no further
  this._run++;
  clearTimeout(this._timer);
  this._timer = null;
  this._state = BuildingState.burning;
  Events.fire(this, Construction.events.stateChange, this._state);
};

/**
 * Has it come down, if it has burnt long enough by now - the game's time,
 * ms: a ruin from then on (BuildingState ruin). Told every tick, and by
 * whoever shows it burning, by its own clock.
 *
 * @param now {number}
 */
Building.prototype.burn = function (now) {
  if (
    this._state !== BuildingState.burning ||
    this.fire === null ||
    now - this.fire < Building.BURNS
  )
    return;

  this._state = BuildingState.ruin;
  Events.fire(this, Construction.events.stateChange, this._state);
};

/**
 * How sound it is now, 0..100 - the game's time now, ms: as sound as it has
 * been left by whatever has knocked it about (damage), and on fire, less and
 * less of that as it burns, none once it is down (BURNS); burnt down, none.
 *
 * @param now {number}
 * @returns {number}
 */
Building.prototype.getHealth = function (now) {
  if (this._state === BuildingState.ruin) return 0;

  if (this._state === BuildingState.burning && this.fire !== null)
    return (
      this.health *
      Math.max(0, Math.min(1, 1 - (now - this.fire) / Building.BURNS))
    );

  return this.health;
};

/**
 * How sound it would be now (getHealth) with so much more knocked off it -
 * for whoever shows it coming down to know before it does.
 *
 * @param amount {number} 0..100
 * @param now {number} the game's time, ms
 * @returns {number}
 */
Building.prototype.healthAfter = function (amount, now) {
  var was = this.health,
    out;

  this.health = Math.max(0, was - Math.max(0, amount));
  out = this.getHealth(now);
  this.health = was;

  return out;
};

/**
 * Knocks so much of its health off it (getHealth) - none left, it is to
 * come down.
 *
 * @param amount {number} 0..100
 * @returns {number} how much of it is left
 */
Building.prototype.damage = function (amount) {
  this.health = Math.max(0, this.health - Math.max(0, amount));

  return this.health;
};

/**
 * Put back on fire as a save has it, set at at - burning still, or burnt
 * down by now.
 */
Building.prototype.restoreFire = function (at) {
  this.fire = at;
  this._run++;
  clearTimeout(this._timer);
  this._timer = null;
  this._state =
    this.world.time.now - at >= Building.BURNS
      ? BuildingState.ruin
      : BuildingState.burning;
};
//what it stands on (core/surface): a road's own, a building's flat at the
//highest corner under it as it went up - kept as the ground is shaped under
//it (City#terraform), and in the save. Null for a tree
Building.prototype.surface = null;
//a demolition under way (City#clearTile): paid for, fenced off, the building
//coming down a tile at a time as the bulldozers get to it - nobody in it,
//nothing made or wanted of it - and which of its tiles are down already
//(City#tileDown), the ground bare there. Kept in the save: after a reload it
//stands as far down as it had come, fenced off still, till the bulldozers
//are sent to the rest of it - which is paid for already
Building.prototype.demolishing = false;
Building.prototype.down = null;
Building.prototype.events = events;

/**
 * Every tile it stands on.
 *
 * @returns {number[]}
 */
Building.prototype.tiles = function () {
  var out = [],
    iter = this.occupiedTiles();

  while (!iter.done) out.push(TileIterator.next(iter));

  return out;
};

/**
 * Whether a tile of it is down, a demolition under way (City#tileDown).
 */
Building.prototype.isDown = function (tile) {
  return this.down !== null && this.down.indexOf(tile) !== -1;
};

/**
 * Its tiles still standing - every one, but for a demolition under way.
 *
 * @returns {number[]}
 */
Building.prototype.standingTiles = function () {
  var self = this;

  return this.tiles().filter(function (tile) {
    return !self.isDown(tile);
  });
};

Building.prototype.init = function (world, code, tile, rot, done) {
  Construction.init(this, world, code, tile, rot, done);

  this.surface = Surface.of(world.terrain, this);

  this.createdAt = this.createdAt || this.world.time.now;

  Events.on(this, Construction.events.stateChange, onStateChange, this);

  if (this.data.classCode !== BuildingClassCode.tree) {
    Events.once(
      this,
      "dispose",
      onDispose,
      Events.on(this.world, this.world.events.tick, onTick, this),
    );
  }
};

Building.prototype.dispose = function () {
  Events.fire(this, "dispose");
};

Building.prototype.citizenCapacity = function () {
  var data = BuildingData[this.buildingCode];

  if (this._state !== BuildingState.ready || this.demolishing) return 0;

  //nobody moves into a house that is not part of the city, or has no street
  //to it or no water in it
  var city = this.getCity();

  if (city !== null && city.missing(this) !== null) return 0;

  return data.citizenCapacity || 0;
};

/**
 * @returns {number} how many people it can employ - none, like a house full of
 *                   nobody, until it is built and has everything it needs
 */
Building.prototype.jobs = function () {
  var data = BuildingData[this.buildingCode];

  if (!data.jobs || this._state !== BuildingState.ready || this.demolishing)
    return 0;

  var city = this.getCity();

  if (city !== null && city.missing(this) !== null) return 0;

  return data.jobs;
};

function onDispose(self, args, tickSubscriptionId) {
  Events.off(self.world, self.world.events.tick, tickSubscriptionId);

  self._state = BuildingState.none;
  updateEffectOnTileParams(self);
}

function checkFullfilRequirements(self) {
  var world = self.world;
  var data = BuildingData[self.buildingCode];
  //turned round, the footprint's sides swap
  var sizeX = Rotation.sizeX(data, self.rotation),
    sizeY = Rotation.sizeY(data, self.rotation);

  if (!world) throw "World is not set yet";

  if (data.requirement === GatherReq.inGrassLand) {
    var occupiedIterator = self.occupiedTiles();

    while (!occupiedIterator.done) {
      var tile = occupiedIterator.next();
      var terrainType = world.terrain.getTerrainType(tile);
      if (terrainType !== TerrainType.grass) return false;
    }
  } else if (data.requirement === GatherReq.nearTree) {
    var iter = new TileIterator(
      self.tile - Terrain.dx,
      self.tile - Terrain.dy,
      sizeX + 2,
      sizeY + 2,
    );
    while (!iter.done) {
      var tile = iter.next();
      var b = world.buildings.get(tile);

      if (b === undefined && world.envService.hasTree(tile)) return true;
      else if (b !== null) {
        var d = BuildingData[b.buildingCode];
        if (d.classCode === BuildingClassCode.tree) return true;
      }
    }
  } else if (data.requirement === GatherReq.nearWater) {
    var iter = new TileIterator(
      self.tile - Terrain.dx,
      self.tile - Terrain.dy,
      sizeX + 2,
      sizeY + 2,
    );
    while (!iter.done) {
      var tile = iter.next();
      var t = world.terrain.getTerrainType(tile);
      if (t === TerrainType.water || t === TerrainType.shore) {
        return true;
      }
    }
  }

  return true;
}

/**
 * Updates params of tiles that are affected by effect of this building
 * @param self
 */
function updateEffectOnTileParams(self) {
  var key = "building_" + self.id;
  var paramsMan = self.world.tileParams;
  var circle, tile, data, tilesParams, effect, effectRadius;

  data = BuildingData[self.buildingCode];
  effect = data.tileEffect || null;
  effectRadius = data.tileEffectRadius || 1;

  if (self._state === BuildingState.ready) {
    if (effect !== null) {
      if (paramsMan.has(key)) paramsMan.remove(key);

      circle = new TileIteratorRadial(self.tile, effectRadius);
      tilesParams = {};

      while (!circle.done) {
        tile = TileIteratorRadial.next(circle);
        tilesParams[tile] = effect;
      }

      paramsMan.add(key, tilesParams);
    }
  } else {
    if (effect !== null && paramsMan.has(key)) paramsMan.remove(key);
  }
}

function onTick(sender, args, self) {
  self.getCity();
  self.burn(self.world.time.now);

  //coming down: nothing made, nothing wanted
  if (self.demolishing) {
    Resources.clear(self.producing);
    Resources.clear(self.demanding);
    return;
  }

  produce(self);
  demand(self);
}

function onStateChange(sender, args, self) {
  updateEffectOnTileParams(self);
}

function produce(self) {
  Resources.clear(self.producing);

  var data = BuildingData[self.buildingCode];
  var city = self.getCity();

  //before a city is founded there is no treasury to pay into
  if (city === null) return;

  //a shop with no street to it or no water in it takes nothing over the counter
  if (city.missing(self) !== null) return;

  if (
    self._state == BuildingState.ready &&
    (data.requirement === undefined ||
      data.requirement === GatherReq.none ||
      checkFullfilRequirements(self))
  ) {
    //a business makes what it makes only as far as it has the people for it
    Resources.mul(self.producing, data.producing, city.jobs.getStaffing(self));
    city.resources.add(self.producing);
  }
}

function demand(self) {
  Resources.clear(self.demanding);

  var data = BuildingData[self.buildingCode];
  var city = self.getCity();

  if (city === null) return;

  //a town nobody has moved into yet runs up no bills - the player gets to
  //look around before the clock starts ticking
  if (city.population.getPopulation() === 0) return;

  //and what is cut off from it is not the city's to keep up
  if (city.roadService.cutOff(self) !== null) return;

  if (self._state == BuildingState.ready) {
    Resources.add(self.demanding, self.demanding, data.demanding);

    city.resources.sub(self.demanding);
  }
}

export default Building;

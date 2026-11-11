/**
 * Created by User on 19.08.2014.
 */
import Events from "events";
import BuildingCode from "../../data/buildingcode";
import BuildingData from "../../data/buildings";
import BuildingClassCode from "../../data/classcode";
import ErrorCode from "../errorcode";
import Resource from "../resourcecode";
import Config from "../config";
import Building from "../building";
import BuildingState from "../buildingstate";
import Terrain from "../terrain";
import TileIterator from "../tileiterator";

import namespace from "namespace";
import Rotation from "../rotation";
import * as RoadRules from "../roadrules";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Buildings = CityBuildings;

/**
 * @param city {City}
 * @constructor
 */
function CityBuildings(city) {
  this._buildings = [];
  this.city = this._city = city;
  //what is to go up where something else is coming down for it, once the
  //ground is clear (replaceLater): {code, tile, rotation, look, tiles} each
  this._replacing = [];
}

/**
 * @type {City}
 * @private
 */
CityBuildings.prototype._city = null;

/**
 * @type {Array}
 * @private
 */
CityBuildings.prototype._buildings = null;

CityBuildings.prototype.cityHall = null;

var events = (CityBuildings.prototype.events = {
  new: 0,
  remove: 1,
});

CityBuildings.prototype.init = function () {
  var buildings = this.city.root.buildings;

  //whatever takes a building down - a bulldozer, the terrain being cleared -
  //goes through the world's register, and the city's own list has to follow
  //it, or a save would put razed buildings back up
  Events.on(
    buildings,
    buildings.events.buildingRemoved,
    onBuildingRemoved,
    this,
  );

  //what goes up in the place of what came down, as soon as the last of it
  //is gone (replaceLater) - or, should nobody say so, once the ground is
  //clear by the clock (core/terrain beingCleared)
  var world = this.city.world;

  Events.on(
    world.terrain,
    Terrain.events.clearingEnded,
    function (sender, tile, self) {
      settle(self);
    },
    this,
  );
  Events.on(
    world,
    world.events.tick,
    function (sender, args, self) {
      settle(self);
    },
    this,
  );
};

/**
 * What a building of a type goes up as: any of its variants, picked at random
 * (see variants in data/buildings) - and a building that is no type is itself.
 *
 * @param code {number}
 * @returns {number} the code of the building that goes up
 */
function variantOf(code) {
  var variants = BuildingData[code] && BuildingData[code].variants;

  if (variants === undefined) return code;

  return variants[Math.floor(Math.random() * variants.length)];
}

CityBuildings.variantOf = variantOf;

/**
 * What putting code down costs: what the catalogue says - for a road, the
 * share of it what it is laid in costs (core/roadrules costShare).
 *
 * @param code {number}
 * @param [look] {Object} what it would look like - for a road, {material}
 * @returns {Object} resources
 */
function costOf(code, look) {
  var data = BuildingData[code],
    cost = data.constructionCost || {},
    out = {},
    share;

  if (data.classCode !== BuildingClassCode.road) return cost;

  share = RoadRules.costShare(look);
  for (var key in cost) out[key] = Math.round(cost[key] * share);

  return out;
}

CityBuildings.costOf = costOf;

/**
 * The road on tile that a road laid in look's material would be an upgrade
 * of - gravel to cobbles or asphalt, cobbles to asphalt (core/roadrules
 * MATERIALS) - or null. A road laid over one like that takes its place for
 * the price of a road, rather than being turned down for the tile being
 * taken: what is there is dug up and laid again where it is (upgrade).
 *
 * @param code {number} what is being put down
 * @param [look] {Object} what it would look like (client/buildman)
 * @returns {Building|null}
 */
function upgradeOf(self, code, tile, look) {
  var material = look ? look.material : undefined,
    there;

  if (
    BuildingData[code].classCode !== BuildingClassCode.road ||
    RoadRules.MATERIALS.indexOf(material) === -1
  )
    return null;

  there = self.city.world.buildings.get(tile);

  if (
    there === null ||
    BuildingData[there.buildingCode].classCode !== BuildingClassCode.road
  )
    return null;

  return RoadRules.MATERIALS.indexOf(material) >
    RoadRules.MATERIALS.indexOf(RoadRules.materialOf(there))
    ? there
    : null;
}

/**
 * Lays road again in what look says, the way it lies: its material, the way it
 * goes if it is laid one way, and its bus stop, if it has one, kept. It is
 * dug up and laid the way a new road is, through its works from the start
 * (client/roadworks) - closed meanwhile, off the network and nothing driving
 * on it, the way a new one is till it is finished. What it cost is billed,
 * and whoever draws it told (Building stateChange).
 */
function upgrade(self, road, look, cost) {
  var next = { material: look.material };

  if (look.way !== undefined) next.way = look.way;
  if (road.look && road.look.stop) next.stop = true;

  road.look = next;
  //shown over it as a new road's price is (client/buildman)
  road.expense = cost[Resource.money] || 0;

  self.city.resources.sub(cost);

  road.rebuild();
}

/**
 * @param code {number} a building, or a type - which goes up as any of its
 *        variants
 * @param tile {number}
 * @param [rotate] {number} quarter turns, 0..3 - see core/rotation
 * @param [look] {Object} for a building put together out of parts, what it
 *        looks like - the look it was shown with while it was placed (see
 *        client/compoundbuilding); one is picked for it otherwise
 * @param [surface] {number[]} for a road, the surface it is laid with
 *        (core/surface) - the one it has on its own otherwise
 */
CityBuildings.prototype.buildBuilding = function (
  code,
  tile,
  rotate,
  look,
  surface,
) {
  var city = this.city;
  var root = this.city.root;

  //the catalogue hands codes over as the strings they are in the markup, and
  //"3" is not BuildingCode.cityHall however much it looks like it
  code = variantOf(parseInt(code, 10));

  //a road laid over a lesser one: that one laid again where it lies
  var road = upgradeOf(this, code, tile, look),
    errorCode =
      road !== null
        ? upgradeTest(this, code, look)
        : buildTest(this, code, tile, rotate, look),
    cost = costOf(code, look);

  if (road !== null && errorCode === ErrorCode.NONE) {
    upgrade(this, road, look, cost);
    return;
  }

  if (errorCode === ErrorCode.NONE) {
    var data = BuildingData[code];

    //the trees and rocks the site stands on are cleared by the build itself,
    //and the clearing goes on the bill - counted before, while they are
    //still there. Not for the city hall: it comes with the city, and
    //founding one is free
    var clearing =
      code === BuildingCode.cityHall
        ? 0
        : clearingCost(city.world, code, tile, rotate);

    var building = new Building();
    if (look) building.look = look;
    building.init(city.world, code, tile, rotate);
    //a road laid as it was planned (client/road plan)
    if (Array.isArray(surface)) building.surface = surface.slice();

    //what the player pays for it, set before the build is announced so
    //that whoever shows it over the site has it in hand
    building.expense = (cost[Resource.money] || 0) + clearing;

    root.buildings.build(building);

    city.resources.sub(cost);

    if (clearing > 0) city.resources.subResource(Resource.money, clearing);

    this._buildings.push(building);

    if (code === BuildingCode.cityHall) this.cityHall = building;

    Events.fire(this, events.new, building);
  } else {
    root.messagingService.sendTileMessage(
      tile,
      Isometrica.Core.MessageType.tileError,
      errorCode,
    );
  }
};

/**
 * What putting code down on each of anchors would come to, without putting
 * anything down - so the bill can be shown before the click.
 *
 * Goes through them in the order a build of the selection does, and holds
 * what the ones before would have taken against the ones after: the money
 * they would have spent, a city hall one of them would have put up. A
 * building the build would turn down is left out, save one turned down for
 * want of money only - its price is still worth knowing.
 *
 * A road laid over a lesser one is quoted at a road's price (upgradeOf) -
 * and a road at what it is laid in costs (costOf).
 *
 * @param code {number}
 * @param anchors {number[]} the tile each building would stand on
 * @param [rotation] {number} quarter turns, 0..3
 * @param [looks] {Array<Object|null>} what each would look like - for a
 *        road, what it is laid in
 * @returns {{tile: number, cost: number, error: number, upgrade: boolean}[]}
 */
CityBuildings.prototype.quoteSelection = function (
  code,
  anchors,
  rotation,
  looks,
) {
  var self = this;

  return quote(
    {
      world: this.city.world,
      resources: this.city.resources.getResources(),
      available: this.city.laboratoryService.getAvailableBuildings(),
      cityHall: this.cityHall !== null,
      upgrade: function (code, tile, look) {
        return upgradeOf(self, code, tile, look) !== null;
      },
    },
    code,
    anchors,
    rotation,
    looks,
  );
};

/**
 * #quoteSelection for a city that is not there yet - the one the first
 * buildings put down would found (City.quoteFounding): what it would have,
 * what it could put up, and the world they would go up in.
 *
 * @param context {{world: Logic, resources: Object, available: Object|null,
 *        cityHall: boolean, upgrade: function|undefined}} available null for
 *        anything at all
 * @returns {Array} as #quoteSelection
 */
CityBuildings.quote = function (context, code, anchors, rotation, looks) {
  return quote(context, code, anchors, rotation, looks);
};

function quote(context, code, anchors, rotation, looks) {
  code = parseInt(code, 10);

  var resources = context.resources,
    cost,
    spent = Object.create(null),
    cityHall = context.cityHall,
    r = [],
    tile,
    errorCode,
    clearing,
    upgrading,
    money,
    key,
    enough,
    i;

  for (i = 0; i < anchors.length; i++) {
    tile = anchors[i];
    cost = costOf(code, looks ? looks[i] : undefined);

    //a road paved over is there already, on ground that took it
    upgrading =
      context.upgrade !== undefined &&
      context.upgrade(code, tile, looks ? looks[i] : undefined);
    errorCode = upgrading
      ? ErrorCode.NONE
      : context.world.buildingService.test(code, tile, rotation);

    //the rest of buildTest, less what is about money - that is held
    //against what the buildings before would have spent instead
    if (errorCode === ErrorCode.NONE) {
      if (context.available !== null && context.available[code] !== true)
        errorCode = ErrorCode.BUILDING_NOT_AVAIL;
      else if (code === BuildingCode.cityHall && cityHall)
        errorCode = ErrorCode.CITY_HALL_ALREADY_BUILT;
    }

    if (errorCode !== ErrorCode.NONE) continue;

    //nothing to clear under a road there already
    clearing = upgrading
      ? 0
      : clearingCost(context.world, code, tile, rotation);
    money = (cost[Resource.money] || 0) + clearing;

    enough =
      (resources[Resource.money] || 0) - (spent[Resource.money] || 0) >= money;
    for (key in cost) {
      if (
        key !== Resource.money &&
        (resources[key] || 0) - (spent[key] || 0) < cost[key]
      )
        enough = false;
    }

    if (!enough) {
      r.push({
        tile: tile,
        cost: money,
        error: ErrorCode.NOT_ENOUGH_RES,
        upgrade: upgrading,
      });
      continue;
    }

    for (key in cost) spent[key] = (spent[key] || 0) + cost[key];
    spent[Resource.money] = (spent[Resource.money] || 0) + clearing;

    if (code === BuildingCode.cityHall) cityHall = true;

    r.push({
      tile: tile,
      cost: money,
      error: ErrorCode.NONE,
      upgrade: upgrading,
    });
  }

  return r;
}

CityBuildings.prototype.buildRoad = function (code, tile0, tile1) {
  code = parseInt(code, 10);

  var city = this.city;
  var root = city.root;
  var iter = new TileIterator(tile0, tile1);
  var bs = [];
  while (!iter.done) {
    var tile = TileIterator.next(iter);
    var errorCode = buildTest(this, code, tile);

    if (errorCode !== ErrorCode.NONE) {
      root.messagingService.sendTileMessage(
        tile,
        Isometrica.Core.MessageType.tileError,
        errorCode,
      );
      continue;
    }

    var building = new Building();
    building.init(root, code, tile);

    root.buildings.build(building);

    city.resources.sub(costOf(code));

    this._buildings.push(building);

    bs.push(building);
  }

  for (var i in bs) Events.fire(this, events.new, bs[i]);
};

/**
 * Puts a building back where a save says it stood: no build test and no bill,
 * standing finished from the start - or, if it was still going up, going on
 * from as far along as it was. What the build test looks at was the player's
 * business back when they built it, and they paid for it then.
 *
 * @param code {number}
 * @param tile {number}
 * @param [rotation] {number}
 * @param [progress] {number} 0..1, for one saved while going up
 * @param [look] {Object} what it looks like, for one put together out of
 *        parts - as whoever drew it first picked it (client/compoundbuilding)
 * @param [surface] {number[]} what it stands on (core/surface) - as it went
 *        up, unless kept
 * @param [demolition] {{down: number[]}} for one being demolished, the tiles
 *        of it down already (Building demolishing, down)
 * @returns {Building}
 */
CityBuildings.prototype.restore = function (
  code,
  tile,
  rotation,
  progress,
  look,
  surface,
  demolition,
) {
  //saves written before the codes were made numbers carry them as strings
  code = parseInt(code, 10);

  var building = new Building();

  //one still going up when it was saved goes on from there - anything else
  //was up long ago
  building.init(
    this.city.world,
    code,
    tile,
    rotation,
    typeof progress === "number" ? progress : true,
  );

  if (look !== undefined) building.look = look;
  if (Array.isArray(surface)) building.surface = surface.slice();
  if (demolition && typeof demolition === "object") {
    building.demolishing = true;
    building.down = Array.isArray(demolition.down)
      ? demolition.down.slice()
      : [];
  }

  this.city.root.buildings.build(building);

  this._buildings.push(building);

  if (code === BuildingCode.cityHall) this.cityHall = building;

  Events.fire(this, events.new, building);

  return building;
};

/**
 * @returns {Object[]} what stands in the city, as it goes into a save
 */
CityBuildings.prototype.save = function () {
  var r = [],
    building;

  for (var i = 0; i < this._buildings.length; i++) {
    building = this._buildings[i];

    r.push({
      code: building.buildingCode,
      tile: building.tile,
      rotation: building.rotation || 0,
      //how far along it is, for one still going up
      progress:
        building.getState() === BuildingState.underConstruction
          ? building.getProgress()
          : undefined,
      //what it looks like, for one put together out of parts picked for it
      //- and for a road, what it is laid in and, one-way, the way it goes
      look: building.look,
      //what it stands on (core/surface)
      surface: building.surface || undefined,
      //being demolished, and how far down it has come
      demolition: building.demolishing
        ? { down: (building.down || []).slice() }
        : undefined,
    });
  }

  return r;
};

/**
 * @param list {Object[]}
 */
CityBuildings.prototype.load = function (list) {
  for (var i = 0; i < list.length; i++)
    this.restore(
      list[i].code,
      list[i].tile,
      list[i].rotation,
      list[i].progress,
      list[i].look,
      list[i].surface,
      list[i].demolition,
    );
};

/**
 * Has code go up on tile, turned rotation times, looking as look says, once
 * the ground under it is clear - what stood there being cleared away for it
 * (City#replace): its tiles kept for it meanwhile (core/buildings reserve),
 * and it paid for already. It goes up as a building site, there and then,
 * as soon as the last of its tiles is clear (settle).
 *
 * @param code {number} a building - not a type
 * @param tile {number} its corner with the least x and y
 * @param rotation {number} quarter turns, 0..3
 * @param [look] {Object|null} for one put together out of parts
 */
CityBuildings.prototype.replaceLater = function (code, tile, rotation, look) {
  var r = {
    code: code,
    tile: tile,
    rotation: rotation | 0,
    look: look || undefined,
    tiles: footprint(code, tile, rotation),
  };

  this._replacing.push(r);
  this.city.world.buildingService.reserve(r.tiles);
  settle(this);
};

/**
 * What is to go up where something is coming down for it, still waiting
 * for its ground (replaceLater).
 *
 * @returns {{code: number, tile: number, rotation: number, look: Object,
 *          tiles: number[]}[]}
 */
CityBuildings.prototype.replacing = function () {
  return this._replacing.slice();
};

/**
 * What is waiting to go up, as it goes into a save - or undefined for
 * nothing. The ground being cleared is not kept (core/terrain clearing): a
 * save has it clear, and what waited for it goes up as it is loaded
 * (loadReplacing).
 *
 * @returns {Object[]|undefined}
 */
CityBuildings.prototype.saveReplacing = function () {
  if (this._replacing.length === 0) return undefined;

  return this._replacing.map(function (r) {
    return { code: r.code, tile: r.tile, rotation: r.rotation, look: r.look };
  });
};

/**
 * What a save says was waiting to go up where something was coming down
 * for it: up now, a building site from the start, on ground that is clear
 * by now - or nothing, for ground something else stands on.
 *
 * @param [list] {Object[]} as saveReplacing left it
 */
CityBuildings.prototype.loadReplacing = function (list) {
  var self = this,
    test = this.city.world.buildingService;

  (list || []).forEach(function (r) {
    var code = parseInt(r.code, 10),
      w = {
        code: code,
        tile: r.tile,
        rotation: r.rotation | 0,
        look: r.look,
      };

    if (BuildingData[code] === undefined) return;

    if (test.test(code, r.tile, r.rotation) === ErrorCode.NONE) goUp(self, w);
    //what it was waiting for is coming down still, as far as it had come -
    //and it waits on for it
    else if (
      (w.tiles = footprint(code, r.tile, w.rotation)).every(function (t) {
        var b = test.get(t);

        return b === null || b.demolishing;
      })
    ) {
      self._replacing.push(w);
      test.reserve(w.tiles);
    }
  });
};

/**
 * Lets go of whatever was waiting to go up (replaceLater) - for a bench
 * starting its ground over.
 */
CityBuildings.prototype.dropReplacing = function () {
  var held = this.city.world.buildingService;

  this._replacing.forEach(function (r) {
    held.release(r.tiles);
  });
  this._replacing = [];
};

//the tiles code stands on from tile, turned rotation times
function footprint(code, tile, rotation) {
  var data = BuildingData[code],
    iter = new TileIterator(
      tile,
      tile +
        (Rotation.sizeX(data, rotation) - 1) +
        (Rotation.sizeY(data, rotation) - 1) * Terrain.dy,
    ),
    r = [];

  while (!iter.done) r.push(TileIterator.next(iter));

  return r;
}

/**
 * Whatever was waiting for its ground (replaceLater) goes up, a building
 * site, on ground that is clear now: none of its tiles being cleared still,
 * nothing standing on any - the building it is to replace down to its last
 * tile.
 */
function settle(self) {
  var terrain = self.city.world.terrain,
    held = self.city.world.buildingService;

  if (self._replacing.length === 0) return;

  self._replacing.slice().forEach(function (r) {
    if (
      r.tiles.some(function (tile) {
        return terrain.beingCleared(tile) || held.get(tile) !== null;
      })
    )
      return;

    self._replacing.splice(self._replacing.indexOf(r), 1);
    held.release(r.tiles);
    goUp(self, r);
  });
}

/**
 * Puts up what was waiting for its ground (replaceLater), a building site
 * from the start: paid for when it was asked for (City#replace), so with
 * nothing to show over it for what it cost.
 */
function goUp(self, r) {
  var building = new Building();

  building.init(self.city.world, r.code, r.tile, r.rotation, 0);
  if (r.look !== undefined && r.look !== null) building.look = r.look;
  building.expense = 0;

  self.city.root.buildings.build(building);

  self._buildings.push(building);

  if (r.code === BuildingCode.cityHall) self.cityHall = building;

  Events.fire(self, events.new, building);

  return building;
}

CityBuildings.prototype.destroyBuilding = function () {
  throw "Not implemented";
};

CityBuildings.prototype.getBuildings = function () {
  return this._buildings;
};

/**
 * What it costs to clear the site of a building - one clearing charge for
 * every tile of its footprint that has a tree or a rock on it.
 *
 * @returns {number}
 */
function clearingCost(world, code, tile, rotation) {
  var data = BuildingData[code],
    sizeX = Rotation.sizeX(data, rotation),
    sizeY = Rotation.sizeY(data, rotation),
    iter = new TileIterator(
      tile,
      tile + (sizeX - 1) + (sizeY - 1) * Terrain.dy,
    ),
    cleared = 0;

  while (!iter.done) {
    if (world.envService.hasScenery(TileIterator.next(iter))) cleared++;
  }

  return cleared * Config.clearTileCost;
}

function onBuildingRemoved(sender, building, self) {
  var index = self._buildings.indexOf(building);

  if (index === -1) return;

  self._buildings.splice(index, 1);

  if (self.cityHall === building) self.cityHall = null;
}

//what buildTest asks of a road paved over another, the ground aside - the
//road is there already
function upgradeTest(self, code, look) {
  var city = self.city;

  if (city.laboratoryService.getAvailableBuildings()[code] !== true)
    return ErrorCode.BUILDING_NOT_AVAIL;
  if (!city.resources.hasEnough(costOf(code, look)))
    return ErrorCode.NOT_ENOUGH_RES;

  return ErrorCode.NONE;
}

function buildTest(self, code, tile, rotation, look) {
  var test = self.city.root.buildingService.test(code, tile, rotation);

  if (test !== ErrorCode.NONE) return test;

  var city = self.city;

  var cost = costOf(code, look),
    availableBuildingList = city.laboratoryService.getAvailableBuildings();

  if (availableBuildingList[code] !== true) return ErrorCode.BUILDING_NOT_AVAIL;
  else if (code === BuildingCode.cityHall && self.cityHall !== null)
    return ErrorCode.CITY_HALL_ALREADY_BUILT;
  else if (!city.resources.hasEnough(cost)) return ErrorCode.NOT_ENOUGH_RES;
  else if (
    !city.resources.hasEnoughResource(
      Resource.money,
      (cost[Resource.money] || 0) +
        clearingCost(city.world, code, tile, rotation),
    )
  )
    return ErrorCode.NOT_ENOUGH_RES;

  return ErrorCode.NONE;
}

export default CityBuildings;

//TODO each building should be a building instance with attached prefab of building
import Core from "../core/main";
import engine from "engine";
import BuildingClassCode from "../data/classcode";
import BuildingCode from "../data/buildingcode";
import BuildingData from "../data/buildings";
import Building from "./building";
import BuildingView from "./buildingview";
import View from "./view";
import Road from "./road";
import RoadView from "./roadview";
import EventManager from "events";
import Events from "events";
import Chunkman from "./chunkman";
import AreaSelector from "./areaselector";
import TileMessage from "./gameObjects/tilemessage";
import CityWater from "../core/city/citywater";
import CityBuildings from "../core/city/citybuildings";
import Config from "./config";
import RenderLayer from "./renderlayer";
import ResourceCode from "../core/resourcecode";
import ErrorCode from "../core/errorcode";
import Numeral from "numeral";
import Rotation from "../core/rotation";
import CompoundBuilding from "./compoundbuilding";
import Demolition from "./demolition";
import Explosion from "./explosion";
import Collapse from "./collapse";
import Felling from "./felling";
import Replacement from "../core/replacement";
import Rubble from "./rubble";
import * as RoadRules from "../core/roadrules";
import { changed } from "./looks";

var Terrain = Core.Terrain;
var TileIterator = Core.TileIterator;
var Terrain = Core.Terrain;
var ConstructionService = Core.ConstructionService;

function getBuilding(self, tile) {
  var x = Terrain.extractX(tile);
  var y = Terrain.extractY(tile);

  if (
    self.buildingByXY[x] !== undefined &&
    self.buildingByXY[x][y] !== undefined
  )
    return self.buildingByXY[x][y];
  else return null;
}

function setBuilding(self, tile, building) {
  var x = Terrain.extractX(tile);
  var y = Terrain.extractY(tile);

  if (self.buildingByXY[x] === undefined) self.buildingByXY[x] = [];

  self.buildingByXY[x][y] = building;
  changed();

  //so a picked sprite can be traced back to the building it belongs to
  self.buildingByGO[building.view.gameObject.instanceId] = building;
}

function removeBuilding(self, tile) {
  var x = Terrain.extractX(tile);
  var y = Terrain.extractY(tile);

  var building;
  if (
    self.buildingByXY[x] !== undefined &&
    self.buildingByXY[x][y] !== undefined
  ) {
    building = self.buildingByXY[x][y];
    changed();
    Events.fire(self, self.events.buildingRemoved, building);
    delete self.buildingByGO[building.view.gameObject.instanceId];

    if (!hold(self, tile, building)) building.destroy();

    if (!building.data.permanent) building.data.dispose();

    delete self.buildingByXY[x][y];
  }

  return building;
}

/**
 * Keeps a tree planted on a tile being cleared standing where it is until
 * the bulldozer clearing it gets to it (client/clearworks), the way a wild
 * one is (client/envman), to go over the way it is pushed (client/felling);
 * and a road there, till the bulldozer has driven over it and broken it up
 * into the bare earth (client/roadman cleared); and the rubble a building
 * blown up left there (core/city explode), till the bulldozer pushes it off
 * in its dust - whether it is any of them. A building is no such thing: the
 * world keeps it while it is demolished, a tile at a time (onDemolish), and
 * lets go of it once it is all down.
 */
function hold(self, tile, building) {
  var works = self.root.clearworks,
    classCode = building.staticData && building.staticData.classCode,
    road = classCode === BuildingClassCode.road,
    rubble =
      !!building.staticData &&
      building.staticData.variantOf === BuildingCode.rubble,
    //nothing to go over: pushed off flat
    tree = !road && !rubble;

  if (!works || !building.staticData) return false;

  if (classCode !== BuildingClassCode.tree && !road) return false;

  //a tree a blast knocks over: standing till the blast gets to it, then
  //going over the way it pushes it (client/explosion)
  var blast = self.root.blasted ? self.root.blasted[tile] : undefined;

  if (blast !== undefined && tree) {
    delete self.root.blasted[tile];
    self.held[tile] = building;
    blast(
      function (push) {
        delete self.held[tile];
        Felling.fell(self.root, treeOf(building), push, tile);
        building.destroy();
      },
      function (push) {
        Felling.expect(self.root, treeOf(building), push, tile);
      },
    );
    return true;
  }

  if (
    !works.hold(
      tile,
      function (push) {
        delete self.held[tile];

        //a tree pushed over is drawn going over from here on
        if (tree) Felling.fell(self.root, treeOf(building), push, tile);

        building.destroy();
        if (road) self.root.roadman.cleared(tile);
        //the heaps round it a pile without it from now on
        if (rubble) repile(self, [tile]);
      },
      function (push) {
        //the bulldozer coming up to it: the pictures of it going over ready
        if (tree) Felling.expect(self.root, treeOf(building), push, tile);

        return 0;
      },
    )
  )
    return false;

  self.held[tile] = building;

  return true;
}

//what a tree planted is drawn with (client/buildingview), if anything
function treeOf(building) {
  var children = building.view.gameObject.transform.children;

  for (var i = 0; i < children.length; i++) {
    var renderer = children[i].gameObject.spriteRenderer;

    if (
      renderer &&
      renderer.sprite &&
      /^gen\/trees\//.test(renderer.sprite.key)
    )
      return renderer;
  }

  return null;
}

function createBuilding(self, model) {
  var building = getBuilding(self, model.tile);

  //the same building can turn up here more than once: one reaching over a
  //chunk's edge is found by both chunks, and a chunk streamed in while the
  //client was starting up is walked again by Buildman#init. A second view
  //would be left over the first for good - drawn, but no longer tracked, so
  //it never goes away with the building and never follows its neighbours
  if (building !== null && building.data === model) return building;

  if (model.data.classCode === BuildingClassCode.road) {
    building = new Road(self.root);
  } else building = new Building(self.root);

  building.setData(model);

  setBuilding(self, model.tile, building);

  //one that goes up by whatever is being placed fades in with the rest
  if (self.fadeRings !== null && fades(model)) {
    fade(self, building, fadeOf(self, model));
    self.faded[model.tile] = true;
  }

  Events.fire(self, self.events.buildingAdded, building);

  //being demolished, as far down as it has come
  if (model.demolishing) demolitionOf(self, model);

  return building;
}

/**
 * The demolition standing in for a building being demolished (core/building
 * demolishing) - every tile of it still standing as it stands, fenced off
 * all round, its own view drawing nothing (client/buildingview) - made the
 * first time it is asked for once the building is in sight, the same one
 * after for as long as there is any of it; and the tiles of it down by now,
 * its rubble pushed away, gone from it. Picked, its pictures are the
 * building's - to be demolished again, say, the bulldozers sent for the rest
 * of it after a reload. Null, out of sight.
 */
function demolitionOf(self, model) {
  var d = self.demolitions[model.tile],
    b = getBuilding(self, model.tile);

  if (d === undefined || d.over()) {
    if (b === null || !b.view) return null;

    d = new Demolition.Demolition(self.root, b, model.tiles(), {
      down: model.down || [],
    });
    self.demolitions[model.tile] = d;
  } else
    model.tiles().forEach(function (t) {
      if (model.isDown(t)) d.letGo(t);
    });

  if (b !== null) self.buildingByGO[d.go.instanceId] = b;

  return d;
}

/**
 * A building to be demolished (core/city clearTile): the bulldozers sent to
 * its tiles still standing (client/clearworks) - each tile coming down as one
 * comes up to it, the world told it is down once its rubble is pushed away
 * (core/city tileDown); in sight or not, the demolition standing in for it
 * shown doing so whenever it is.
 */
function onDemolish(sender, args, self) {
  var model = args.building,
    city = model.getCity(),
    works = self.root.clearworks,
    b = getBuilding(self, model.tile);

  demolitionOf(self, model);
  //nothing of its own drawn from now on: the demolition stands in for it
  if (b !== null && b.view) b.view.update();

  if (!works) return;

  args.tiles.forEach(function (tile) {
    works.hold(
      tile,
      function () {
        var d = self.demolitions[model.tile];

        if (d !== undefined) d.letGo(tile);
        if (city !== null) city.tileDown(tile);
      },
      function () {
        var d = self.demolitions[model.tile];

        return d !== undefined && !d.over() ? d.knock(tile) : 0;
      },
    );
  });
}

function updateBuilding(self, data) {
  var tile = data.tile,
    building;

  building = getBuilding(self, tile);

  //one off the chunks loaded has nothing drawn to update: it is drawn as
  //it is then once its chunk comes in
  if (building === null) return null;

  building.setData(data);

  //being demolished: the tiles of it down by now gone from it
  if (data.demolishing) demolitionOf(self, data);

  return building;
}

function onChunkLoad(sender, chunk, self) {
  var tiles = chunk.tiles();
  var tile,
    model,
    buildings = self.root.core.buildingService;
  while (!tiles.done) {
    tile = TileIterator.next(tiles);
    model = buildings.get(tile);
    if (model !== null && model !== undefined) createBuilding(self, model);
  }
}

function onChunkRemove(sender, chunk, self) {
  var tiles = chunk.tiles();
  var tile;
  while (!tiles.done) {
    tile = TileIterator.next(tiles);
    removeBuilding(self, tile);
  }
}

//from a tile to the next one at each side, -x, -y, +x, +y - the ways a
//one-way road can go (client/road wayOf)
var WAY_STEPS = [-1, -Terrain.dy, 1, Terrain.dy];

//how see-through a preview is: one that would go up, and one that could not
//go up right now - its ground is taken, too steep, or not paid for
var PREVIEW_OPACITY = 0.75,
  PREVIEW_BLOCKED_OPACITY = 0.35;

/**
 * A see-through copy of the building standing on tile, turned the way it would
 * be put down - so that what is about to be placed, and which way it faces, is
 * seen before the click rather than after it.
 *
 * @param data {Object} what goes up - for a type, the variant picked there
 * @returns {engine.GameObject}
 */
function createPreview(self, data, tile, rotation, opacity, look) {
  var terrain = self.root.core.world.terrain,
    tileSize = Config.tileSize,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    //as it would be seen, the camera turned (see client/view)
    at = BuildingView.drawnAt(data, tile, rotation),
    //over water it floats on the surface, which is drawn at 0 whatever
    //the depth of the bottom underneath (see client Terrain)
    z = terrain.getTerrainType(x, y) === Core.TerrainType.water ? 0 : at.z,
    go = new engine.GameObject("building preview");

  BuildingView.addSprites(
    go,
    data,
    at.rotation,
    opacity,
    RenderLayer.previewLayer,
    look,
    //the cars in its car park, as the building that goes up there has them
    tile,
  );

  //and the concrete it would stand on, under it
  if (z === at.z)
    BuildingView.addFoundations(
      go,
      data,
      tile,
      rotation,
      at,
      opacity,
      RenderLayer.overlayLayer,
    );

  //placed before it goes in - the world files it by where it stands
  go.transform.setPosition(
    at.x * tileSize,
    z * Config.tileZStep,
    at.y * tileSize,
  );
  self.root.game.logic.world.addGameObject(go);

  return go;
}

//the tiles of a selection a building would go up on, and those it would not -
//in the lawn green of the houses' yards and their roof red, lightened, so the
//selection sits in with the sprites around it
var HILITE_FILL = "rgba(146,203,68,0.12)",
  HILITE_BORDER = "rgba(146,203,68,0.7)",
  HILITE_BLOCKED_FILL = "rgba(222,98,96,0.25)",
  HILITE_BLOCKED_BORDER = "rgba(222,98,96,0.7)";

//how far around the tiles being picked the buildings standing there fade, so
//that a tower in front does not hide the ground behind it
var FADE_RADIUS = 3;
//how see-through a building is by how many tiles its nearest part is from the
//picked ones - on them, then right next to them, and so on out to the radius
var FADE_OPACITY = [0.2, 0.4, 0.6, 0.8];

/**
 * How far each tile within FADE_RADIUS of tiles is from the nearest of them,
 * 0 for the tiles themselves.
 */
function ringsAround(tiles) {
  var rings = Object.create(null),
    near,
    r,
    x,
    y,
    dx,
    dy,
    i;

  for (i = 0; i < tiles.length; i++) {
    x = Terrain.extractX(tiles[i]);
    y = Terrain.extractY(tiles[i]);

    for (dx = -FADE_RADIUS; dx <= FADE_RADIUS; dx++) {
      for (dy = -FADE_RADIUS; dy <= FADE_RADIUS; dy++) {
        near = Terrain.convertToIndex(x + dx, y + dy);
        r = Math.max(Math.abs(dx), Math.abs(dy));

        if (rings[near] === undefined || r < rings[near]) rings[near] = r;
      }
    }
  }

  return rings;
}

/**
 * Whether model is something that can stand in the way - roads lie flat and
 * trees are no taller than what is placed among them.
 */
function fades(model) {
  var classCode = model.data.classCode;

  return (
    classCode !== BuildingClassCode.road && classCode !== BuildingClassCode.tree
  );
}

/**
 * The opacity model is drawn at while fading: that of whichever part of it is
 * nearest the picked tiles.
 */
function fadeOf(self, model) {
  var tiles = model.occupiedTiles(),
    opacity = 1,
    ring;

  while (!tiles.done) {
    ring = self.fadeRings[TileIterator.next(tiles)];

    if (ring !== undefined) opacity = Math.min(opacity, FADE_OPACITY[ring]);
  }

  return opacity;
}

function fade(self, building, opacity) {
  building.view.setOpacity(opacity);
  Events.fire(self, self.events.buildingFade, building);
}

function setOpacity(self, tile, opacity) {
  var building = getBuilding(self, tile);

  //whatever stood there may have given way to a road since it was faded
  if (building !== null && building.view instanceof BuildingView)
    fade(self, building, opacity);
}

/**
 * Fades whatever stands within FADE_RADIUS of tiles, the nearer the fainter,
 * and brings back to solid what was faded before and is not near them now.
 */
function fadeAround(self, tiles) {
  var buildings = self.root.core.buildingService,
    was = self.faded,
    tile,
    model;

  self.fadeRings = ringsAround(tiles);
  self.faded = Object.create(null);

  for (tile in self.fadeRings) {
    model = buildings.get(+tile);

    if (
      model !== null &&
      self.faded[model.tile] === undefined &&
      fades(model)
    ) {
      self.faded[model.tile] = true;
      setOpacity(self, model.tile, fadeOf(self, model));
    }
  }

  for (tile in was) {
    if (self.faded[tile] === undefined) setOpacity(self, +tile, 1);
  }
}

/**
 * Everything faded by fadeAround solid again.
 */
function unfade(self) {
  fadeAround(self, []);
  self.fadeRings = null;
}

/**
 * A see-through piece id of road on tile with surface (client/road) - drawn
 * over everything, the way a building's preview is, so the trees it would
 * clear do not hide it.
 *
 * @returns {engine.GameObject}
 */
function createRoadPreview(self, tile, id, surface, opacity) {
  var go = new engine.GameObject("road preview");

  RoadView.addSprite(go, id, opacity, RenderLayer.previewLayer);
  //and the concrete it would be laid on, if any (RoadView addBase)
  RoadView.addBase(go, tile, surface, opacity, RenderLayer.overlayLayer);

  //placed before it goes in - the world files it by where it stands
  RoadView.place(go, tile, surface);
  self.root.game.logic.world.addGameObject(go);

  return go;
}

/**
 * Floats text over the middle of an area of sizeX by sizeY tiles anchored at
 * tile.
 */
function showText(self, tile, sizeX, sizeY, text, color) {
  var message = new TileMessage(text, color || "rgb(255,64,64)");
  self.root.game.logic.world.addGameObject(message);
  placeOverArea(self, message, tile, sizeX, sizeY, 0);
}

/**
 * Puts go over the middle of an area of sizeX by sizeY tiles anchored at
 * tile, height world units above the ground.
 */
function placeOverArea(self, go, tile, sizeX, sizeY, height) {
  var terrain = self.root.core.world.terrain,
    tileSize = Config.tileSize,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    //over water it floats from the surface, not from the bottom
    z =
      terrain.getTerrainType(x, y) === Core.TerrainType.water
        ? 0
        : terrain.getGridPointHeight(x + 1, y);

  go.transform.setPosition(
    (x + (sizeX - 1) / 2) * tileSize,
    z * Config.tileZStep + height,
    (y + (sizeY - 1) / 2) * tileSize,
  );
}

/**
 * A price tag that stays over a building yet to be put down, for as long as
 * it is being aimed - what it would cost, trees cleared for it included.
 * Grey when the city could not pay it.
 *
 * @returns {engine.GameObject}
 */
function createPriceTag(self, tile, sizeX, sizeY, amount, affordable) {
  return createTag(
    self,
    tile,
    sizeX,
    sizeY,
    "-$" + Numeral(amount).format("0,0"),
    !affordable,
  );
}

/**
 * A tag like the price tag with any text on it - grey for something that
 * cannot be done.
 *
 * @returns {engine.GameObject}
 */
function createTag(self, tile, sizeX, sizeY, text, grey) {
  var go = new engine.GameObject("price tag"),
    renderer = go.addComponent(new engine.TextRenderer());

  renderer.layer = RenderLayer.tagLayer;
  renderer.color = grey ? "rgb(160,160,160)" : "rgb(255,64,64)";
  renderer.style = "bold 16px Courier New";
  renderer.strokeStyle = "black";
  renderer.lineWidth = 4;
  renderer.text = text;

  //placed before it goes in - the world files it by where it stands; up
  //off the ground so the ghost underneath does not hide it
  placeOverArea(self, go, tile, sizeX, sizeY, Config.tileSize);
  self.root.game.logic.world.addGameObject(go);

  return go;
}

/**
 * Floats what it just cost over the middle of an area of sizeX by sizeY tiles
 * anchored at tile.
 */
function showCost(self, tile, sizeX, sizeY, amount) {
  showText(self, tile, sizeX, sizeY, "-$" + Numeral(amount).format("0,0"));
}

/**
 * What the player is told when a build is turned down, keyed by ErrorCode.
 */
//what a blast brings down round what went up: how long after it goes up
//the first of it gives, and how much later for every tile further off it
//is, ms; and how far apart its tiles give, about
var BLAST_GETS = 220,
  BLAST_STEP = 240,
  FALL_APART = 300;

var errorText = {};
errorText[ErrorCode.CITY_HALL_ALREADY_BUILT] = "town hall exists";
errorText[ErrorCode.BUILDING_NOT_AVAIL] = "not available";
errorText[ErrorCode.NOT_ENOUGH_RES] = "no money";
errorText[ErrorCode.CANT_BUILD_ON_WATER] = "on water";
errorText[ErrorCode.CANT_BUILD_HERE] = "can't build here";
errorText[ErrorCode.WRONG_RESOURCE_TILE] = "no deposit";
errorText[ErrorCode.LAND_NOT_SUITABLE] = "too steep";
errorText[ErrorCode.FLAT_LAND_REQUIRED] = "not flat";
errorText[ErrorCode.TILE_TAKEN] = "occupied";
errorText[ErrorCode.BEING_CLEARED] = "being cleared";
errorText[ErrorCode.ON_SHORE] = "on shore";
errorText[ErrorCode.WRONG_FOOTPRINT] = "doesn't fit";
errorText[ErrorCode.NOTHING_TO_CLEAR] = "nothing there";
errorText[ErrorCode.CANT_BURN] = "won't burn";

/**
 * Puts code down on each of anchors and tells the player why whatever did not
 * go in was turned down.
 *
 * The core reports each refusal on its own tile, and over an area the same
 * reason tends to repeat everywhere - so each reason is said once, where it
 * first came up. "Occupied" only when nothing went in at all: a road laid
 * across another is turned down where they cross, and that is no news.
 *
 * @param anchors {number[]} the tile each building would stand on
 * @param codes {number[]} what goes up on each of them - for a type, the
 *        variant picked there
 * @param looks {Array<Object|null>} and for a building put together out of
 *        parts, the look it was shown with - see client/compoundbuilding
 * @param [surfaces] {Array<number[]>} and for a road, the surface it was
 *        planned with (Road.plan)
 */
function buildSelection(self, code, anchors, rotation, codes, looks, surfaces) {
  var root = self.root,
    data = BuildingData[code],
    messaging = root.core.messagingService,
    errors = [],
    tried = 0,
    i,
    seen = {};

  var sub = Events.on(
    messaging,
    Core.MessagingService.events.tileMessage,
    function (sender, message) {
      if (message.type === Core.MessageType.tileError) errors.push(message);
    },
  );

  try {
    for (i = 0; i < anchors.length; i++) {
      //a road there, which a road laid in more may pave over
      var there = root.core.buildingService.get(anchors[i]),
        was =
          there !== null && there.data.classCode === BuildingClassCode.road
            ? RoadRules.materialOf(there)
            : null;

      tried++;
      root.core.cities
        .getCity(0)
        .buildingService.buildBuilding(
          codes[i],
          anchors[i],
          rotation,
          looks[i],
          surfaces ? surfaces[i] : undefined,
        );

      //laid again: what it cost floats over it, as a new road's does
      if (was !== null && RoadRules.materialOf(there) !== was)
        showConstructionCost(self, there);
    }
  } finally {
    Events.off(messaging, Core.MessagingService.events.tileMessage, sub);
  }

  for (i = 0; i < errors.length; i++) {
    var reason = errors[i].text;

    if (
      seen[reason] ||
      (reason === ErrorCode.TILE_TAKEN && errors.length < tried)
    )
      continue;

    seen[reason] = true;
    showText(
      self,
      errors[i].tile,
      Rotation.sizeX(data, rotation),
      Rotation.sizeY(data, rotation),
      errorText[reason] || "can't build",
    );
  }
}

/**
 * Green and red of the tiles under a selection, for whoever else lets the
 * player pick ground.
 */
Buildman.HILITE_FILL = HILITE_FILL;
Buildman.HILITE_BORDER = HILITE_BORDER;
Buildman.HILITE_BLOCKED_FILL = HILITE_BLOCKED_FILL;
Buildman.HILITE_BLOCKED_BORDER = HILITE_BLOCKED_BORDER;

/**
 * One text per built instance - a road tile is an instance of its own, while a
 * multi tile building gets a single text over the middle of its footprint.
 */
function showConstructionCost(self, model) {
  var data = model.data,
    //what the city was actually charged, trees cleared for the site
    //included - only a build the player paid for carries it
    cost =
      model.expense !== undefined
        ? model.expense
        : data.constructionCost && data.constructionCost[ResourceCode.money];

  if (!cost) return;

  showCost(
    self,
    model.tile,
    Rotation.sizeX(data, model.rotation),
    Rotation.sizeY(data, model.rotation),
    cost,
  );
}

/**
 * The old towns round a building that went up or came down drawn again: an
 * old town next to it may have one wall with it now, or a wall of its own
 * again, a gate where a road comes up to it or none (client/compoundbuilding
 * walled).
 */
function rewall(self, building) {
  var tiles = [],
    iter = building.occupiedTiles();

  while (!iter.done) tiles.push(TileIterator.next(iter));

  CompoundBuilding.townsAround(self.root.core.buildingService, tiles).forEach(
    function (town) {
      var view = town !== building ? getBuilding(self, town.tile) : null;

      if (view !== null && view.view) view.view.update();
    },
  );
}

/**
 * The heaps of rubble round tiles drawn again (client/rubble): one next to
 * them may run on into a heap that came, or not into one that went - and
 * the ones the bulldozers are still to get to as well.
 */
function repile(self, tiles) {
  Rubble.around(tiles).forEach(function (t) {
    [getBuilding(self, t), self.held[t]].forEach(function (b) {
      if (b && b.view && Rubble.isRubble(b)) b.view.update();
    });
  });
}

//every tile a building stands on
function tilesOf(building) {
  var tiles = [],
    iter = building.occupiedTiles();

  while (!iter.done) tiles.push(TileIterator.next(iter));

  return tiles;
}

function onBuildingBuilt(sender, building, self) {
  createBuilding(self, building);
  showConstructionCost(self, building);
  rewall(self, building);
  repile(self, tilesOf(building));

  //one waiting for its ground to be cleared before it goes up: the
  //bulldozers out to it (client/clearworks sweep)
  if (building.clearing && building.clearing() && self.root.clearworks)
    self.root.clearworks.sweep(tilesOf(building));
}

function onBuildingUpdated(sender, building, self) {
  updateBuilding(self, building);
}

function onBuildingRemoved(sender, building, self) {
  var d = self.demolitions[building.tile];

  //all of it down: the demolition is over once its rubble is pushed away
  if (d !== undefined) {
    delete self.buildingByGO[d.go.instanceId];
    delete self.demolitions[building.tile];
  }

  removeBuilding(self, building.tile);
  rewall(self, building);
  repile(self, tilesOf(building));
}

var events = {
  buildingAdded: 0,
  buildingRemoved: 1,
  buildingAdd: 0,
  buildingRemove: 1,
  buildingLoad: 0,
  buildingUnload: 1,
  //one was faded or made solid again, so that whatever is drawn over it
  //can follow suit
  buildingFade: 2,
};

function Buildman(main) {
  EventManager.call(this);

  this.buildingByXY = [];
  this.buildingByGO = {};
  //the demolitions standing in for buildings being demolished, by the tile
  //of the building (demolitionOf)
  this.demolitions = {};
  this.root = main;
  //the trees and the roads cleared away, still there till the bulldozer
  //gets to them (hold), by the tile
  this.held = {};

  //what fadeAround last faded, by the tile it stands on, and how far the
  //tiles around the picked ones are from them - null while nothing is
  this.faded = Object.create(null);
  this.fadeRings = null;

  //what the last road was laid in and which ways it went, for the next to
  //start out the same (build) - till the page is left
  this.lastRoad = { material: "gravel", way: "two" };
}

Buildman.events = events;

Buildman.prototype = Object.create(EventManager.prototype);

/**
 * A see-through copy of code standing on tile, the way one being placed is
 * shown - fainter where it could not go up.
 *
 * @returns {engine.GameObject} to destroy once it is not wanted any more
 */
Buildman.prototype.preview = function (code, tile, rotation, ok) {
  return createPreview(
    this,
    BuildingData[code],
    tile,
    rotation,
    ok ? PREVIEW_OPACITY : PREVIEW_BLOCKED_OPACITY,
  );
};

/**
 * Floats money the city just got over tile - the other way round from what a
 * build costs: green, and with a plus.
 *
 * @param tile {number}
 * @param amount {number}
 */
Buildman.prototype.showIncome = function (tile, amount) {
  showText(
    this,
    tile,
    1,
    1,
    "+$" + Numeral(amount).format("0,0"),
    "rgb(96,224,96)",
  );
};

/**
 * Floats why something was turned down over tile, the way a refused build is.
 *
 * @param tile {number}
 * @param reason {number} ErrorCode
 */
Buildman.prototype.showError = function (tile, reason) {
  showText(this, tile, 1, 1, errorText[reason] || "can't build");
};

/**
 * What goes up in the place of building as code: a variant of code's own -
 * for a type, any of them (data/buildings variants) - and, for one put
 * together out of parts, a look of its own (client/compoundbuilding). For the
 * kind of building it is, another variant than it is, or another look,
 * where there is another to be had: replaced with itself, it goes up
 * another way.
 *
 * @returns {{code: number, look: Object|undefined}}
 */
function replacementOf(self, code, building) {
  var same =
      Replacement.kindOf(code) === Replacement.kindOf(building.buildingCode),
    was = JSON.stringify(building.look || null),
    variant,
    compound,
    look,
    tries;

  for (tries = 0; tries < 8; tries++) {
    variant = CityBuildings.variantOf(parseInt(code, 10));
    if (!same || variant !== building.buildingCode) break;
  }

  compound = BuildingData[variant].compound;

  for (tries = 0; compound !== undefined && tries < 8; tries++) {
    look = CompoundBuilding.pickLook(self.root.sprites, compound);
    if (
      !same ||
      variant !== building.buildingCode ||
      JSON.stringify(look) !== was
    )
      break;
  }

  return { code: variant, look: look };
}

/**
 * Puts code up in the place of the building standing on tile - a shortcut
 * for clearing it away and building on its ground (core/city replace): it
 * is fenced off and comes down as the bulldozers get to it, as clearing it
 * would (client/clearworks, client/demolition), and code goes up on its
 * ground, a building site, as soon as the last of it is gone - turned the
 * way the building was, where it fits so, or the way that fits it with
 * the most of a road along its front (core/replacement turnFor). What it
 * all came to - the clearing and code - floats up over it once, or why it
 * was turned down.
 *
 * @param tile {number} any tile of the building
 * @param code {number|string} a building, or a type - another variant of
 *        it, for the kind the building is
 * @returns {number} ErrorCode - NONE once it is under way
 */
Buildman.prototype.replace = function (tile, code) {
  var root = this.root,
    core = root.core,
    building = core.buildingService.get(tile),
    //the world's city, whatever it stands in (core/construction getCity)
    city = building !== null ? building.getCity() : null,
    result = null,
    rotation,
    picked,
    sizeX,
    sizeY;

  if (!city || building === null || !Replacement.replaceable(building)) {
    this.showError(tile, ErrorCode.NOTHING_TO_CLEAR);
    return ErrorCode.NOTHING_TO_CLEAR;
  }

  sizeX = Rotation.sizeX(building.data, building.rotation);
  sizeY = Rotation.sizeY(building.data, building.rotation);
  rotation = Replacement.turnFor(core, code, building);

  if (rotation < 0) {
    showText(
      this,
      building.tile,
      sizeX,
      sizeY,
      errorText[ErrorCode.WRONG_FOOTPRINT],
    );
    return ErrorCode.WRONG_FOOTPRINT;
  }

  picked = replacementOf(this, code, building);

  //it goes, and with it whatever was shown of it
  if (root.serviceman) {
    root.serviceman.hideCoverage();
    root.serviceman.hideInfo();
  }

  function replace(t) {
    result = city.replace(t, picked.code, rotation, picked.look);

    return result.tiles;
  }

  if (root.clearworks) root.clearworks.clear([building.tile], replace);
  else replace(building.tile);

  if (result.error !== ErrorCode.NONE)
    showText(
      this,
      result.tile,
      sizeX,
      sizeY,
      errorText[result.error] || "can't build",
    );
  else showCost(this, result.tile, sizeX, sizeY, result.cost);

  return result.error;
};

/**
 * Clears away the building standing on tile, as clearing its ground does
 * (core/city clearTile): paid for there and then, one clearing charge for
 * every tile of it - what it came to floated up over it once - fenced off,
 * and brought down by the bulldozers where it stands, a tile at a time,
 * the ground left clear (client/clearworks, client/demolition).
 *
 * @param tile {number} any tile of the building
 * @returns {number} ErrorCode - NONE once the bulldozers are at it
 */
Buildman.prototype.demolish = function (tile) {
  var root = this.root,
    building = root.core.buildingService.get(tile),
    city = building !== null ? building.getCity() : null,
    total = 0,
    tiles = [],
    quote;

  if (!city || building === null || !Replacement.replaceable(building)) {
    this.showError(tile, ErrorCode.NOTHING_TO_CLEAR);
    return ErrorCode.NOTHING_TO_CLEAR;
  }

  var iter = building.occupiedTiles(),
    sizeX = Rotation.sizeX(building.data, building.rotation),
    sizeY = Rotation.sizeY(building.data, building.rotation);

  while (!iter.done) tiles.push(TileIterator.next(iter));

  quote = city.quoteClear(tiles);

  if (quote.error !== ErrorCode.NONE) {
    showText(
      this,
      building.tile,
      sizeX,
      sizeY,
      errorText[quote.error] || "can't clear",
    );
    return quote.error;
  }

  //it goes, and with it whatever was shown of it
  if (root.serviceman) {
    root.serviceman.hideCoverage();
    root.serviceman.hideInfo();
  }

  function clear(t) {
    var cleared = city.clearTile(t);

    total +=
      cleared.cost !== undefined
        ? cleared.cost
        : cleared.length * Core.Config.clearTileCost;

    return cleared;
  }

  if (root.clearworks) root.clearworks.clear([building.tile], clear);
  else clear(building.tile);

  if (total > 0) showCost(this, building.tile, sizeX, sizeY, total);

  return ErrorCode.NONE;
};

/**
 * Blows up the building standing on tile, for nothing (core/city explode):
 * it is gone at once, rubble left on every tile of the building itself and
 * its yard wrecked - and what it looked like goes up where it stood
 * (client/explosion), no fence and no bulldozer about it, and comes down.
 * The blast off it - off the building, not its yard - brings down the
 * parts of whatever stands round it it takes all the health out of, next
 * to it or across a road from it, as it gets to them, the nearest first
 * (client/collapse), the rest of each standing; a building with no part of
 * it left standing, all of it. And the trees round it go over, to lie
 * there.
 *
 * @param tile {number} any tile of the building
 * @returns {number} ErrorCode - NONE once it has gone up
 */
Buildman.prototype.explode = function (tile) {
  var self = this,
    root = this.root,
    building = root.core.buildingService.get(tile),
    city = building !== null ? building.getCity() : null,
    yard = {},
    seen,
    blast = null,
    falls = [],
    result;

  if (!city || building === null || !Replacement.replaceable(building)) {
    this.showError(tile, ErrorCode.NOTHING_TO_CLEAR);
    return ErrorCode.NOTHING_TO_CLEAR;
  }

  //being demolished: the bulldozers are bringing it down already (core/city
  //explode)
  if (building.demolishing) {
    this.showError(tile, ErrorCode.BEING_CLEARED);
    return ErrorCode.BEING_CLEARED;
  }

  //it goes, and with it whatever was shown of it
  if (root.serviceman) {
    root.serviceman.hideCoverage();
    root.serviceman.hideInfo();
  }

  //which tiles are only yards - of it, and of what stands round it - as
  //they are drawn, while they stand to be told
  function know(b) {
    var y = b !== null && b.view ? Collapse.yards(root, b) : {};

    for (var t in y) yard[t] = true;
  }

  function isYard(t) {
    return yard[t] === true;
  }

  seen = getBuilding(this, building.tile);
  know(seen);

  var tiles = building.tiles(),
    built = tiles.filter(function (t) {
      return !isYard(t);
    }),
    from = built.length > 0 ? built : tiles;

  city.blast(from, building).forEach(function (r) {
    know(getBuilding(self, r.building.tile));
  });

  var round = city.blast(from, building, isYard),
    trees = city.treesIn(from);

  //what it looks like, stood up in its place before the world lets go of
  //it - if it is drawn at all
  if (seen !== null && seen.view && seen.view.gameObject)
    blast = new Explosion.Explosion(root, seen, built, tiles.filter(isYard));

  //and what of what is round it comes down, as it stands, the blast getting
  //to it a moment after it goes up - further off, later
  round.forEach(function (r) {
    var b = r.building,
      view = getBuilding(self, b.tile),
      //what of it comes down, as the world will have it (core/city falls)
      gives = city.falls(b, r.parts, isYard, building.tile);

    if (gives.tiles.length === 0 || view === null || !view.view) return;

    var fall = gives.tiles.filter(function (t) {
        return !isYard(t);
      }),
      wrecked = gives.tiles.filter(isYard);

    falls.push(
      new Collapse.Collapse(root, view, fall, {
        delay:
          Explosion.Explosion.FUSE_MS +
          BLAST_GETS +
          r.distance * BLAST_STEP +
          Math.random() * BLAST_STEP,
        apart: FALL_APART,
        from: blast !== null ? [blast.mx, blast.mz] : null,
        yards: wrecked,
        yardsAt: Explosion.Explosion.FUSE_MS + r.distance * 60,
      }),
    );
  });

  //the trees round it, held standing as the world lets go of them, to go
  //over as the blast gets to them
  root.blasted = {};
  if (blast !== null)
    trees.forEach(function (t) {
      root.blasted[t.tile] = function (letGo, expect) {
        var d = Math.max(
          Math.abs(Terrain.extractX(t.tile) * Config.tileSize - blast.mx),
          Math.abs(Terrain.extractY(t.tile) * Config.tileSize - blast.mz),
        );

        expect(t.way);
        blast.fell(
          t.tile,
          t.way,
          BLAST_GETS + (d / Config.tileSize) * BLAST_STEP * 0.6,
          letGo,
        );
      };
    });

  result = city.explode(tile, isYard);
  root.blasted = null;

  if (result.error !== ErrorCode.NONE) {
    if (blast !== null) blast.stop();
    falls.forEach(function (f) {
      f.stop();
    });
    this.showError(tile, result.error);
    return result.error;
  }

  if (blast !== null) blast.light();
  falls.forEach(function (f) {
    f.start();
  });

  return ErrorCode.NONE;
};

/**
 * A building coming down by itself, so little health left (core/city
 * collapse): what it looks like stood up in its place, all of it there is
 * left coming down a tile at a time, no fence, no bulldozer (client/
 * collapse) - set going once the world has let go of it.
 */
function onCollapse(sender, args, self) {
  var b = getBuilding(self, args.building.tile),
    model = args.building;

  if (b === null || !b.view || !b.view.gameObject) return;

  if (self.root.serviceman && self.root.serviceman.inspected() === model)
    self.root.serviceman.hideInfo();

  self.falling = self.falling || [];
  self.falling.push(
    new Collapse.Collapse(self.root, b, args.tiles, {
      delay: 120,
      apart: FALL_APART,
      yards: model.tiles().filter(function (t) {
        return model.isYard(t) && !model.isDown(t);
      }),
      yardsAt: 120,
    }),
  );
}

function onCollapsed(sender, args, self) {
  (self.falling || []).forEach(function (f) {
    f.start();
  });
  self.falling = [];
}

/**
 * Sets the building on tile on fire (core/city fireUp): it burns, the fire
 * spreading through it, over most of a day, comes down, and what is left of
 * it smoulders on a while - a burnt-out ruin then, till it is cleared
 * (client/fires). Looked at, it is looked at still, as it burns.
 *
 * @returns {number} ErrorCode
 */
Buildman.prototype.fireUp = function (tile) {
  var building = this.root.core.buildingService.get(tile),
    city = building !== null ? building.getCity() : null,
    error;

  if (!city || building === null || !Replacement.replaceable(building)) {
    this.showError(tile, ErrorCode.NOTHING_TO_CLEAR);
    return ErrorCode.NOTHING_TO_CLEAR;
  }

  error = city.fireUp(tile);

  if (error !== ErrorCode.NONE) {
    this.showError(tile, error);
    return error;
  }

  //looked at still, as it is now: what it gave the city it gives no more
  if (this.root.serviceman) this.root.serviceman.reinspect();
  changed();

  return ErrorCode.NONE;
};

Buildman.prototype.events = events;

Buildman.prototype.start = function () {
  //the camera turned (see client/view): every building and road drawn again,
  //from the side of it that is seen now - from the start, as the camera
  //turns the way the city was left (client/cityman) before init, and views
  //are up by then whenever their chunks were streamed in already
  Events.on(
    View,
    View.events.change,
    function (sender, args, self) {
      var views = self.getBuildingViews();

      for (var i = 0; i < views.length; i++)
        if (views[i].view) views[i].view.update();

      for (var tile in self.held) self.held[tile].view.update();
    },
    this,
  );

  Events.on(this.root.chunkman, Chunkman.events.chunkLoad, onChunkLoad, this);
  Events.on(
    this.root.chunkman,
    Chunkman.events.chunkUnload,
    onChunkRemove,
    this,
  );

  var core = this.root.core;

  Events.on(
    core.constructionService,
    ConstructionService.events.buildingBuilt,
    onBuildingBuilt,
    this,
  );
  Events.on(
    core.constructionService,
    ConstructionService.events.buildingUpdated,
    onBuildingUpdated,
    this,
  );
  Events.on(
    core.constructionService,
    ConstructionService.events.buildingRemoved,
    onBuildingRemoved,
    this,
  );
  //what comes down by itself, so little health left (core/city collapse)
  Events.on(
    core.constructionService,
    ConstructionService.events.buildingCollapse,
    onCollapse,
    this,
  );
  Events.on(
    core.constructionService,
    ConstructionService.events.buildingCollapsed,
    onCollapsed,
    this,
  );
  Events.on(
    core.constructionService,
    ConstructionService.events.buildingDemolish,
    onDemolish,
    this,
  );
};

/**
 * Takes over the chunks that were already loaded before anyone was listening.
 *
 * A city out of a save is standing in the world before the client comes up, so
 * the chunks it sits on can have been loaded without a single chunkLoad going
 * out - whatever stands on them gets its view here. Runs once the rest of the
 * client is subscribed, so that roadman sees the roads it has to join up.
 */
Buildman.prototype.init = function () {
  var chunks = this.root.chunkman.getChunks();

  for (var i = 0; i < chunks.length; i++)
    onChunkLoad(this.root.chunkman, chunks[i], this);
};

/**
 * What the player clicked on, if they clicked on a building at all.
 *
 * A tall building is drawn well above the tile it stands on - the tile under
 * the cursor halfway up a water tower is the ground behind it - so this tests
 * the sprites themselves and traces whichever was hit back to its building.
 *
 * Whoever handles a click asks this first: a click that landed on a building
 * belongs to the building, not to the land underneath it.
 *
 * @returns {Building|null} the core building, not its view
 */
Buildman.prototype.pickBuilding = function (screenX, screenY) {
  var gos = this.root.camera.cameraScript.pickGameObject(screenX, screenY),
    view,
    i;

  for (i = 0; i < gos.length; i++) {
    view = viewOfGameObject(this, gos[i]);

    if (view !== null) return view.model();
  }

  return null;
};

/**
 * Walks up from a picked sprite to the view it is part of.
 */
function viewOfGameObject(self, go) {
  var transform = go.transform,
    view;

  while (transform !== null && transform !== undefined) {
    view = self.buildingByGO[transform.gameObject.instanceId];

    if (view !== undefined) return view;

    transform = transform.parent;
  }

  return null;
}

/**
 * Every building view there is right now.
 *
 * Whoever starts up after some of these were made needs to catch up on them -
 * chunks can be streamed in by something as innocent as the camera being moved
 * onto a loaded city, which happens while the client is still starting.
 *
 * @returns {Building[]}
 */
Buildman.prototype.getBuildingViews = function () {
  var byXY = this.buildingByXY,
    r = [],
    x,
    y;

  for (x in byXY) {
    for (y in byXY[x]) r.push(byXY[x][y]);
  }

  return r;
};

Buildman.prototype.getBuilding = function (tile_or_x, y) {
  var tile;

  if (arguments.length === 2) tile = Terrain.convertToIndex(tile_or_x, y);
  else tile = tile_or_x;

  return getBuilding(this, tile);
};

/**
 * Floats text over the middle of an area of sizeX by sizeY tiles anchored at
 * tile - the way a build that was turned down says why.
 */
Buildman.prototype.showText = function (tile, sizeX, sizeY, text) {
  showText(this, tile, sizeX, sizeY, text);
};

/**
 * Floats what something just cost over the middle of an area of sizeX by
 * sizeY tiles anchored at tile.
 */
Buildman.prototype.showCost = function (tile, sizeX, sizeY, amount) {
  showCost(this, tile, sizeX, sizeY, amount);
};

/**
 * A price tag over the middle of an area of sizeX by sizeY tiles anchored at
 * tile, the kind a building being placed carries - it stays until destroyed.
 *
 * @param affordable {boolean} grey when not
 * @returns {engine.GameObject}
 */
Buildman.prototype.createPriceTag = function (
  tile,
  sizeX,
  sizeY,
  amount,
  affordable,
) {
  return createPriceTag(this, tile, sizeX, sizeY, amount, affordable);
};

/**
 * The same, with text of its own on it in grey - why it cannot be done.
 *
 * @returns {engine.GameObject}
 */
Buildman.prototype.createTag = function (tile, sizeX, sizeY, text) {
  return createTag(this, tile, sizeX, sizeY, text, true);
};

/**
 * Fades whatever stands around tiles, the nearer the fainter, so that a tower
 * in front does not hide the ground being picked - and brings back to solid
 * what the last call faded and this one does not.
 */
Buildman.prototype.fadeAround = function (tiles) {
  fadeAround(this, tiles);
};

/**
 * Everything faded by fadeAround solid again.
 */
Buildman.prototype.unfade = function () {
  unfade(this);
};

//the toggles a road is laid with, by what it is laid in (city-sim's icons,
//by name): as it is while another is on, and when on, driven both ways, one
//way only - the way it is dragged - or one way the other way round
var ROAD_TOOLS = [
  {
    material: "gravel",
    off: "gravel",
    two: "gravel-two",
    one: "gravel-one",
    back: "gravel-back",
  },
  {
    material: "cobble",
    off: "cobble",
    two: "cobble-two",
    one: "cobble-one",
    back: "cobble-back",
  },
  {
    material: "asphalt",
    off: "asphalt",
    two: "asphalt-two",
    one: "asphalt-one",
    back: "asphalt-back",
  },
];

//which ways a road toggled on again goes next: both ways, one way, the
//other way round, and both ways again
var NEXT_WAY = { two: "one", one: "back", back: "two" };

/**
 * Puts the player to placing code: a selection to drag about and resize,
 * the buildings it would put down shown on it, until they confirm or leave.
 *
 * A road is laid in what is toggled on below the selection meanwhile (see
 * ROAD_TOOLS) - toggled on again, it goes one way only, again the other way
 * round, without the selection having to be dragged out the other way, and
 * again both ways. It starts out the way the last road was laid
 * (lastRoad).
 *
 * @param [options] {{material: string, way: string}} for a road, what it is
 *        laid in to start with - "gravel", "cobble" or "asphalt" (see
 *        Road.materialAt) - and "one" for a one-way road, "back" for one the
 *        other way round from how it is dragged, "two" for one driven both
 *        ways; lastRoad's where left out
 */
Buildman.prototype.build = function (code, options) {
  var self = this;
  var root = this.root;
  var data = BuildingData[code];
  var isRoad = data.classCode === BuildingClassCode.road;
  var material = (options && options.material) || self.lastRoad.material;
  var way = !isRoad ? "two" : (options && options.way) || self.lastRoad.way;
  var oneWay = isRoad && way !== "two";

  //a one-way road goes the way it is dragged: from the end it was started
  //at - the tile the selection was on while it was a single one - on to the
  //finger, and round every corner on the way; turned round, the other way
  //(a single tile turns a quarter at a time) - and toggled the other way
  //round (way "back"), the other way. The way of each tile of it, 0..3 for
  //-x, -y, +x, +y (client/road wayOf)
  var start = -1,
    turn = 0,
    ways = Object.create(null);

  function flowOf(tiles) {
    var on = Object.create(null),
      out = Object.create(null),
      first = -1,
      best = Infinity;

    tiles.forEach(function (tile) {
      on[tile] = true;
    });

    function around(tile) {
      return WAY_STEPS.filter(function (step) {
        return on[tile + step] === true;
      }).length;
    }

    //a single tile along +x - or along +y where it carries on a road that
    //runs that way, so that it can be laid, and flipped, along it
    if (tiles.length === 1) {
      var tile = tiles[0],
        roadman = root.roadman,
        alongY =
          (roadman.anyRoad(tile + Terrain.dy) !== null ||
            roadman.anyRoad(tile - Terrain.dy) !== null) &&
          roadman.anyRoad(tile + 1) === null &&
          roadman.anyRoad(tile - 1) === null;

      out[tile] = ((alongY ? 3 : 2) + turn + (way === "back" ? 2 : 0)) % 4;
      return out;
    }

    //from whichever end of the run is nearest where it was started
    tiles.forEach(function (tile) {
      if (around(tile) > 1) return;

      var d =
        start < 0
          ? 0
          : Math.abs(Terrain.extractX(tile) - Terrain.extractX(start)) +
            Math.abs(Terrain.extractY(tile) - Terrain.extractY(start));

      if (d < best) {
        best = d;
        first = tile;
      }
    });

    if (first < 0) first = on[start] === true ? start : tiles[0];

    //on along the run from there, each tile the way it is come into - the
    //first the way it is left by
    var queue = [first],
      seen = Object.create(null);

    seen[first] = true;

    for (var head = 0; head < queue.length; head++)
      WAY_STEPS.forEach(function (step, side) {
        var next = queue[head] + step;

        if (on[next] !== true || seen[next] === true) return;

        seen[next] = true;
        out[next] = side;
        if (out[queue[head]] === undefined) out[queue[head]] = side;
        queue.push(next);
      });

    //turned round, every tile the other way
    if ((turn % 2 === 1) !== (way === "back"))
      Object.keys(out).forEach(function (tile) {
        out[tile] = (out[tile] + 2) % 4;
      });

    return out;
  }

  //what this thing would water from where it is being placed, so that a
  //tower is placed by what it will reach rather than by guesswork
  var waterRadius = CityWater.radius(code);

  //quarter turns, 0..3
  var rotation = 0;

  //the building's footprint the way it is turned - Construction#occupiedTiles
  //and the under-construction site placeholder (buildingview.js) swap
  //sizeX/sizeY the same way when rotated
  function sizeX() {
    return Rotation.sizeX(data, rotation);
  }

  function sizeY() {
    return Rotation.sizeY(data, rotation);
  }

  //what goes up on each footprint of the selection, by where in the
  //selection it is - for a type, which of its variants: picked the first
  //time the selection has a footprint there, and kept while it is dragged
  //about, so that the preview does not shuffle under the finger and what
  //goes up is what was shown. Only a selection of another size - another
  //row or column of them - picks again
  var variants = Object.create(null),
    //the footprint of the selection each tile it covers starts, by tile -
    //"column,row" from its corner - and the selection's size
    slots = Object.create(null),
    shape = "";

  /**
   * Finds where in the selection each of its footprints is - and when the
   * selection is not the size it was, lets go of what was picked for it.
   */
  function layout(anchors) {
    var x0 = Infinity,
      y0 = Infinity,
      cols = 0,
      rows = 0;

    anchors.forEach(function (tile) {
      x0 = Math.min(x0, Terrain.extractX(tile));
      y0 = Math.min(y0, Terrain.extractY(tile));
    });

    slots = Object.create(null);
    anchors.forEach(function (tile) {
      var c = Math.round((Terrain.extractX(tile) - x0) / sizeX()),
        r = Math.round((Terrain.extractY(tile) - y0) / sizeY());

      slots[tile] = c + "," + r;
      cols = Math.max(cols, c + 1);
      rows = Math.max(rows, r + 1);
    });

    var now = anchors.length + ":" + cols + "x" + rows;

    if (now !== shape) {
      shape = now;
      variants = Object.create(null);
      looks = Object.create(null);
    }
  }

  function variantAt(tile) {
    var slot = slots[tile];

    if (variants[slot] === undefined)
      variants[slot] = CityBuildings.variantOf(code);

    return variants[slot];
  }

  //and for a building put together out of parts, the look of the one going
  //up there - picked, and kept, the same way, so that every block of the
  //selection shows the block it will be
  var looks = Object.create(null);

  function lookAt(tile) {
    //a road: what it is laid in, there - and the way it goes, one-way
    if (data.classCode === BuildingClassCode.road) {
      var look = {
        material: Road.materialAt(material, tile, root.core.buildingService),
      };

      if (oneWay && ways[tile] !== undefined) look.way = ways[tile];

      return look;
    }

    var compound = BuildingData[variantAt(tile)].compound,
      slot = slots[tile];

    if (compound === undefined) return null;

    if (!looks[slot])
      looks[slot] = CompoundBuilding.pickLook(root.sprites, compound);

    return looks[slot];
  }

  //for a road, what each of tiles would be laid in - a road there already
  //that it is more than is laid again (core/city/citybuildings upgradeOf)
  function roadLooks(tiles) {
    return isRoad ? tiles.map(lookAt) : undefined;
  }

  //show hint - for a one-way road, the way it goes. Turned round, it is
  //only where there is a turn button for it (see controls.tools below)
  function showHint(turnable) {
    root.ui
      .gameScreen()
      .worldScreen()
      .showHint(
        founding()
          ? "What goes up first founds the city - drag it where it should be!"
          : !oneWay
            ? "Drag to place, pull arrows to resize!"
            : turnable
              ? "Drag the way the traffic goes, turn to flip it!"
              : way === "one"
                ? "One way, as dragged - tap the road again to flip it!"
                : "One way, flipped - tap the road again for both ways!",
      );
  }

  //what is being put down, for the game played to show what it would do -
  //null once nothing is
  function placing(what) {
    if (root.play && root.play.placing) root.play.placing(what);
  }

  //before there is a city, what goes up first founds it (City.quoteFounding)
  function founding() {
    return !root.core.cities.getCity(0);
  }

  //what each building of the selection would cost, and whether it can go up
  function quoteOf(tiles) {
    if (founding())
      return Core.City.quoteFounding(root.core.world, code, tiles, rotation);

    return root.core.cities
      .getCity(0)
      .buildingService.quoteSelection(code, tiles, rotation, roadLooks(tiles));
  }

  //the city, named and founded where the first of the selection goes up -
  //and the selection built in it, as any other: the player back in the
  //world then, on their city. Not named, it goes on being placed
  function found(anchors) {
    var quotes = quoteOf(anchors),
      tile = null,
      i;

    for (i = 0; i < quotes.length; i++)
      if (quotes[i].error === ErrorCode.NONE) {
        tile = quotes[i].tile;
        break;
      }

    if (tile === null) {
      self.showError(
        anchors[0],
        quotes.length > 0
          ? quotes[0].error
          : root.core.buildingService.test(code, anchors[0], rotation),
      );
      return;
    }

    root.ui.gameScreen().showPrompt(
      "Give city a name!",
      function (name) {
        //the money it starts out with comes up with it, in the game's own
        //screens - and what the house cost floats over the house
        if (root.core.cities.establishCity(tile, name))
          buildSelection(
            self,
            code,
            anchors,
            rotation,
            anchors.map(variantAt),
            anchors.map(lookAt),
            null,
          );

        controls.onDiscard();
      },
      ["Miniville", "Peepsville", "Flatville", "Greenville", "Happyville"][
        Math.floor(Math.random() * 5)
      ],
      function () {
        var screen = root.ui.gameScreen();

        if (screen.hidePrompt) screen.hidePrompt();
        else controls.onDiscard();
      },
    );
  }

  //the selection covers whole footprints, one building each
  var tokens = [];
  var ts = new AreaSelector(this.root, {
    stepX: sizeX(),
    stepY: sizeY(),
    //a road is laid a line at a time: pulled out it can turn a corner on
    //the way, and there is no rectangle to pull by its corners
    turns: data.classCode === BuildingClassCode.road,
    corners: data.classCode !== BuildingClassCode.road,
    //and a road tapped is somewhere to lay one, not one to look at
    roads: data.classCode === BuildingClassCode.road,
  });
  var previews = [];
  //roads already standing that are showing what they would turn into
  var reshaped = [];
  var priceTags = [];

  //one tag over every building the selection would put down, priced the
  //way a submit would charge it
  function updatePriceTags(quotes) {
    var i;

    for (i = 0; i < priceTags.length; i++) priceTags[i].destroy();
    priceTags = [];

    for (i = 0; i < quotes.length; i++) {
      if (quotes[i].cost > 0)
        priceTags.push(
          createPriceTag(
            self,
            quotes[i].tile,
            sizeX(),
            sizeY(),
            quotes[i].cost,
            quotes[i].error === ErrorCode.NONE,
          ),
        );
    }
  }

  function clearPreview() {
    var i;

    for (i = 0; i < previews.length; i++) previews[i].destroy();
    previews = [];

    //back to their own pieces
    for (i = 0; i < reshaped.length; i++)
      reshaped[i].view.showPiece(reshaped[i].typeCode);
    reshaped = [];
  }

  //the opacity each quoted tile's preview is drawn at
  function opacities(quotes) {
    var r = Object.create(null);

    for (var i = 0; i < quotes.length; i++)
      r[quotes[i].tile] =
        quotes[i].error === ErrorCode.NONE
          ? PREVIEW_OPACITY
          : PREVIEW_BLOCKED_OPACITY;

    return r;
  }

  //every tile under a footprint whose building would go up - the rest of
  //the selection is turned down, for its ground or for its price
  function buildableTiles(quotes) {
    var r = Object.create(null),
      x,
      y,
      i;

    for (i = 0; i < quotes.length; i++) {
      if (quotes[i].error !== ErrorCode.NONE) continue;

      for (x = 0; x < sizeX(); x++) {
        for (y = 0; y < sizeY(); y++)
          r[quotes[i].tile + x + y * Terrain.dy] = true;
      }
    }

    return r;
  }

  //every building the selection covers, turned the way it would be put
  //down - faint where it could not go up
  function previewBuildings(tiles, quotes) {
    var opacity = opacities(quotes);

    for (var i = 0; i < tiles.length; i++)
      previews.push(
        createPreview(
          self,
          BuildingData[variantAt(tiles[i])],
          tiles[i],
          rotation,
          opacity[tiles[i]] || PREVIEW_BLOCKED_OPACITY,
          lookAt(tiles[i]),
        ),
      );
  }

  //the roads as they would look once laid: each piece joined up with the
  //ones around it, new and old alike, and the old ones they meet showing
  //what they would turn into. Where no road can go there is nothing
  //the roads that would go down for quotes, laid as they best go together
  //with each other and the roads there (Road.plan) - the ones turned down
  //for want of money too, as they would be laid with it
  function plannedRoads(quotes, run) {
    return Road.plan(
      root.core.terrain,
      root.roadman,
      quotes
        .filter(function (q) {
          return (
            q.error === ErrorCode.NONE || q.error === ErrorCode.NOT_ENOUGH_RES
          );
        })
        .map(function (q) {
          return q.tile;
        }),
      //and every tile dragged over, the roads there too - not quoted
      run,
    );
  }

  //the piece a new road on tile is shown with: what it would be laid in,
  //asphalt plain until there are buildings along it
  function kindAt(tile) {
    var m = lookAt(tile).material;

    return m === "asphalt" ? "plain" : m;
  }

  function previewRoads(quotes, run) {
    var terrain = root.core.terrain,
      roadman = root.roadman,
      laid = opacities(quotes),
      net = plannedRoads(quotes, run),
      seen = Object.create(null),
      tile,
      next,
      road,
      id,
      i,
      j;

    for (i = 0; i < quotes.length; i++) {
      tile = quotes[i].tile;

      //a road there laid again: shown as it would be, where it lies
      road = quotes[i].upgrade ? roadman.anyRoad(tile) : null;

      if (road !== null) {
        seen[tile] = true;
        road.view.showPiece(
          Road.profile(
            tile,
            net,
            Road.kindFor(roadman, tile, lookAt(tile).material, road.isStop()),
            oneWay && ways[tile] !== undefined ? ways[tile] : -1,
          ),
        );
        reshaped.push(road);
      }

      //one that cannot go down is shown on its own, as it would be laid
      var surface = net.surface(tile);

      if (surface === null) {
        var any = Road.surfaces(terrain, tile);

        surface = any.length > 0 ? any[0] : Road.ground(terrain, tile);
      }

      if (road === null)
        previews.push(
          createRoadPreview(
            self,
            tile,
            net.surface(tile) !== null
              ? Road.profile(
                  tile,
                  net,
                  kindAt(tile),
                  oneWay && ways[tile] !== undefined ? ways[tile] : -1,
                )
              : Road.shapeOf(surface) > 0
                ? Road.shapeOf(surface)
                : 90000,
            surface,
            laid[tile],
          ),
        );

      for (j = 0; j < 4; j++) {
        next = tile + [1, -1, Terrain.dy, -Terrain.dy][j];
        road = roadman.anyRoad(next);

        if (road === null || seen[next] === true) continue;

        seen[next] = true;
        //a street stays a street, joined up with the new road
        id = Road.profile(
          next,
          net,
          Road.kindOf(roadman, road.data),
          Road.wayOf(road.data),
        );

        if (id !== road.typeCode) {
          road.view.showPiece(id);
          reshaped.push(road);
        }
      }
    }
  }

  function updateHilite() {
    //where the buildings would stand, one to a footprint of the selection
    var tiles = ts.anchors(),
      quotes;

    layout(tiles);

    //the way a one-way road goes, from where it was started
    if (oneWay) {
      if (tiles.length === 1) start = tiles[0];
      ways = flowOf(tiles);
    }

    quotes = quoteOf(tiles);

    clearPreview();

    if (data.classCode === BuildingClassCode.road) previewRoads(quotes, tiles);
    else previewBuildings(tiles, quotes);

    updatePriceTags(quotes);

    //and the game told what is being put down where, for what it shows of
    //it (its play's placing: the city-sim the area it would take)
    placing({ code: code, anchors: tiles, sizeX: sizeX(), sizeY: sizeY() });

    //so that a tower in front of the selection does not hide it
    fadeAround(self, ts.tiles());

    //green under a building that would go up, red under one that would not
    var buildable = buildableTiles(quotes);

    root.hiliteMan.disable(tokens);
    tokens = root.hiliteMan.hilite(
      ts.tiles().map(function (tile) {
        var ok = buildable[tile] === true;

        return {
          x: Terrain.extractX(tile),
          y: Terrain.extractY(tile),
          fillColor: ok ? HILITE_FILL : HILITE_BLOCKED_FILL,
          borderColor: ok ? HILITE_BORDER : HILITE_BLOCKED_BORDER,
          borderWidth: 2,
        };
      }),
    );

    //what these towers would water, outlined as a tower's reach is clicked
    if (waterRadius > 0)
      root.serviceman.showPlacementCoverage(tiles, waterRadius);
  }

  var sub = Events.on(ts, AreaSelector.events.change, updateHilite);
  //the camera turned: the buildings going up are shown from the new side
  var turned = Events.on(View, View.events.change, updateHilite);

  //bind ui
  var controls = root.ui.gameScreen().showActionControls();
  //a road is picked as it is laid, with toggles of its own where the screen
  //has room for them - and none for turning it round
  var roadTools = isRoad && !!controls.tools;

  //what a road is laid in, toggled on: another the same way, both ways to
  //start with - and the one that is on, the other way round from how it is
  //driven. The preview changes with it, the whole selection
  function pickRoad(m) {
    if (m === material) way = NEXT_WAY[way];
    else {
      material = m;
      way = "two";
    }

    oneWay = way !== "two";
    //and the next road starts out this way
    self.lastRoad = { material: material, way: way };

    showRoadTools();
    showHint(false);
    updateHilite();
  }

  function showRoadTools() {
    controls.tools(
      ROAD_TOOLS.map(function (tool) {
        var on = tool.material === material;

        return {
          icon: on ? tool[way] : tool.off,
          on: on,
          action: function () {
            pickRoad(tool.material);
          },
        };
      }),
    );
  }

  if (roadTools) showRoadTools();
  showHint(!roadTools);

  //anything can be turned round - what was never painted that way is drawn
  //flipped over (see BuildingView) - unless it says otherwise
  controls.canRotate(!roadTools && (data.canRotate !== false || oneWay));
  controls.onRotate = function () {
    //a one-way road turns round the way it goes
    if (oneWay) {
      turn = (turn + 1) % 4;
      updateHilite();
      return;
    }

    rotation = Rotation.next(rotation);
    //the whole selection turns with the buildings on it - which redraws
    //it all
    ts.rotate();
  };
  //another of the same kind on every footprint of the selection, picked at
  //random - the selection staying as it is. Each is picked again until it is
  //another than it was, a few times over, where there is another to be had
  if (controls.canShuffle)
    controls.canShuffle(data.classCode !== BuildingClassCode.road);
  controls.onShuffle = function () {
    var before = { variants: variants, looks: looks };

    variants = Object.create(null);
    looks = Object.create(null);

    ts.anchors().forEach(function (tile) {
      var slot = slots[tile];

      for (var tries = 0; tries < 8; tries++) {
        delete variants[slot];
        delete looks[slot];
        variantAt(tile);
        lookAt(tile);

        if (
          variants[slot] !== before.variants[slot] ||
          JSON.stringify(looks[slot]) !== JSON.stringify(before.looks[slot])
        )
          break;
      }
    });

    updateHilite();
  };
  controls.onSubmit = function () {
    var anchors = ts.anchors();

    layout(anchors);
    if (oneWay) ways = flowOf(anchors);

    if (founding()) {
      found(anchors);
      return;
    }

    //roads laid as the preview showed them, each with its surface
    var surfaces = null;

    if (data.classCode === BuildingClassCode.road) {
      var planned = plannedRoads(
        root.core.cities
          .getCity(0)
          .buildingService.quoteSelection(
            code,
            anchors,
            rotation,
            roadLooks(anchors),
          ),
        anchors,
      ).surfaces;

      surfaces = anchors.map(function (tile) {
        return planned[tile];
      });
    }

    buildSelection(
      self,
      code,
      anchors,
      rotation,
      anchors.map(variantAt),
      anchors.map(lookAt),
      surfaces,
    );

    //a block that went up has its look; another put down there next is
    //a block of its own. One turned down keeps the look it was shown with
    anchors.forEach(function (tile) {
      if (root.core.world.buildings.get(tile)) {
        delete looks[slots[tile]];
        delete variants[slots[tile]];
      }
    });

    // stay in build mode with the selection where it was, so the next
    // one can be dragged along from it - what is under it now is taken
    updateHilite();
  };
  controls.onDiscard = function () {
    //release resources
    ts.dispose();
    clearPreview();
    placing(null);
    updatePriceTags([]);
    unfade(self);
    root.hiliteMan.disable(tokens);
    root.serviceman.hidePlacementCoverage();
    Events.off(ts, AreaSelector.events.change, sub);
    Events.off(View, View.events.change, turned);

    root.ui.gameScreen().showWorld();
    root.ui.gameScreen().worldScreen().hideHint();
  };

  //the selection is up from the start, in the middle of the screen
  updateHilite();
};

export default Buildman;

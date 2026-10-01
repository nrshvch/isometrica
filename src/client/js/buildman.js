//TODO each building should be a building instance with attached prefab of building
import Core from "core/main";
import engine from "engine";
import BuildingClassCode from "data/classcode";
import BuildingData from "data/buildings";
import Building from "./building";
import BuildingView from "./buildingview";
import Road from "./road";
import RoadView from "./roadview";
import EventManager from "events";
import Events from "events";
import Chunkman from "./chunkman";
import AreaSelector from "./areaselector";
import TileMessage from "./gameObjects/tilemessage";
import CityWater from "core/city/citywater";
import CityBuildings from "core/city/citybuildings";
import Config from "./config";
import RenderLayer from "./renderlayer";
import ResourceCode from "core/resourcecode";
import ErrorCode from "core/errorcode";
import Numeral from "numeral";
import Rotation from "core/rotation";

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
    Events.fire(self, self.events.buildingRemoved, building);
    delete self.buildingByGO[building.view.gameObject.instanceId];
    building.destroy();

    if (!building.data.permanent) building.data.dispose();

    delete self.buildingByXY[x][y];
  }

  return building;
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

  return building;
}

function updateBuilding(self, data) {
  var tile = data.tile,
    building;

  building = getBuilding(self, tile);
  building.setData(data);

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
function createPreview(self, data, tile, rotation, opacity) {
  var terrain = self.root.core.world.terrain,
    tileSize = Config.tileSize,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    //over water it floats on the surface, which is drawn at 0 whatever
    //the depth of the bottom underneath (see client Terrain)
    z =
      terrain.getTerrainType(x, y) === Core.TerrainType.water
        ? 0
        : terrain.getGridPointHeight(x + 1, y),
    go = new engine.GameObject("building preview");

  BuildingView.addSprites(
    go,
    data,
    rotation,
    opacity,
    RenderLayer.previewLayer,
  );

  //placed before it goes in - the world files it by where it stands
  go.transform.setPosition(x * tileSize, z * Config.tileZStep, y * tileSize);
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
 * A see-through piece id of road on tile - drawn over everything, the way a
 * building's preview is, so the trees it would clear do not hide it.
 *
 * @returns {engine.GameObject}
 */
function createRoadPreview(self, tile, id, opacity) {
  var go = new engine.GameObject("road preview");

  RoadView.addSprite(go, id, opacity, RenderLayer.previewLayer);

  //placed before it goes in - the world files it by where it stands
  RoadView.place(go, tile);
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

  renderer.layer = RenderLayer.overlayLayer;
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
errorText[ErrorCode.OUTSIDE_CITY] = "outside city";

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
 */
function buildSelection(self, code, anchors, rotation, codes) {
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
      tried++;
      root.core.cities
        .getCity(0)
        .buildingService.buildBuilding(codes[i], anchors[i], rotation);
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

function onBuildingBuilt(sender, building, self) {
  createBuilding(self, building);
  showConstructionCost(self, building);
}

function onBuildingUpdated(sender, building, self) {
  updateBuilding(self, building);
}

function onBuildingRemoved(sender, building, self) {
  removeBuilding(self, building.tile);
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
  this.root = main;

  //what fadeAround last faded, by the tile it stands on, and how far the
  //tiles around the picked ones are from them - null while nothing is
  this.faded = Object.create(null);
  this.fadeRings = null;
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

Buildman.prototype.events = events;

Buildman.prototype.start = function () {
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

Buildman.prototype.build = function (code) {
  var self = this;
  var root = this.root;
  var data = BuildingData[code];

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

  //what goes up on each footprint of the selection, by the tile it starts
  //on - for a type, which of its variants: picked the first time the
  //selection covers it and kept from then on, so that the preview does not
  //shuffle while it is dragged about and what goes up is what was shown
  var variants = Object.create(null);

  function variantAt(tile) {
    if (variants[tile] === undefined)
      variants[tile] = CityBuildings.variantOf(code);

    return variants[tile];
  }

  //show hint
  root.ui
    .gameScreen()
    .worldScreen()
    .showHint("Drag to place, pull arrows to resize!");

  //the selection covers whole footprints, one building each
  var tokens = [];
  var ts = new AreaSelector(this.root, {
    stepX: sizeX(),
    stepY: sizeY(),
    //a road is laid a line at a time: pulled out it can turn a corner on
    //the way, and there is no rectangle to pull by its corners
    turns: data.classCode === BuildingClassCode.road,
    corners: data.classCode !== BuildingClassCode.road,
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
        ),
      );
  }

  //the roads as they would look once laid: each piece joined up with the
  //ones around it, new and old alike, and the old ones they meet showing
  //what they would turn into. Where no road can go there is nothing
  function previewRoads(quotes) {
    var terrain = root.core.terrain,
      roadman = root.roadman,
      laid = opacities(quotes),
      seen = Object.create(null),
      tile,
      next,
      road,
      id,
      i,
      j;

    function isRoad(t) {
      return laid[t] !== undefined || roadman.getRoad(t) !== null;
    }

    for (i = 0; i < quotes.length; i++) {
      tile = quotes[i].tile;
      previews.push(
        createRoadPreview(
          self,
          tile,
          Road.profile(terrain, tile, isRoad),
          laid[tile],
        ),
      );

      for (j = 0; j < 4; j++) {
        next = tile + [1, -1, Terrain.dy, -Terrain.dy][j];
        road = roadman.getRoad(next);

        if (road === null || seen[next] === true) continue;

        seen[next] = true;
        id = Road.profile(terrain, next, isRoad);

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
      quotes = root.core.cities
        .getCity(0)
        .buildingService.quoteSelection(code, tiles, rotation);

    clearPreview();

    if (data.classCode === BuildingClassCode.road) previewRoads(quotes);
    else previewBuildings(tiles, quotes);

    updatePriceTags(quotes);

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

    //what these towers would water, outlined the way the city limits are
    if (waterRadius > 0)
      root.serviceman.showPlacementCoverage(tiles, waterRadius);
  }

  var sub = Events.on(ts, AreaSelector.events.change, updateHilite);

  //bind ui
  var controls = root.ui.gameScreen().showActionControls();
  //anything can be turned round - what was never painted that way is drawn
  //flipped over (see BuildingView) - unless it says otherwise
  controls.canRotate(data.canRotate !== false);
  controls.onRotate = function () {
    rotation = Rotation.next(rotation);
    //the whole selection turns with the buildings on it - which redraws
    //it all
    ts.rotate();
  };
  controls.onSubmit = function () {
    var anchors = ts.anchors();

    buildSelection(self, code, anchors, rotation, anchors.map(variantAt));

    // stay in build mode with the selection where it was, so the next
    // one can be dragged along from it - what is under it now is taken
    updateHilite();
  };
  controls.onDiscard = function () {
    //release resources
    ts.dispose();
    clearPreview();
    updatePriceTags([]);
    unfade(self);
    root.hiliteMan.disable(tokens);
    root.serviceman.hidePlacementCoverage();
    Events.off(ts, AreaSelector.events.change, sub);

    root.ui.gameScreen().showWorld();
    root.ui.gameScreen().worldScreen().hideHint();
  };

  //the selection is up from the start, in the middle of the screen
  updateHilite();
};

export default Buildman;

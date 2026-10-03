/**
 * Shows what the city's services do and do not reach.
 *
 * Three things, all about the same question - what a building is doing for
 * the city, and why a house is standing empty:
 *
 *  - a red word over anything going without, "no road" before "no water",
 *    because a street is the first thing to put right. Without it a house
 *    nobody moves into looks like a bug rather than a missing street.
 *  - the ground a water tower waters, outlined in one continuous line the way
 *    the city limits are. Clicking a tower shows its reach and clicking
 *    anywhere else puts it away again; an outline of its own follows the
 *    selection while a tower is being placed (see buildman), so the towers
 *    already standing can be clicked to see how the two line up.
 *  - what a clicked building is worth: the money it makes or costs a tick,
 *    and how full it is - residents for a house, workers for a business.
 *    It is put away the same way the outline is.
 *
 * Labels live and die with the building views themselves (buildman announces
 * those as chunks come and go), so nothing is drawn for a part of the map that
 * is not on screen in the first place.
 *
 * A tap on nothing - bare ground, a road, the sea - while nothing is being
 * looked at puts all the words over the buildings away, and the next one
 * brings them back: the town without its warnings, for a picture of it.
 */
import engine from "engine";
import Numeral from "numeral";
import Events from "events";
import Core from "core/main";
import ServiceCode from "core/servicecode";
import CityWater from "core/city/citywater";
import Buildman from "./buildman";
import WorldCamera from "./components/camerascript";
import TileAreaBorderRenderer from "./components/tileareaborderrenderer";
import MultilineTextRenderer from "./components/multilinetextrenderer";
import BuildingClassCode from "data/classcode";
import RenderLayer from "client/renderlayer";
import Config from "./config";
import BuildingView from "./buildingview";
import BuildingState from "core/buildingstate";
import Rotation from "core/rotation";
import View from "./view";

var Terrain = Core.Terrain;

var text = {};
text[ServiceCode.road] = "no road";
text[ServiceCode.water] = "no water";
//not a service, but the same kind of trouble: a business nobody works in
var NO_WORKERS = "noWorkers";
text[NO_WORKERS] = "no workers";
//and a house whose people would have nowhere to work
var NO_JOBS = "noJobs";
text[NO_JOBS] = "no jobs";

//high enough to clear the roof of anything it sits over - and, over a
//building still going up, just off the pit dug for it
var HEIGHT = Config.tileSize,
  PIT_HEIGHT = Config.tileSize / 4;

//a warning is red, and how far along a building going up is, white
var WARNING_COLOR = "rgb(255,64,64)",
  PROGRESS_COLOR = "white";

/**
 * Puts go over the middle of the ground the building stands on, all of its
 * footprint - high enough to clear its roof, or down by the pit while it is
 * going up.
 */
function placeOver(self, go, building) {
  var terrain = self.root.terrain,
    data = building.data,
    //turned round, the footprint's sides swap
    sizeX = Rotation.sizeX(data, building.rotation),
    sizeY = Rotation.sizeY(data, building.rotation),
    far = building.tile + (sizeX - 1) + (sizeY - 1) * Terrain.dy;

  go.transform.setPosition(
    (terrain.tileXPos(building.tile) + terrain.tileXPos(far)) / 2,
    (terrain.tileYPos(building.tile) + terrain.tileYPos(far)) / 2 +
      (building.getState() === BuildingState.underConstruction
        ? PIT_HEIGHT
        : HEIGHT),
    (terrain.tileZPos(building.tile) + terrain.tileZPos(far)) / 2,
  );
}

function createLabel(self, building, words, color) {
  var go = new engine.GameObject("serviceWarning");
  var renderer = go.addComponent(new engine.TextRenderer());

  renderer.layer = RenderLayer.overlayLayer;
  renderer.color = color;
  renderer.style = "bold 16px Courier New";
  renderer.strokeStyle = "black";
  renderer.lineWidth = 4;
  renderer.text = words;
  renderer.opacity = opacityAt(self, building.tile);

  placeOver(self, go, building);

  self.root.game.scene.addGameObject(go);

  return go;
}

function show(self, building, words, color) {
  if (self._labelsHidden) return;

  var label = self._labels[building.tile];

  if (label === undefined) {
    self._labels[building.tile] = createLabel(self, building, words, color);
  } else {
    label.textRenderer.text = words;
    label.textRenderer.color = color;
    //up to the roof once there is one
    placeOver(self, label, building);
  }
}

/**
 * How far along a building going up is, in whole percent.
 */
function progressText(building) {
  return Math.floor(building.getProgress() * 100) + "%";
}

function hide(self, tile) {
  var label = self._labels[tile];

  if (label !== undefined) {
    label.destroy();
    delete self._labels[tile];
  }
}

/**
 * Goes over everything on screen and puts a word over whatever is going
 * without, and how far along it is over whatever is going up. Once a tick is
 * plenty - a street or a tower takes longer than that to build.
 */
function refresh(self) {
  var city = self.root.core.cities.getCity(0),
    views = self._views,
    tile,
    model,
    missing;

  if (city === undefined) return;

  //put away with a tap on nothing
  if (self._labelsHidden) {
    for (tile in self._labels) hide(self, tile);
    return;
  }

  for (tile in views) {
    model = views[tile].model();

    //nothing is missed before it is up - and the one clicked on says how
    //far along it is with its name instead
    if (model.getState() === BuildingState.underConstruction) {
      if (model === self._infoBuilding) hide(self, tile);
      else show(self, model, progressText(model), PROGRESS_COLOR);

      continue;
    }

    missing = city.missing(model);

    if (
      missing === null &&
      model.jobs() > 0 &&
      city.jobs.getWorkers(model) === 0
    )
      missing = NO_WORKERS;
    else if (missing === null && city.population.isShortOfJobs(model))
      missing = NO_JOBS;

    if (missing === null) hide(self, tile);
    else show(self, model, text[missing], WARNING_COLOR);
  }
}

function onBuildingLoad(sender, building, self) {
  self._views[building.model().tile] = building;
}

function onBuildingUnload(sender, building, self) {
  var tile = building.model().tile;

  delete self._views[tile];
  hide(self, tile);
}

//the word over a building fades with it, so it does not hide what the
//building was faded to show (see Buildman#fadeAround)
function onBuildingFade(sender, building, self) {
  var label = self._labels[building.model().tile];

  if (label !== undefined) label.textRenderer.opacity = building.view.opacity;
}

/**
 * How see-through the building on tile is drawn right now - a word that turns
 * up over one already faded starts out faded too.
 */
function opacityAt(self, tile) {
  var building = self._views[tile];

  return building !== undefined && building.view.opacity !== undefined
    ? building.view.opacity
    : 1;
}

function onTick(sender, args, self) {
  refresh(self);
  refreshInfo(self);
}

var INCOME_COLOR = "rgb(64,255,64)";
var EXPENSE_COLOR = "rgb(255,64,64)";

/**
 * @returns {{text: string, color: string}} green for what it brings in, red for
 *                                          what it costs, white for neither
 */
function formatMoney(amount) {
  var rounded = Math.round(amount);

  return {
    text:
      (rounded > 0 ? "+" : rounded < 0 ? "-" : "") +
      "$" +
      Numeral(Math.abs(rounded)).format("0,0"),
    color: rounded > 0 ? INCOME_COLOR : rounded < 0 ? EXPENSE_COLOR : "white",
  };
}

/**
 * @returns {Array} what it is, then - going up - how far along it is, or -
 *                  standing - the money it makes or costs and how full it is
 *                  if anybody lives or works in it
 */
function infoLines(city, building) {
  var data = building.data,
    //its name heads it, the way it heads its card in the catalogue
    lines = [data.name.charAt(0).toUpperCase() + data.name.slice(1)];

  if (building.getState() === BuildingState.underConstruction) {
    lines.push(progressText(building));
    return lines;
  }

  lines.push(formatMoney(city.getBuildingIncome(building)));

  if (data.citizenCapacity)
    lines.push(
      "peeps " +
        city.population.getResidents(building) +
        "/" +
        data.citizenCapacity,
    );
  else if (data.jobs)
    lines.push("jobs " + city.jobs.getWorkers(building) + "/" + data.jobs);

  return lines;
}

/**
 * Trees and rocks do nothing for anybody, and a road out past the borders has
 * no city to do it for.
 */
//a road's upkeep is all there is to say about it, and that is on the price
//tag already - clicked, it is ground like any other
function hasInfo(building) {
  var classCode = building.data.classCode;

  return (
    classCode !== BuildingClassCode.tree &&
    classCode !== BuildingClassCode.road &&
    building.getCity() !== null
  );
}

function refreshInfo(self) {
  var building = self._infoBuilding;

  if (building === null) return;

  //bulldozed while it was being looked at
  if (self.root.core.buildings.get(building.tile) !== building) {
    self.hideInfo();
    return;
  }

  self._info.textRenderer.lines = infoLines(building.getCity(), building);
  //down by the pit while it goes up, over the roof once it stands
  placeOver(self, self._info, building);
}

function pickTile(root, screenX, screenY) {
  var gos = root.camera.cameraScript.pickGameObject(screenX, screenY),
    sprite,
    i;

  for (i = 0; i < gos.length; i++) {
    sprite = gos[i].spriteRenderer;

    if (sprite !== undefined && sprite.layer === RenderLayer.groundLayer)
      return root.terrain.getCoordinates(gos[i]);
  }

  return -1;
}

/**
 * An action taking over the world - placing a building, clearing ground,
 * buying land - owns what is drawn on it, so the outline steps aside rather
 * than being left behind on top of somebody else's business.
 */
function onBusyChange(sender, busy, self) {
  if (busy) {
    self.hideCoverage();
    self.hideInfo();
    //and whatever words were put away come back
    self.showLabels();
  }
}

function onClick(sender, e, self) {
  //while an action owns the world (placing a building, clearing ground) the
  //clicks are that action's - it passes on the ones it has no use for
  if (self.root.ui.gameScreen().worldScreen().busy()) return;

  var looking = self._inspected !== null;

  //a tap on nothing, with nothing being looked at, puts the words over the
  //world away - or brings them back; a tap on something brings them back
  if (self.inspect(e.gameViewportX, e.gameViewportY)) self.showLabels();
  else if (!looking) self.toggleLabels();
}

function ServiceMan(root) {
  this.root = root;
  this._views = {};
  this._labels = {};
  this._coverage = null;
  this._placementCoverage = null;
  this._info = null;
  this._infoBuilding = null;
  //what a click is showing, info or reach or both - clicked again, it is
  //put away
  this._inspected = null;
  //the building clicked, drawn again over its neighbours, and the line
  //round its tiles
  this._raised = [];
  //the words over the buildings put away (toggleLabels)
  this._labelsHidden = false;
}

/**
 * The tiles a building stands on, turned the way it is.
 *
 * @param building {Building}
 * @returns {number[]}
 */
ServiceMan.footprint = function (building) {
  var data = building.data,
    sizeX = Rotation.sizeX(data, building.rotation),
    sizeY = Rotation.sizeY(data, building.rotation),
    tiles = [],
    x,
    y;

  for (y = 0; y < sizeY; y++)
    for (x = 0; x < sizeX; x++) tiles.push(building.tile + x + y * Terrain.dy);

  return tiles;
};

/**
 * The building being looked at - its info up, its footprint outlined - or
 * null.
 */
ServiceMan.prototype.inspected = function () {
  return this._inspected;
};

/**
 * Puts the words over the world - what the buildings go without, how far
 * along they are, and the cities' names - away, for a clear look at it, or
 * brings them back. Moving about doesn't bring them back - dragging,
 * zooming, turning the camera - but doing anything else does: a tap on
 * something, an action taking over the world, a press on anything of the
 * game's that is not the world (showLabels).
 */
ServiceMan.prototype.toggleLabels = function () {
  this._labelsHidden = !this._labelsHidden;
  this.root.cityman.hideNames(this._labelsHidden);
  refresh(this);
};

/**
 * Brings the words over the world back, if they were put away.
 */
ServiceMan.prototype.showLabels = function () {
  if (this._labelsHidden) this.toggleLabels();
};

/**
 * Clicking a building shows what it is worth, and a water tower what it waters
 * as well. Clicking it again puts them away, and so does clicking anything
 * else - bare ground, a road, a tree, the sea.
 *
 * @param screenX {number} where the click was, in viewport pixels
 * @param screenY {number}
 * @returns {boolean} whether it landed on something there is anything to show
 *                    for, rather than on bare ground, a road or a tree
 */
ServiceMan.prototype.inspect = function (screenX, screenY) {
  var root = this.root,
    city = root.cityman.pickCity(screenX, screenY),
    //a city's name hangs over its city hall and stands for it - clicked,
    //it is the hall that was clicked
    building =
      city !== null && city.buildings.cityHall !== null
        ? city.buildings.cityHall
        : root.buildman.pickBuilding(screenX, screenY);

  //clicking the ground a tower stands on counts too - its sprite leaves the
  //corners of its own tile showing
  if (building === null) {
    var tile = pickTile(root, screenX, screenY);
    building = tile === -1 ? null : root.core.buildings.get(tile);
  }

  var radius = building === null ? 0 : CityWater.radius(building),
    shown = radius > 0 || (building !== null && hasInfo(building));

  //the same one again - it was clicked to put away, which still makes it
  //something that was there to click
  if (shown && building === this._inspected) {
    this.hideCoverage();
    this.hideInfo();
    return true;
  }

  if (radius > 0) this.showCoverage(building.tile, radius);
  else this.hideCoverage();

  if (building !== null && hasInfo(building)) this.showInfo(building);
  else this.hideInfo();

  this._inspected = shown ? building : null;
  raise(this, this._inspected);

  return shown;
};

/**
 * Outlines the ground towers on these tiles water - the very tiles CityWater
 * goes on to count as watered - in the renderer kept under key, made on first
 * use.
 */
function showCoverage(self, key, towers, radius) {
  var tiles = [],
    coverage = self[key],
    i;

  for (i = 0; i < towers.length; i++)
    tiles = tiles.concat(CityWater.coverage(towers[i], radius));

  if (coverage === null) {
    var go = new engine.GameObject("waterCoverage");

    coverage = self[key] = go.addComponent(
      new TileAreaBorderRenderer(self.root.core.terrain, tiles),
    );
    coverage.layer = RenderLayer.coverageLayer;

    self.root.game.logic.world.addGameObject(go);
  } else {
    coverage.setTiles(tiles);
  }
}

/**
 * The clicked building drawn once more over everything around it - over its
 * own reach too, for a tower - or none again with null.
 */
function raise(self, building) {
  var i;

  for (i = 0; i < self._raised.length; i++) self._raised[i].destroy();
  self._raised = [];

  if (building === null) return;

  self._raised.push(outlineFootprint(self, building));

  //a site under construction has nothing finished to draw yet
  if (building.getState() === BuildingState.ready)
    self._raised.push(copyBuilding(self, building));
}

/**
 * A white line round the tiles the building stands on - under the copy of
 * it, over the neighbours and any reach.
 */
function outlineFootprint(self, building) {
  var tiles = ServiceMan.footprint(building),
    go = new engine.GameObject("inspected footprint"),
    renderer;

  renderer = go.addComponent(
    //right on the tiles' edges, as the tile under the cursor is hilited
    new TileAreaBorderRenderer(self.root.core.terrain, tiles, 0),
  );
  renderer.layer = RenderLayer.footprintLayer;
  renderer.fillColor = "rgba(255,255,255,0)";
  renderer.borderColor = "white";
  renderer.dash = [];

  self.root.game.logic.world.addGameObject(go);

  return go;
}

function copyBuilding(self, building) {
  //as it is seen, the camera turned (see client/view)
  var at = BuildingView.drawnAt(
      building.data,
      building.tile,
      building.rotation,
    ),
    go = new engine.GameObject("inspected building");

  BuildingView.addSprites(
    go,
    building.data,
    at.rotation,
    1,
    RenderLayer.inspectedLayer,
    building.look,
    building.tile,
  );
  BuildingView.addFoundations(
    go,
    building.data,
    building.tile,
    building.rotation,
    at,
    1,
    RenderLayer.footprintLayer,
  );

  go.transform.setPosition(
    at.x * Config.tileSize,
    at.z * Config.tileZStep,
    at.y * Config.tileSize,
  );
  self.root.game.logic.world.addGameObject(go);

  return go;
}

function hideCoverage(self, key) {
  if (self[key] !== null) {
    self[key].gameObject.destroy();
    self[key] = null;
  }
}

/**
 * What a tower that was clicked waters.
 *
 * @param tile {number}
 * @param radius {number}
 */
ServiceMan.prototype.showCoverage = function (tile, radius) {
  showCoverage(this, "_coverage", [tile], radius);
};

ServiceMan.prototype.hideCoverage = function () {
  hideCoverage(this, "_coverage");
  //put away by whatever means, the next click on it shows it again
  this._inspected = null;
  raise(this, null);
};

/**
 * What towers about to be put down on these tiles would water, all of them
 * together - kept apart from the one a click shows, so both can be up at once.
 *
 * @param tiles {number[]}
 * @param radius {number}
 */
ServiceMan.prototype.showPlacementCoverage = function (tiles, radius) {
  showCoverage(this, "_placementCoverage", tiles, radius);
};

ServiceMan.prototype.hidePlacementCoverage = function () {
  hideCoverage(this, "_placementCoverage");
};

/**
 * Writes what the building is worth over the middle of it, and keeps it up to
 * date every tick until it is put away.
 *
 * @param building {Building}
 */
ServiceMan.prototype.showInfo = function (building) {
  var info = this._info;

  if (info === null) {
    info = this._info = new engine.GameObject("buildingInfo");

    var renderer = info.addComponent(new MultilineTextRenderer());

    renderer.layer = RenderLayer.overlayLayer;
    renderer.color = "white";
    renderer.style = "bold 16px Courier New";
    renderer.strokeStyle = "black";
    renderer.lineWidth = 4;

    this.root.game.scene.addGameObject(info);
  }

  this._infoBuilding = building;
  refreshInfo(this);
  //its own label gives way to the info, rather than a tick later
  refresh(this);
};

ServiceMan.prototype.hideInfo = function () {
  if (this._info !== null) {
    this._info.destroy();
    this._info = null;
    this._infoBuilding = null;
    //and comes back as soon as the info goes
    refresh(this);
  }

  this._inspected = null;
  raise(this, null);
};

ServiceMan.prototype.init = function () {
  var root = this.root,
    world = root.core;

  Events.on(root.buildman, Buildman.events.buildingLoad, onBuildingLoad, this);
  Events.on(
    root.buildman,
    Buildman.events.buildingUnload,
    onBuildingUnload,
    this,
  );
  Events.on(root.buildman, Buildman.events.buildingFade, onBuildingFade, this);
  Events.on(world, world.events.tick, onTick, this);
  Events.on(
    root.camera.cameraScript,
    WorldCamera.events.inputClick,
    onClick,
    this,
  );

  root.ui.gameScreen().worldScreen().busy.onChange(onBusyChange, false, this);

  //a press on anything that is not the world itself - a button, a menu -
  //brings the words put away back; on the world, it is a tap or a drag,
  //which onClick or nothing sees to
  var self = this;

  document.addEventListener(
    "pointerdown",
    function (e) {
      var viewport = root.camera && root.camera.camera.viewport;

      if (viewport && e.target !== viewport.canvas) self.showLabels();
    },
    true,
  );

  //the camera turned (see client/view): the building looked at is put away,
  //its copy drawn for the side that was seen
  Events.on(
    View,
    View.events.change,
    function (sender, args, self) {
      self.hideCoverage();
      self.hideInfo();
    },
    this,
  );

  //views that were made before this ran are just as much on screen
  var views = root.buildman.getBuildingViews();

  for (var i = 0; i < views.length; i++)
    onBuildingLoad(root.buildman, views[i], this);

  refresh(this);
};

export default ServiceMan;

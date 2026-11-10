/**
 * Shows what the city's services do and do not reach.
 *
 * Three things, all about the same question - what a building is doing for
 * the city, and why a house is standing empty:
 *
 *  - a red word over anything going without, "no road" before "no water" -
 *    because a street is the first thing to put right. Without it a house
 *    nobody moves into looks like a bug rather than a missing street. The
 *    least of a road it wants, "no road (gravel)", "no road (cobble)", is
 *    on its card, looked at (client/worth describe).
 *  - the ground a water tower waters, outlined in one continuous line.
 *    Clicking a tower shows its reach and clicking
 *    anywhere else puts it away again; an outline of its own follows the
 *    selection while a tower is being placed (see buildman), so the towers
 *    already standing can be clicked to see how the two line up.
 *  - a clicked building outlined, drawn once more over its neighbours -
 *    and what it is worth, the money it makes or costs a tick and how full
 *    it is, how far along it is going up, what it goes without
 *    (client/worth describe), left to the game played to show on its own
 *    screens (its play's inspecting) rather than written over the world.
 *    It is put away the same way the outline is.
 *
 * Labels live and die with the building views themselves (buildman announces
 * those as chunks come and go), so nothing is drawn for a part of the map that
 * is not on screen in the first place.
 *
 * A tap on nothing - bare ground, a road, the sea - while nothing is being
 * looked at puts all the words over the buildings away, and the grid over
 * the ground with them, and the next one brings them back: the town without
 * its warnings, for a picture of it.
 */
import engine from "engine";
import Events from "events";
import Core from "../core/main";
import { wantOf, wordFor } from "./worth";
import CityWater from "../core/city/citywater";
import Buildman from "./buildman";
import WorldCamera from "./components/camerascript";
import TileAreaBorderRenderer from "./components/tileareaborderrenderer";
import BuildingClassCode from "../data/classcode";
import RenderLayer from "./renderlayer";
import Config from "./config";
import BuildingView from "./buildingview";
import BuildingState from "../core/buildingstate";
import Rotation from "../core/rotation";
import View from "./view";

var Terrain = Core.Terrain;

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

    //nothing is missed of one coming down
    if (model.demolishing) {
      hide(self, tile);
      continue;
    }

    //nothing is missed before it is up - how far along it is, clicked on
    //or not
    if (model.getState() === BuildingState.underConstruction) {
      show(self, model, progressText(model), PROGRESS_COLOR);

      continue;
    }

    //on fire, or burnt down: nothing more to want (client/fires)
    if (
      model.getState() === BuildingState.burning ||
      model.getState() === BuildingState.ruin
    ) {
      hide(self, tile);
      continue;
    }

    missing = wantOf(city, model);

    if (missing === null) hide(self, tile);
    else show(self, model, wordFor(missing), WARNING_COLOR);
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

/**
 * Trees and rocks do nothing for anybody, and before a city is founded
 * nothing has a city to do it for. A road costs nothing to keep and what it
 * is laid in is there to see - clicked, it is ground like any other.
 */
function hasInfo(building) {
  var classCode = building.data.classCode;

  return (
    classCode !== BuildingClassCode.tree &&
    classCode !== BuildingClassCode.road &&
    building.getCity() !== null
  );
}

//the building looked at let go of, once it is bulldozed
function refreshInfo(self) {
  var building = self._infoBuilding;

  if (
    building !== null &&
    self.root.core.buildings.get(building.tile) !== building
  )
    self.hideInfo();
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
  //the delivery game has nothing to say about buildings (quiet)
  if (self._quiet) return;

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
  //the building whose worth the game played is showing, if any (showInfo)
  this._infoBuilding = null;
  //what a click is showing, info or reach or both - clicked again, it is
  //put away
  this._inspected = null;
  //the building clicked, drawn again over its neighbours, and the line
  //round its tiles
  this._raised = [];
  //the words over the buildings put away (toggleLabels)
  this._labelsHidden = false;
  //for good, and nothing shown for a click either (quiet)
  this._quiet = false;
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
  //and the grid over the ground: the town on its own
  this.root.terrain.showGrid(!this._labelsHidden);
  refresh(this);
};

/**
 * Brings the words over the world back, if they were put away.
 */
ServiceMan.prototype.showLabels = function () {
  if (this._labelsHidden && !this._quiet) this.toggleLabels();
};

/**
 * Puts the words over the world away for good - what the buildings go
 * without, the cities' names, the grid - and has clicks on buildings show
 * nothing: for the delivery game, where the city is only the scene.
 */
ServiceMan.prototype.quiet = function () {
  if (!this._labelsHidden) this.toggleLabels();

  this._quiet = true;
};

/**
 * Clicking a building outlines it and has the game played show what it is
 * worth (showInfo), and a water tower what it waters as well. Clicking it
 * again puts them away, and so does clicking anything else - bare ground, a
 * road, a tree, the sea.
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
  var play = self.root.play,
    i;

  for (i = 0; i < self._raised.length; i++) self._raised[i].destroy();
  self._raised = [];

  //the game played shown what is looked at too, for what it shows of it
  if (play && play.inspecting) play.inspecting(building);

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
      building.surface,
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
    undefined,
    //as knocked about as it is, parts of it down
    building,
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
 * The building looked at shown as it is now, still looked at - set on fire
 * (client/buildman fireUp): no copy of it standing drawn over the fire, and
 * none of the reach it no longer has.
 */
ServiceMan.prototype.reinspect = function () {
  hideCoverage(this, "_coverage");
  if (this._inspected !== null) raise(this, this._inspected);
};

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
 * Has the game played show what the building is worth (client/worth
 * describe) - nothing
 * is written over the world - till it is put away, or bulldozed.
 *
 * @param building {Building}
 */
ServiceMan.prototype.showInfo = function (building) {
  this._infoBuilding = building;
};

ServiceMan.prototype.hideInfo = function () {
  this._infoBuilding = null;
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

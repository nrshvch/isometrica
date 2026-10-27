/**
 * The city's border: one line round the city's area - the area round each
 * of its buildings, and its roads where they join them, all of it together
 * (cityarea, isometrica core/city/cityroads AREA) - drawn along the tiles'
 * edges. What stands apart from the city has an area of its own, and none is
 * drawn round it - but while something is being put down (client/buildman,
 * #placing): then the border is drawn as it would be with it
 * (CityRoads#plan) - with it in it if it joins the city, and its area in
 * amber if it would stand apart; a road that would lead nowhere has none -
 * and every area that stands apart, faintly. And
 * while something that stands apart is looked at (client/serviceman,
 * #inspecting), the area of all that hangs together with it. Drawn again
 * whenever what hangs together changes, and as the ground under it moves;
 * put away with the words over the world (client/serviceman,
 * Cityman#namesHidden), but while something is being put down.
 *
 * And wherever a road crosses the border, out of the city's area, the signs
 * of a town's limits by it - on the last of the road inside the city's area,
 * at the side it goes on out at: signs of no
 * words, each on a post on the verge, the town to whoever comes in, on their
 * right, and struck through red to whoever leaves, on theirs (isometrica
 * shared/gen/roads townSign). They are the road's own, drawn with it
 * (client/roadview townSignsOf, #townSignsOn), and stay up with the words
 * put away.
 */
import engine from "engine";
import Events from "events";
import Core from "isometrica/core/main";
import TileAreaBorderRenderer from "isometrica/client/components/tileareaborderrenderer";
import RenderLayer from "isometrica/client/renderlayer";
import BuildingClassCode from "isometrica/data/classcode";
import BuildingState from "isometrica/core/buildingstate";
import { areaOf, areaOfTiles, footprints, tilesOf } from "./cityarea";

var Terrain = Core.Terrain;

//the city's line, white; what is being put down standing apart from it, or
//what is looked at that does, amber; and what already stands apart, faint
var CITY = "rgba(255,255,255,0.55)",
  APART = "rgba(255,190,70,0.9)",
  DETACHED = "rgba(255,255,255,0.25)";

/**
 * @param root {Vkaria}
 * @constructor
 */
function CityBorder(root) {
  this.root = root;
  //the city's line, what is being put down, and what stands apart
  this.renderer = null;
  this.placed = null;
  this.detached = null;
  //what is being put down: {code, anchors, sizeX, sizeY}, or null (#placing)
  this._placing = null;
  //what is being looked at, or null (#inspecting)
  this._inspecting = null;
  //road tile -> the sides a town's limits are at, 0..3 (#townSignsOn)
  this._signs = {};
  //what it was last worked out for - the city, how far along what hangs
  //together it was (CityRoads#version) - and the areas then, with what
  //stands apart, each part's
  this._city = null;
  this._version = -1;
  this._cityArea = {};
  this._detached = [];
  this._detachedAreas = [];
  //whether the lines are to be traced again, before the next frame draws
  //them (lines): however often what is put down moves in the meantime -
  //several tiles a frame, dragged quickly - they are traced once
  this._stale = false;
  //what the city would be with what is being put down, and what that was
  //asked for (CityRoads#plan): asked again for the same, it is the same
  this._planned = null;
  this._plan = null;
}

//a line round tiles, along their edges, in color - drawn while shown says,
//and traced again first, if it is to be (lines)
function line(self, root, name, color, shown) {
  var go = new engine.GameObject(name),
    renderer = go.addComponent(
      new TileAreaBorderRenderer(root.core.terrain, []),
    );

  renderer.layer = RenderLayer.groundDrawLayer;
  renderer.fillColor = "rgba(255,255,255,0)";
  renderer.borderColor = color;
  renderer.borderWidth = 3;
  renderer.dash = [4];
  renderer.cullingTest = function (viewport, vprender) {
    if (self._stale) lines(self);

    return (
      shown() &&
      TileAreaBorderRenderer.prototype.cullingTest.call(
        this,
        viewport,
        vprender,
      )
    );
  };

  root.game.logic.world.addGameObject(go);

  return renderer;
}

/**
 * Starts drawing it - for the city there is, and for one founded later.
 */
CityBorder.prototype.init = function () {
  var root = this.root,
    cities = root.core.cities,
    self = this;

  //the city's put away with the words over the world, but while something
  //is being put down; the rest only ever up while it is
  this.renderer = line(this, root, "city border", CITY, function () {
    return self._placing !== null || !root.cityman.namesHidden();
  });
  this.placed = line(this, root, "area put down", APART, function () {
    return self._placing !== null || self._inspecting !== null;
  });
  this.detached = line(this, root, "areas apart", DETACHED, function () {
    return self._placing !== null;
  });

  Events.on(cities, Core.CityService.events.cityNew, function (sender, city) {
    watch(self, city);
  });
  cities.getCities().forEach(function (city) {
    watch(self, city);
  });

  //the line follows the ground, so it is traced again when that moves
  Events.on(root.core.terrain, Terrain.events.gridUpdate, function () {
    draw(self);
  });
};

/**
 * What is being put down, and where - the city's border shown as it would be
 * with it - or null once nothing is (client/buildman).
 *
 * @param what {{code: number, anchors: number[], sizeX: number,
 *        sizeY: number}|null}
 */
CityBorder.prototype.placing = function (what) {
  this._placing = what && what.anchors.length > 0 ? what : null;
  this._stale = true;
};

/**
 * What is being looked at - the area of all that hangs together with it shown,
 * if it stands apart from the city - or null once nothing is
 * (client/serviceman).
 *
 * @param building {Building|null}
 */
CityBorder.prototype.inspecting = function (building) {
  this._inspecting = building;
  this._stale = true;
};

/**
 * Which sides of the road on tile a town's limits are at, -x, -y, +x, +y as
 * 0..3 - for the road to draw its sign there (client/roadview).
 *
 * @param tile {number}
 * @returns {number[]}
 */
CityBorder.prototype.townSignsOn = function (tile) {
  //what it was last worked out to be, and nothing more: a road asks while it
  //is being drawn, or while the pictures of another side are being looked
  //out (client/preloader View.peek) - drawing roads again from there draws
  //them for the side looked at. The signs are put up afresh on the city's
  //next tick (watch), the roads that change drawn again then
  return this._signs[tile] || [];
};

function watch(self, city) {
  if (self._city !== null) return;

  self._city = city;
  draw(self);

  //the city ticks its update event - what hangs together is worked out
  //again only when something went up, came down or was finished
  Events.on(city, Core.City.events.update, function () {
    if (city.roads.version() !== self._version) draw(self);
  });
}

function draw(self) {
  if (self._city !== null) {
    self._version = self._city.roads.version();
    self._cityArea = areaOf(self._city.roads.members());
    self._detached = self._city.roads.detached();
    self._detachedAreas = self._detached.map(function (part) {
      return areaOf(part);
    });
    putUpSigns(self);
  }

  self._stale = true;
}

/**
 * The lines as they are now: the city's area, and that of what stands apart
 * that is looked at - and while something is being put down, as they would be
 * with it (CityRoads#plan): the city's, the area of what it would stand apart
 * with, if it would, and the rest of what stands apart. Before there is a
 * city, what is put down is the city.
 */
function lines(self) {
  var placing = self._placing,
    plan,
    put,
    rest;

  self._stale = false;

  if (placing === null) {
    self.renderer.setTiles(tilesOf(self._cityArea));
    self.placed.setTiles(tilesOf(lookedAt(self)));
    self.detached.setTiles([]);
    return;
  }

  if (self._city === null) {
    self.renderer.setTiles(
      tilesOf(
        areaOfTiles(footprints(placing.anchors, placing.sizeX, placing.sizeY)),
      ),
    );
    self.placed.setTiles([]);
    self.detached.setTiles([]);
    return;
  }

  plan = planned(self, placing);
  put = {};
  rest = {};
  plan.apart.forEach(function (part) {
    areaOfTiles(part.tiles, part.added ? put : rest);
  });

  self.renderer.setTiles(tilesOf(areaOfTiles(plan.city)));
  self.placed.setTiles(tilesOf(put));
  self.detached.setTiles(tilesOf(rest));
}

//what the city would be with what is being put down (CityRoads#plan) - the
//plan asked for last, if it is asked for the same again: the same thing in
//the same place, the city as it was then
function planned(self, placing) {
  var roads = self._city.roads,
    asked =
      placing.code +
      " " +
      placing.sizeX +
      " " +
      placing.sizeY +
      " " +
      placing.anchors.join(",") +
      " " +
      roads.version();

  if (asked !== self._planned) {
    self._plan = roads.plan(
      placing.code,
      placing.anchors,
      placing.sizeX,
      placing.sizeY,
    );
    self._planned = asked;
  }

  return self._plan;
}

//the area of the part standing apart that what is looked at is in - none if
//it is the city's, or nothing is looked at
function lookedAt(self) {
  var building = self._inspecting,
    i;

  if (building !== null)
    for (i = 0; i < self._detached.length; i++)
      if (self._detached[i].indexOf(building) !== -1)
        return self._detachedAreas[i];

  return {};
}

//from a tile to the next one at each side, -x, -y, +x, +y
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

//a road that is finished, the traffic on it
function isRoad(building) {
  return (
    building !== null &&
    building.data.classCode === BuildingClassCode.road &&
    building.getState() === BuildingState.ready
  );
}

//a sign wherever a road crosses the city's border - on the last of it inside
//the city's area, at the side it goes on out at - and the roads whose signs
//came or went drawn again
function putUpSigns(self) {
  var was = self._signs,
    now = {},
    area = self._cityArea,
    service = self.root.core.buildingService,
    buildings = self._city.buildings.getBuildings(),
    tile,
    i,
    s;

  for (i = 0; i < buildings.length; i++) {
    tile = buildings[i].tile;

    if (area[tile] !== true || !isRoad(buildings[i])) continue;

    for (s = 0; s < 4; s++)
      if (area[tile + STEP[s]] !== true && isRoad(service.get(tile + STEP[s])))
        (now[tile] = now[tile] || []).push(s);
  }

  self._signs = now;

  for (tile in was)
    if (String(now[tile]) !== String(was[tile])) redraw(self, +tile);
  for (tile in now) if (was[tile] === undefined) redraw(self, +tile);
}

function redraw(self, tile) {
  var road = self.root.roadman ? self.root.roadman.anyRoad(tile) : null;

  if (road !== null && road.view) road.view.update();
}

export default CityBorder;

/**
 * The city's border: one line round the city's area - the area round each
 * of its buildings and roads, all of it together (cityarea, isometrica
 * core/city/cityroads AREA) - drawn along the tiles' edges. What stands apart
 * from the city has an area of its own, and none is drawn round it - but
 * while something is being put down (client/buildman, #placing): then its
 * area is drawn too, and if it shares a tile with the city's, the border as
 * it will be with it in it; and every area that stands apart, faintly. Drawn
 * again whenever what hangs together changes, and as the ground under it
 * moves; put away with the words over the world (client/serviceman,
 * Cityman#namesHidden), but while something is being put down.
 *
 * And where a road leaves the city, leading nowhere, a town's limits over the
 * last of its road that way (CityRoads#exits): a gantry across the road, its
 * sign of no words - the town to whoever comes in, struck through red to
 * whoever leaves (isometrica shared/gen/roads gantry). It is the road's own,
 * drawn with it (client/roadview gantriesOf, #gantriesOn), and stays up with
 * the words put away.
 */
import engine from "engine";
import Events from "events";
import Core from "isometrica/core/main";
import TileAreaBorderRenderer from "isometrica/client/components/tileareaborderrenderer";
import RenderLayer from "isometrica/client/renderlayer";
import { areaOf, areaOfTiles, footprints, overlap, tilesOf } from "./cityarea";

var Terrain = Core.Terrain;

//the city's line, white; what is being put down standing apart from it,
//amber; and what already stands apart, faint
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
  //what is being put down: {anchors, sizeX, sizeY}, or null (#placing)
  this._placing = null;
  //road tile -> the sides a town's limits are over, 0..3 (#gantriesOn)
  this._gantries = {};
  //what it was last worked out for - the city, how far along what hangs
  //together it was (CityRoads#version) - and the areas then
  this._city = null;
  this._version = -1;
  this._cityArea = {};
  this._detachedAreas = [];
}

//a line round tiles, along their edges, in color - drawn while shown says
function line(root, name, color, shown) {
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
  this.renderer = line(root, "city border", CITY, function () {
    return self._placing !== null || !root.cityman.namesHidden();
  });
  this.placed = line(root, "area put down", APART, function () {
    return self._placing !== null;
  });
  this.detached = line(root, "areas apart", DETACHED, function () {
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
 * What is being put down, and where - its area shown, and the city's border
 * as it would be with it - or null once nothing is (client/buildman).
 *
 * @param what {{anchors: number[], sizeX: number, sizeY: number}|null}
 */
CityBorder.prototype.placing = function (what) {
  this._placing = what && what.anchors.length > 0 ? what : null;

  if (this.renderer !== null) lines(this);
};

/**
 * Which sides of the road on tile a town's limits are over, -x, -y, +x, +y
 * as 0..3 - for the road to draw its gantry there (client/roadview).
 *
 * @param tile {number}
 * @returns {number[]}
 */
CityBorder.prototype.gantriesOn = function (tile) {
  if (this._city !== null && this._city.roads.version() !== this._version)
    draw(this);

  return this._gantries[tile] || [];
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
    self._detachedAreas = self._city.roads.detached().map(function (part) {
      return areaOf(part);
    });
    putUpGantries(self);
  }

  if (self.renderer !== null) lines(self);
}

/**
 * The lines as they are now: the city's area - and while something is being
 * put down, its area: in the city's if they share a tile, with every area
 * standing apart that it shares one with; its own otherwise, those with it;
 * and the rest of what stands apart.
 */
function lines(self) {
  var city = self._cityArea,
    apart = self._detachedAreas,
    placing = self._placing,
    joined = [],
    rest = [],
    put,
    into,
    i;

  if (placing === null) {
    self.renderer.setTiles(tilesOf(city));
    self.placed.setTiles([]);
    self.detached.setTiles([]);
    return;
  }

  put = areaOfTiles(footprints(placing.anchors, placing.sizeX, placing.sizeY));

  for (i = 0; i < apart.length; i++)
    (overlap(put, apart[i]) ? joined : rest).push(apart[i]);

  //a city with nothing to it yet is what is put down
  var withCity = overlap(put, city) || tilesOf(city).length === 0;

  into = Object.assign({}, withCity ? city : {}, put);
  joined.forEach(function (area) {
    Object.assign(into, area);
  });

  self.renderer.setTiles(tilesOf(withCity ? into : city));
  self.placed.setTiles(withCity ? [] : tilesOf(into));
  self.detached.setTiles(
    tilesOf(
      rest.reduce(function (all, area) {
        return Object.assign(all, area);
      }, {}),
    ),
  );
}

//a gantry over every side a road leaves the city by - and the roads whose
//gantries came or went drawn again
function putUpGantries(self) {
  var was = self._gantries,
    now = {},
    exits = self._city.roads.exits(),
    tile,
    i;

  for (i = 0; i < exits.length; i++)
    (now[exits[i].tile] = now[exits[i].tile] || []).push(exits[i].side);

  self._gantries = now;

  for (tile in was)
    if (String(now[tile]) !== String(was[tile])) redraw(self, +tile);
  for (tile in now) if (was[tile] === undefined) redraw(self, +tile);
}

function redraw(self, tile) {
  var road = self.root.roadman ? self.root.roadman.anyRoad(tile) : null;

  if (road !== null && road.view) road.view.update();
}

export default CityBorder;

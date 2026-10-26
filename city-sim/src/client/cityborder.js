/**
 * The city's border: one line round the city's area - the area round each
 * of its buildings and roads, all of it together (cityarea, isometrica
 * core/city/cityroads AREA) - drawn along the tiles' edges. What stands apart
 * from the city has an area of its own, and none is drawn round it - but
 * while something is being put down (client/buildman, #placing): then its
 * area is drawn too, and if it shares a tile with the city's, the border as
 * it will be with it in it; and every area that stands apart, faintly. And
 * while something that stands apart is looked at (client/serviceman,
 * #inspecting), the area of all that hangs together with it. Drawn again
 * whenever what hangs together changes, and as the ground under it moves;
 * put away with the words over the world (client/serviceman,
 * Cityman#namesHidden), but while something is being put down.
 *
 * And where a road leaves the city, leading nowhere (CityRoads#exits), the
 * signs of a town's limits by it where it crosses the border - on the last of
 * the road inside the city's area, at the side it goes on out at: signs of no
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
import { areaOf, areaOfTiles, footprints, overlap, tilesOf } from "./cityarea";

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
  //what is being put down: {anchors, sizeX, sizeY}, or null (#placing)
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
    return self._placing !== null || self._inspecting !== null;
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
 * What is being looked at - the area of all that hangs together with it shown,
 * if it stands apart from the city - or null once nothing is
 * (client/serviceman).
 *
 * @param building {Building|null}
 */
CityBorder.prototype.inspecting = function (building) {
  this._inspecting = building;

  if (this.renderer !== null) lines(this);
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

  if (self.renderer !== null) lines(self);
}

/**
 * The lines as they are now: the city's area, and that of what stands apart
 * that is looked at - and while something is being put down, its area: in the
 * city's if they share a tile, with every area standing apart that it shares
 * one with; its own otherwise, those with it; and the rest of what stands
 * apart.
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
    self.placed.setTiles(tilesOf(lookedAt(self)));
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

//as far as a road is walked out of the city looking for its border
var WALK = 64;

/**
 * Where a road leaving the city at exit crosses its border: walked on from the
 * last of the city's road, along the road - straight on where it can, round
 * its bends - for as long as it is inside the city's area; the last of it
 * that is, and the side it goes on out at. Null for a road that ends inside.
 *
 * @param exit {{tile: number, side: number}} (CityRoads#exits)
 * @returns {{tile: number, side: number}|null}
 */
function crossing(self, exit) {
  var area = self._cityArea,
    at = exit.tile,
    side = exit.side,
    next,
    turns,
    i,
    k;

  for (i = 0; i < WALK; i++) {
    next = at + STEP[side];

    if (!isRoad(self, next)) return null;
    if (area[next] !== true) return { tile: at, side: side };

    at = next;

    //on along the road: straight on, or round the bend, never back
    turns = [side, (side + 1) % 4, (side + 3) % 4];
    for (k = 0; k < turns.length; k++)
      if (isRoad(self, at + STEP[turns[k]])) break;

    if (k === turns.length) return null;

    side = turns[k];
  }

  return null;
}

function isRoad(self, tile) {
  var b = self.root.core.buildingService.get(tile);

  return b !== null && b.data.classCode === BuildingClassCode.road;
}

//a sign where every road out of the city crosses its border - and the roads
//whose signs came or went drawn again
function putUpSigns(self) {
  var was = self._signs,
    now = {},
    exits = self._city.roads.exits(),
    at,
    tile,
    i;

  for (i = 0; i < exits.length; i++) {
    at = crossing(self, exits[i]);

    if (at === null) continue;

    now[at.tile] = now[at.tile] || [];
    if (now[at.tile].indexOf(at.side) === -1) now[at.tile].push(at.side);
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

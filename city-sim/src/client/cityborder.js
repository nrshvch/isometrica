/**
 * The city's border: one line round all of it - everything that is part of
 * it (isometrica core/city/cityroads) with a tile round each, and whatever it
 * closes in (cityarea) - and none round anything cut off from it. Drawn again
 * whenever what hangs together changes, and as the ground under it moves; put
 * away with the words over the world (client/serviceman,
 * Cityman#namesHidden).
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
import { area } from "./cityarea";

var Terrain = Core.Terrain;

/**
 * @param root {Vkaria}
 * @constructor
 */
function CityBorder(root) {
  this.root = root;
  this.renderer = null;
  //road tile -> the sides a town's limits are over, 0..3 (#gantriesOn)
  this._gantries = {};
  //what it was last drawn for - the city, and how far along what hangs
  //together it was (CityRoads#version)
  this._city = null;
  this._version = -1;
}

/**
 * Starts drawing it - for the city there is, and for one founded later.
 */
CityBorder.prototype.init = function () {
  var root = this.root,
    cities = root.core.cities,
    self = this,
    go = new engine.GameObject("city border");

  this.renderer = go.addComponent(
    new TileAreaBorderRenderer(root.core.terrain, []),
  );
  this.renderer.layer = RenderLayer.groundDrawLayer;
  this.renderer.fillColor = "rgba(255,255,255,0)";
  this.renderer.borderColor = "rgba(255,255,255,0.55)";
  this.renderer.borderWidth = 3;
  this.renderer.dash = [4];

  //and nowhere to be seen while the words over the world are put away
  this.renderer.cullingTest = function (viewport, vprender) {
    return (
      !root.cityman.namesHidden() &&
      TileAreaBorderRenderer.prototype.cullingTest.call(
        this,
        viewport,
        vprender,
      )
    );
  };

  root.game.logic.world.addGameObject(go);

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
  if (self._city === null) return;

  self._version = self._city.roads.version();
  if (self.renderer !== null) self.renderer.setTiles(area(self._city));
  putUpGantries(self);
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

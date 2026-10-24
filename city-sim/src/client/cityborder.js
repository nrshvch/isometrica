/**
 * The city's border: one line round all of it - everything that is part of
 * it (isometrica core/city/cityroads), the tiles it holds together across
 * taken in with it, and whatever it closes in - and none round anything cut
 * off from it. Drawn again whenever what hangs together changes, and as the
 * ground under it moves; put away with the words over the world
 * (client/serviceman, Cityman#namesHidden).
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
  self.renderer.setTiles(area(self._city));
}

export default CityBorder;

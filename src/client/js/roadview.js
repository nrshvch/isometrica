/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 09.02.14
 * Time: 15:09
 * To change this template use File | Settings | File Templates.
 */
import engine from "engine";
import RenderLayer from "client/renderlayer";
import Config from "./config";
import Core from "core/main";
import View from "./view";

var Terrain = Core.Terrain;

//what a road's piece number (see Road.profile) is drawn with: the roads
//generator's pieces (shared/gen/roads) - plain or paved, by how the road
//joins up with its neighbours, or a ramp - as it is seen, the camera turned
//(see client/view)
function spriteOf(id) {
  var shape = id % Road_PAVED,
    kind = id >= Road_PAVED ? "paved" : "plain";

  if (shape < 10) return "gen/roads/" + kind + "/ramp" + View.ramp(shape);

  return "gen/roads/" + kind + "/" + seenJoins(shape).join("");
}

//which sides a flat piece of road joins on as it is seen: -x, -y, +x, +y
function seenJoins(shape) {
  return View.joins([
    Math.floor(shape / 1000) % 10,
    Math.floor(shape / 100) % 10,
    Math.floor(shape / 10) % 10,
    shape % 10,
  ]);
}

//where a paved street has its street light, if it has one there: beside a
//road along x, along y, or at the corner of anything else - every other tile
//along a street, and never on a ramp. Along x and y as it is seen
function lightOf(id, tile) {
  var shape = id % Road_PAVED;

  if (id < Road_PAVED || shape < 10) return null;
  if ((Terrain.extractX(tile) + Terrain.extractY(tile)) % 2 !== 0) return null;

  var j = seenJoins(shape),
    alongX = j[0] || j[2],
    alongY = j[1] || j[3];

  return (
    "gen/roads/light/" +
    (alongX && !alongY ? "x" : alongY && !alongX ? "y" : "corner")
  );
}

//a sprite of the generator's, its pivot where its tile's middle is
function setPiece(renderer, name) {
  var frame = vkaria.sprites.frame(name);

  renderer.setSprite(vkaria.sprites.getSprite(name));
  renderer.setPivot(frame.pivotX, frame.pivotY);
}

//added to a road's piece number for the paved one (see Road.profile)
var Road_PAVED = 100000;

function BuildingView() {
  this.gameObject = new engine.GameObject("building");
}

BuildingView.prototype.gameObject = null;
BuildingView.prototype.building = null;

BuildingView.prototype.setRoad = function (road) {
  this.road = road;
};

BuildingView.prototype.update = function () {
  var b = this.road;

  if (b !== null && b.staticData !== null)
    draw(this, this.road.typeCode, this.road.surface());
};

//draws piece id of the road from scratch, on surface (client/road): the
//piece, then the street light if it has one, and the concrete under it if
//there is any - each lets go of the view as it is destroyed, so off a copy
//of the list
function draw(view, id, surface) {
  var go = view.gameObject,
    tile = view.road.data.tile,
    children = go.transform.children.slice();

  for (var i = 0; i < children.length; i++) children[i].gameObject.destroy();

  addSprite(go, id, 1, RenderLayer.roadLayer);

  //the street light, among the buildings and the cars it stands with
  var light = lightOf(id, tile);

  if (light !== null) addLight(go, light);

  addBase(go, tile, surface, 1, RenderLayer.roadLayer);

  place(go, tile, surface);
}

//how high a road's surface is in the middle of its tile
function middle(surface) {
  return (surface[0] + surface[1] + surface[2] + surface[3]) / 4;
}

//how many pixels up a step of the ground is (shared/gen/foundations STEP)
var STEP_PX = 8;

/**
 * Hangs under parent - a road's, at its surface (place) - the concrete under
 * a road's surface on tile: down to the ground at every corner the surface
 * is over it, a step at most (shared/gen/foundations) - under a flat road a
 * level top, on the shore going down into the water the way a building's
 * does; under a ramp, a ramp's. Picked as the tile is seen; nothing where
 * the road is on the ground all round.
 *
 * @param surface {number[]} the road's corners' heights, A (x, y),
 *        B (x + 1, y), C (x, y + 1), D (x + 1, y + 1) (client/road)
 */
function addBase(parent, tile, surface, opacity, layer) {
  var terrain = vkaria.core.world.terrain,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    top = Math.max.apply(null, surface),
    ramp = Math.min.apply(null, surface) !== top,
    any = false,
    drops = [],
    tops = [];

  for (var k = 0; k < 4; k++) {
    var c = View.corner(k),
      at = surface[c[0] + 2 * c[1]],
      drop = Math.max(0, Math.min(1, at - View.cornerHeight(terrain, x, y, k)));

    drops.push(drop);
    tops.push(at === top ? 1 : 0);
    if (drop > 0) any = true;
  }

  if (!any) return;

  var name =
      "gen/foundations/" +
      (ramp
        ? "ramp/" + tops.join("") + "/"
        : terrain.getTerrainType(tile) === Core.TerrainType.shore
          ? "shore/"
          : "") +
      drops.join(""),
    frame = vkaria.sprites.frame(name);

  if (!frame) return;

  var part = new engine.GameObject(),
    sprite = new engine.SpriteRenderer();

  sprite.layer = layer;
  sprite.setSprite(vkaria.sprites.getSprite(name));
  //its pivot is at the top of the tile, the road's half a step under it on
  //a ramp: its picture lifted by as much
  sprite.setPivot(
    frame.pivotX,
    frame.pivotY + (top - middle(surface)) * STEP_PX,
  );
  part.addComponent(sprite);
  //the renderer resets its opacity once it is attached
  sprite.opacity = opacity;
  parent.transform.addChild(part.transform);
  //a hair under the road on it, so it is drawn first
  //(CameraComponent#depthAxes)
  part.transform.setLocalPosition(0, -0.01, 0);
}

//hangs a street light under parent
function addLight(parent, name) {
  var part = new engine.GameObject(),
    sprite = new engine.SpriteRenderer();

  sprite.layer = RenderLayer.buildingsLayer;
  part.addComponent(sprite);
  setPiece(sprite, name);
  parent.transform.addChild(part.transform);
}

/**
 * Draws piece id in place of the road's own - what it would turn into once
 * the roads being laid next to it join up with it. Its own comes back with
 * the next update.
 *
 * @param id {number} which piece (see Road.profile)
 */
BuildingView.prototype.showPiece = function (id) {
  if (this.road !== null && this.road.staticData !== null)
    draw(this, id, this.road.surface());
};

/**
 * Hangs piece id of road under parent - shared with the see-through preview
 * shown while roads are being laid.
 *
 * @param id {number} which piece (see Road.profile)
 * @param opacity {number} 1 for the real thing
 * @param layer {number}
 */
function addSprite(parent, id, opacity, layer) {
  var part = new engine.GameObject(),
    sprite = new engine.SpriteRenderer();

  sprite.layer = layer;
  setPiece(sprite, spriteOf(id));
  part.addComponent(sprite);
  //the renderer resets its opacity once it is attached
  sprite.opacity = opacity;
  parent.transform.addChild(part.transform);
}

/**
 * Puts go where a road on tile with surface stands: in the middle of its
 * tile, as high as its surface is there.
 */
function place(go, tile, surface) {
  var x = Terrain.extractX(tile),
    y = Terrain.extractY(tile);

  go.transform.setPosition(
    x * Config.tileSize,
    middle(surface) * Config.tileZStep,
    y * Config.tileSize,
  );
}

BuildingView.addSprite = addSprite;
BuildingView.PAVED = Road_PAVED;
BuildingView.place = place;
BuildingView.addBase = addBase;

BuildingView.prototype.render = function () {
  if (this.gameObject.world === null)
    vkaria.game.logic.world.addGameObject(this.gameObject);
};

export default BuildingView;

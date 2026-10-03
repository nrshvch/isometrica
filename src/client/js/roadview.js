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

  if (b !== null && b.staticData !== null) {
    //drawn again from scratch: the piece first (showPiece), then the street
    //light if it has one, and the base under a levelled one - each lets go
    //of the view as it is destroyed, so off a copy of the list
    var children = this.gameObject.transform.children.slice();

    for (var i = 0; i < children.length; i++) children[i].gameObject.destroy();

    addSprite(this.gameObject, this.road.typeCode, 1, RenderLayer.roadLayer);

    //the street light, among the buildings and the cars it stands with
    var light = lightOf(this.road.typeCode, b.data.tile);

    if (light !== null) addLight(this.gameObject, light);

    addBase(this.gameObject, b.data.tile, 1, RenderLayer.roadLayer);

    place(this.gameObject, b.data.tile);
  }
};

/**
 * Whether the road on tile is levelled: on a slope it does not go up as a
 * ramp - only one corner up, three, or two across from each other - flat at
 * the top of the slope, on a concrete base (addBase).
 *
 * @param terrain {Terrain} core terrain
 */
function levelled(terrain, tile) {
  var slopeId = terrain.tileSlope(tile);

  return Terrain.isSlope(slopeId) && !Terrain.isSlopeSmooth(slopeId);
}

//the highest corner of a tile
function topOf(terrain, tile) {
  return Math.max(
    terrain.getGridPointHeight(tile),
    terrain.getGridPointHeight(tile + 1),
    terrain.getGridPointHeight(tile + Terrain.dy),
    terrain.getGridPointHeight(tile + Terrain.dy + 1),
  );
}

/**
 * Hangs under parent - a levelled road's, at the top of its tile (place) -
 * the concrete it is levelled on, down to the ground at every corner lower
 * than that (shared/gen/foundations), picked as the tile is seen. Nothing
 * under any other road.
 */
function addBase(parent, tile, opacity, layer) {
  var terrain = vkaria.core.world.terrain;

  if (!levelled(terrain, tile)) return;

  var x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    top = topOf(terrain, tile),
    drops = [];

  for (var k = 0; k < 4; k++)
    drops.push(
      Math.max(0, Math.min(1, top - View.cornerHeight(terrain, x, y, k))),
    );

  var name = "gen/foundations/" + drops.join(""),
    frame = vkaria.sprites.frame(name);

  if (!frame) return;

  var part = new engine.GameObject(),
    sprite = new engine.SpriteRenderer();

  sprite.layer = layer;
  sprite.setSprite(vkaria.sprites.getSprite(name));
  sprite.setPivot(frame.pivotX, frame.pivotY);
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
  var children = this.gameObject.transform.children;

  if (children.length > 0)
    setPiece(children[0].gameObject.spriteRenderer, spriteOf(id));
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
 * Puts go where a road on tile stands: on the ground in the middle of its
 * tile - or a levelled one at the top of it (addBase).
 */
function place(go, tile) {
  var terrain = vkaria.core.world.terrain,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    z = levelled(terrain, tile)
      ? topOf(terrain, tile)
      : terrain.getHeight(x + 0.5, y + 0.5);

  go.transform.setPosition(
    x * Config.tileSize,
    z * Config.tileZStep,
    y * Config.tileSize,
  );
}

BuildingView.addSprite = addSprite;
BuildingView.PAVED = Road_PAVED;
BuildingView.place = place;
BuildingView.addBase = addBase;
BuildingView.levelled = levelled;
BuildingView.topOf = topOf;

BuildingView.prototype.render = function () {
  if (this.gameObject.world === null)
    vkaria.game.logic.world.addGameObject(this.gameObject);
};

export default BuildingView;

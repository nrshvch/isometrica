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
    var children = this.gameObject.transform.children;

    if (children.length === 0)
      addSprite(this.gameObject, this.road.typeCode, 1, RenderLayer.roadLayer);
    else
      setPiece(
        children[0].gameObject.spriteRenderer,
        spriteOf(this.road.typeCode),
      );

    //the street light, among the buildings and the cars it stands with
    var light = lightOf(this.road.typeCode, b.data.tile);

    if (light === null && children.length > 1) children[1].gameObject.destroy();
    else if (light !== null && children.length > 1)
      setPiece(children[1].gameObject.spriteRenderer, light);
    else if (light !== null) addLight(this.gameObject, light);

    place(this.gameObject, b.data.tile);
  }
};

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
 * Puts go where a road on tile stands.
 */
function place(go, tile) {
  var x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    z = vkaria.core.world.terrain.getHeight(x + 0.5, y + 0.5);

  go.transform.setPosition(
    x * Config.tileSize,
    z * Config.tileZStep,
    y * Config.tileSize,
  );
}

BuildingView.addSprite = addSprite;
BuildingView.PAVED = Road_PAVED;
BuildingView.place = place;

BuildingView.prototype.render = function () {
  if (this.gameObject.world === null)
    vkaria.game.logic.world.addGameObject(this.gameObject);
};

export default BuildingView;

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
    //light, if there is one, and the base under it, if it needs one -
    //each lets go of the view as it is destroyed, so off a copy of the list
    var children = this.gameObject.transform.children.slice(),
      id = this.road.typeCode;

    for (var i = 0; i < children.length; i++) children[i].gameObject.destroy();

    addSprite(this.gameObject, id, 1, RenderLayer.roadLayer);

    //the street light, among the buildings and the cars it stands with
    var light = lightOf(id, b.data.tile);

    if (light !== null) addLight(this.gameObject, light);

    addBase(this.gameObject, b.data.tile, id, 1, RenderLayer.groundDrawLayer);

    place(this.gameObject, b.data.tile, id);
  }
};

//which way each ramp goes up (shared/gen/roads RAMPS)
var RAMP_UP = { 1: "-y", 2: "-x", 3: "+y", 4: "+x" };

/**
 * What a road's surface is on tile, piece id on it (see Road.profile): flat,
 * at the top of the tile's ground, or a ramp up towards ramp - "+x" - from a
 * step under the top to the top.
 *
 * @param terrain {Terrain} core terrain
 * @returns {{top: number, ramp: string|null}}
 */
function deck(terrain, tile, id) {
  var shape = id % Road_PAVED;

  return {
    top: Math.max(
      terrain.getGridPointHeight(tile),
      terrain.getGridPointHeight(tile + 1),
      terrain.getGridPointHeight(tile + Terrain.dy),
      terrain.getGridPointHeight(tile + Terrain.dy + 1),
    ),
    ramp: shape < 10 ? RAMP_UP[shape] || null : null,
  };
}

/**
 * How high a road's surface is at fx, fy across its tile, from the corner at
 * x, y - each 0..1.
 *
 * @param d {{top, ramp}} see deck
 */
function deckAt(d, fx, fy) {
  switch (d.ramp) {
    case "+x":
      return d.top - 1 + fx;
    case "-x":
      return d.top - fx;
    case "+y":
      return d.top - 1 + fy;
    case "-y":
      return d.top - fy;
    default:
      return d.top;
  }
}

//how high the middle of a road's surface is
function surface(d) {
  return d.ramp ? d.top - 0.5 : d.top;
}

/**
 * Hangs under parent - a road's, at its surface (place) - the concrete a road
 * on uneven ground is laid on, the way a building is (shared/gen/
 * foundations): under a flat road, up to the top of the tile's ground; under
 * a ramp, up to the ramp - picked as the tile is seen.
 *
 * @param id {number} the piece on the tile (see Road.profile)
 */
function addBase(parent, tile, id, opacity, layer) {
  var terrain = vkaria.core.world.terrain,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    d = deck(terrain, tile, id),
    drops = [],
    tops = [],
    any = false,
    k;

  for (k = 0; k < 4; k++) {
    var c = View.corner(k),
      at = deckAt(d, c[0], c[1]),
      drop = Math.max(
        0,
        Math.min(1, at - terrain.getGridPointHeight(x + c[0], y + c[1])),
      );

    drops.push(drop);
    tops.push(at === d.top ? 1 : 0);
    if (drop > 0) any = true;
  }

  if (!any) return;

  var name =
      "gen/foundations/" +
      (d.ramp ? "ramp/" + tops.join("") + "/" : "") +
      drops.join(""),
    frame = vkaria.sprites.frame(name);

  //ground no base was painted for: left as it is
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
  //from the surface down to the top of the ground, where the piece's pivot is
  part.transform.setLocalPosition(
    0,
    (d.top - surface(d)) * Config.tileZStep,
    0,
  );
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
 * Puts go where a road on tile stands: at the middle of its surface, which
 * may be over the ground there (deck).
 *
 * @param id {number} the piece on the tile (see Road.profile)
 */
function place(go, tile, id) {
  var x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    z = surface(deck(vkaria.core.world.terrain, tile, id));

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
BuildingView.deck = deck;
BuildingView.deckAt = deckAt;

BuildingView.prototype.render = function () {
  if (this.gameObject.world === null)
    vkaria.game.logic.world.addGameObject(this.gameObject);
};

export default BuildingView;

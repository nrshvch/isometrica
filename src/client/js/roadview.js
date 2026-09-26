/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 09.02.14
 * Time: 15:09
 * To change this template use File | Settings | File Templates.
 */
import engine from "engine/main";
import RenderLayer from "client/renderlayer";
import Config from "./config";
import Core from "core/main";

var Terrain = Core.Terrain;


var roadSprite = {
    90001: "road/straight1.png",
    90010: "road/straight2.png",
    90011: "road/turn3.png",
    90100: "road/straight1.png",
    90101: "road/straight1.png",
    90110: "road/turn2.png",
    90111: "road/t2.png",
    91000: "road/straight2.png",
    91001: "road/turn1.png",
    91010: "road/straight2.png",
    91011: "road/t3.png",
    91100: "road/turn4.png",
    91101: "road/t4.png",
    91110: "road/t1.png",
    91111: "road/x1.png",
    1: "road/elevation1.png",
    2: "road/elevation2.png",
    3: "road/elevation3.png",
    4: "road/elevation4.png"
};

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
        //
        if(this.gameObject.transform.children.length === 0){
            addSprite(this.gameObject, this.road.typeCode, 1, RenderLayer.roadLayer);
        }else{
            this.gameObject.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite(roadSprite[this.road.typeCode]));
        }

        place(this.gameObject, b.data.tile);
    }
};

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
        children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite(roadSprite[id]));
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
    sprite.setSprite(vkaria.sprites.getSprite(roadSprite[id])).setPivot(32,24);
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

    go.transform.setPosition(x * Config.tileSize, z * Config.tileZStep, y * Config.tileSize);
}

BuildingView.addSprite = addSprite;
BuildingView.place = place;

BuildingView.prototype.render = function () {
    if (this.gameObject.world === null)
        vkaria.game.logic.world.addGameObject(this.gameObject);
};

export default BuildingView;

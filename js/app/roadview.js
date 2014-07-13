/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 09.02.14
 * Time: 15:09
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var engine = require("engine"),
        RenderLayer = require("lib/renderlayer"),
        SmokeSource = require("app/components/smokesource"),
        BuildingState = require("lib/buildingstate");


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
            var staticData = b.staticData,
                tileSize = engine.config.tileSize,
                tileZStep = engine.config.tileZStep;

            //
            if(this.gameObject.transform.children.length === 0){
                var part = new engine.GameObject(),
                    sprite = new engine.SpriteRenderer();
                sprite.layer = RenderLayer.roadLayer;
                sprite.setSprite(vkaria.sprites.getSprite(roadSprite[this.road.typeCode])).setPivot(32,24);
                part.addComponent(sprite);
                this.gameObject.transform.addChild(part.transform);
                part.transform.translate(0,0,0);
            }else{
                this.gameObject.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite(roadSprite[this.road.typeCode]));
            }

            //position gameObject
            var data = b.data,
                //z = b.tile.gameObject.transform.getPosition()[1] + b.tile.subpositionZ(data.subPosX, data.subPosY),
                x = data.x + data.subPosX,
                y = data.y + data.subPosY,
                z = vkaria.terrain.getHeight(x,y);

            this.gameObject.transform.setPosition(x * tileSize, z * tileZStep, y * tileSize);
        }
    };

    BuildingView.prototype.render = function () {
        if (this.gameObject.world === null)
            vkaria.game.logic.world.addGameObject(this.gameObject);
    };

    return BuildingView;
});
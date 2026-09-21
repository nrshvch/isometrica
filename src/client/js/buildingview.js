/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 09.02.14
 * Time: 15:09
 * To change this template use File | Settings | File Templates.
 */
import engine from "engine/main";
import RenderLayer from "client/renderlayer";
import SmokeSource from "./components/smokesource";
import Config from "./config";
import BuildingState from "core/buildingstate";
import Core from "core/main";

var Terrain = Core.Terrain;

function BuildingView() {
    this.gameObject = new engine.GameObject("building");
}

BuildingView.prototype.gameObject = null;
BuildingView.prototype.building = null;

BuildingView.prototype.setBuilding = function (building) {
    this.building = building;
};

BuildingView.prototype.update = function () {
    var b = this.building;
    if (b !== null && b.staticData !== null) {
        var staticData = b.staticData,
            tileSize = Config.tileSize,
            tileZStep = Config.tileZStep;

        //clear old GOs
        var children = this.gameObject.transform.children,
            len = children.length;
        for (var i = 0; i < len; i++) {
            var child = children[i];
            child.gameObject.destroy();
        }

        if (b.data.getState() === BuildingState.underConstruction) {
            var sizeX = 0,
                sizeY = 0;

            if (this.building.data.rotation) {
                sizeX = staticData.sizeY;
                sizeY = staticData.sizeX;
            } else {
                sizeX = staticData.sizeX;
                sizeY = staticData.sizeY;
            }


            for (var x = 0; x < sizeX; x++) {
                for (var y = 0; y < sizeY; y++) {
                    var part = new engine.GameObject(),
                        sprite = new engine.SpriteRenderer();

                    sprite.layer = RenderLayer.buildingsLayer;
                    sprite.setSprite(vkaria.sprites.getSprite("site.png")).setPivot(32, 24);

                    part.addComponent(sprite);
                    this.gameObject.transform.addChild(part.transform);
                    part.transform.translate(x * Config.tileSize, 0, y * Config.tileSize);
                }
            }
        } else if (b.data.getState() === BuildingState.ready) {
            var spritesData = staticData.sprites,
                rotated = !!b.data.rotation,
                //a building nobody painted turned round is drawn flipped over
                mirrored = rotated && !staticData.spritesRotate;

            if (rotated && staticData.spritesRotate)
                spritesData = staticData.spritesRotate;

            var len = spritesData.length;
            for (var i = 0; i < len; i++) {
                var spriteData = spritesData[i];

                var spriteRenderer = new engine.SpriteRenderer();
                spriteRenderer.layer = spriteData.layer;
                spriteRenderer.pivotY = spriteData.pivotY;

                var sprite = vkaria.sprites.getSprite(spriteData.path, mirrored);
                spriteRenderer.setSprite(sprite);

                if (mirrored)
                    mirrorPivot(spriteRenderer, sprite, spriteData.pivotX);
                else
                    spriteRenderer.pivotX = spriteData.pivotX;

                var spriteGO = new engine.GameObject();
                spriteGO.addComponent(spriteRenderer);
                this.gameObject.transform.addChild(spriteGO.transform);

                //flipped over, the piece over tile (x, y) is the one over (y, x)
                if (mirrored)
                    spriteGO.transform.setLocalPosition(spriteData.z * tileSize, spriteData.y * tileZStep, spriteData.x * tileSize);
                else
                    spriteGO.transform.setLocalPosition(spriteData.x * tileSize, spriteData.y * tileZStep, spriteData.z * tileSize);
            }

            //add smoke
            if (staticData.smokeSource !== undefined) {
                var smoke = staticData.smokeSource,
                    smokeSource = new engine.GameObject();

                //the chimney turns round with the rest of the house
                if (rotated)
                    smokeSource.transform.setLocalPosition(smoke[2] * tileSize, smoke[1] * tileZStep, smoke[0] * tileSize);
                else
                    smokeSource.transform.setLocalPosition(smoke[0] * tileSize, smoke[1] * tileZStep, smoke[2] * tileSize);

                smokeSource.addComponent(new SmokeSource(b.data));
                this.gameObject.transform.addChild(smokeSource.transform);
            }
        }

        //position gameObject
        var data = this.building.data,
            //this.building.tile.gameObject.transform.getPosition()[1] + this.building.tile.subpositionZ(data.subPosX, data.subPosY),
            x = Terrain.extractX(data.tile),// + data.subPosX,
            y = Terrain.extractY(data.tile),// + data.subPosY,
            z = vkaria.core.world.terrain.getGridPointHeight(x+1, y);

        this.gameObject.transform.setPosition(x * tileSize, z * tileZStep, y * tileSize);
    }
};

/**
 * The pivot sits as far from the right edge of a flipped picture as it did from
 * the left edge of the original - which takes the picture's width, and that of
 * one still loading is not known yet.
 */
function mirrorPivot(spriteRenderer, sprite, pivotX) {
    vkaria.sprites.whenReady(sprite, function () {
        spriteRenderer.pivotX = sprite.width - pivotX;
    });
}

BuildingView.prototype.render = function () {
    if (this.gameObject.world === null)
        vkaria.game.logic.world.addGameObject(this.gameObject);
};


export default BuildingView;

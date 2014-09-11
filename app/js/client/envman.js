/**
 * Created by denis on 8/27/14.
 */
define(function (require) {
    var Config = require("./config");
    var Engine = require("engine");
    var Events = require("events");
    var Terrain = require("./terrain");
    var Core = require("core");
    var BuildingData = Core.BuildingData;
    var TileIterator = Core.TileIterator;
    var CoreTerrain = Core.Terrain;
    var Chunkman = require("./chunkman");

    function plantTree(self, tile, treeCode) {
        //BEGIN CREATE TREE GO
        var go = new Engine.GameObject("tree");

        var spriteData = BuildingData[treeCode].sprites[0];
        var spriteRenderer = new Engine.SpriteRenderer();
        spriteRenderer.layer = spriteData.layer;
        spriteRenderer.setSprite(vkaria.sprites.getSprite(spriteData.path));
        spriteRenderer.pivotX = spriteData.pivotX;
        spriteRenderer.pivotY = spriteData.pivotY;

        var spriteGO = new Engine.GameObject();
        spriteGO.addComponent(spriteRenderer);
        go.transform.addChild(spriteGO.transform);
        spriteGO.transform.setLocalPosition(spriteData.x * Config.tileSize, spriteData.y * Config.tileZStep, spriteData.z * Config.tileSize);

        var x = CoreTerrain.extractX(tile),// + data.subPosX,
            y = CoreTerrain.extractY(tile),// + data.subPosY,
            z = vkaria.core.world.terrain.getGridPointHeight(x + 1, y);
        go.transform.setPosition(x * Config.tileSize, z * Config.tileZStep, y * Config.tileSize);

        vkaria.game.logic.world.addGameObject(go);
        //END CREATE TREE GO

        self._trees[tile] = go;
    }

    function removeTree(self, tile){
        var go = self._trees[tile];
        if (go !== undefined) {
            delete self._trees[tile];
            vkaria.game.logic.world.removeGameObject(go);
        }
    }

    function plantTrees(self, chunk) {
        var tiles = chunk.tiles();
        var tile, service = self.root.core.envService, treeCode;
        while (!tiles.done) {
            tile = TileIterator.next(tiles);
            treeCode = service.getTree(tile);
            if (treeCode !== null && self._trees[tile] === undefined)
                plantTree(self, tile, treeCode);
        }
    }

    function cleanTrees(self, chunk) {
        var tiles = chunk.tiles();
        var tile;

        while (!tiles.done) {
            tile = TileIterator.next(tiles);
            removeTree(self, tile);
        }
    }

    function onChunkLoad(sender, chunk, meta) {
        //console.log("EnvMan::onTileLoad", sender, args, meta);
        plantTrees(meta, chunk);
    }

    function onChunkRemove(sender, chunk, meta) {
        //console.log("EnvMan::onTileRemove", sender, args, meta);
        cleanTrees(meta, chunk);
    }

    function onTreeRemove(sender, tile, self){
        removeTree(self, tile);
    }

    function EnvMan(root) {
        this.root = root;
        this._trees = {};
    }

    EnvMan.prototype.init = function () {
        this.core = this.root.core;

        var chunks = this.root.chunkman.getChunks();

        for(var i in chunks){
            plantTrees(this, chunks[i]);
        }

        Events.on(this.root.chunkman, Chunkman.events.chunkLoad, onChunkLoad, this);
        Events.on(this.root.chunkman, Chunkman.events.chunkRemove, onChunkRemove, this);

        Events.on(this.core.envService, Core.EnvService.events.treeRemove,onTreeRemove, this);
    };


    return EnvMan;
});
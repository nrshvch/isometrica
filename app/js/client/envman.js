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
    var Pool = require("object-pool");
    var Tree = require("./gameObjects/tree");

    function plantTree(self, tile, treeCode) {
        var go = Pool.borrowObject(self.pool);

        var spriteData = BuildingData[treeCode].sprites[0];
        var renderer = go.renderer;
        renderer.setSprite(self.root.sprites.getSprite(spriteData.path));
        renderer.pivotX = spriteData.pivotX;
        renderer.pivotY = spriteData.pivotY;

        var x = CoreTerrain.extractX(tile),
            y = CoreTerrain.extractY(tile),
            z = self.root.core.terrain.getGridPointHeight(x + 1, y);

        go.transform.setPosition(x * Config.tileSize, z * Config.tileZStep, y * Config.tileSize);

        self.root.game.scene.addGameObject(go);

        self._trees[tile] = go;
    }

    function removeTree(self, tile){
        var go = self._trees[tile];
        if (go !== undefined) {
            delete self._trees[tile];
            Pool.returnObject(self.pool, go);
            self.root.game.scene.removeGameObject(go);
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
        this.pool = new Pool(Tree);
    }

    EnvMan.prototype.init = function () {
        this.core = this.root.core;

        var chunks = this.root.chunkman.getChunks();

        for(var i in chunks){
            plantTrees(this, chunks[i]);
        }

        Events.on(this.root.chunkman, Chunkman.events.chunkLoad, onChunkLoad, this);
        Events.on(this.root.chunkman, Chunkman.events.chunkUnload, onChunkRemove, this);

        Events.on(this.core.envService, Core.EnvService.events.treeRemove,onTreeRemove, this);
    };


    return EnvMan;
});
/**
 * Created by denis on 8/27/14.
 */
import Config from "./config";
import Engine from "engine/main";
import Events from "events";
import Terrain from "./terrain";
import Core from "core/main";
import Chunkman from "./chunkman";
import Pool from "object-pool";
import Tree from "./gameObjects/tree";

var BuildingData = Core.BuildingData;
var TileIterator = Core.TileIterator;
var CoreTerrain = Core.Terrain;

function placeTree(self, go, tile) {
    var x = CoreTerrain.extractX(tile),
        y = CoreTerrain.extractY(tile),
        z = self.root.core.terrain.getGridPointHeight(x + 1, y);

    go.transform.setPosition(x * Config.tileSize, z * Config.tileZStep, y * Config.tileSize);
}

function plantTree(self, tile, treeCode) {
    var go = Pool.borrowObject(self.pool);

    var spriteData = BuildingData[treeCode].sprites[0];
    var renderer = go.renderer;
    renderer.setSprite(self.root.sprites.getSprite(spriteData.path));
    renderer.pivotX = spriteData.pivotX;
    renderer.pivotY = spriteData.pivotY;

    placeTree(self, go, tile);

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

/**
 * The ground under these tiles moved, so their trees are put at its new
 * height - or taken away, where the tile is under water or on a slope now,
 * or planted where it no longer is.
 *
 * A tree that stays is moved rather than taken out and planted again: taking
 * one out only happens at the end of the tick, and the pool would hand the
 * same one straight back to be lost with it.
 */
function onGridUpdate(sender, args, self) {
    var tiles = args.tiles,
        service = self.root.core.envService,
        tile, treeCode, go, i;

    for (i = 0; i < tiles.length; i++) {
        tile = tiles[i];
        go = self._trees[tile];
        treeCode = service.getTree(tile);

        if (go !== undefined) {
            if (treeCode === null)
                removeTree(self, tile);
            else
                placeTree(self, go, tile);
        //a tree is only ever planted on a tile that is on screen
        } else if (treeCode !== null && self.root.terrain.getTile(tile) !== null) {
            plantTree(self, tile, treeCode);
        }
    }
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
    Events.on(this.core.terrain, Core.Terrain.events.gridUpdate, onGridUpdate, this);
};


export default EnvMan;

/**
 * Created by denis on 8/27/14.
 */
import Config from "./config";
import Engine from "engine";
import Events from "events";
import Terrain from "./terrain";
import Core from "core/main";
import Chunkman from "./chunkman";
import Pool from "shared/object-pool";
import Rocks from "data/rocks";
//a rock is drawn the way a tree is: one sprite among the buildings
import Tree from "./gameObjects/tree";
import BuildingView from "./buildingview";

var BuildingData = Core.BuildingData;
var TileIterator = Core.TileIterator;
var CoreTerrain = Core.Terrain;

/**
 * What the world put on the tile, as the sprite it is drawn with - a tree or
 * stones - or null where there is nothing.
 */
function sceneryOf(self, tile) {
    var service = self.root.core.envService,
        code = service.getTree(tile);

    if (code !== null)
        return BuildingView.drawingOf(BuildingData[code], service.getTreeLook(tile)).sprites[0];

    code = service.getRock(tile);

    return code !== null ? Rocks[code] : null;
}

/**
 * A tree stands on a corner of its tile. Stones lie flat all over it, the
 * way the tile does, so they go at the height of its middle - halfway up it,
 * on a slope.
 */
function place(self, go, tile, spriteData) {
    var terrain = self.root.core.terrain,
        x = CoreTerrain.extractX(tile),
        y = CoreTerrain.extractY(tile),
        z = spriteData.flat ? terrain.getHeight(x + 0.5, y + 0.5) : terrain.getGridPointHeight(x + 1, y);

    go.transform.setPosition(x * Config.tileSize, z * Config.tileZStep, y * Config.tileSize);
}

function dress(self, go, spriteData) {
    var renderer = go.renderer;
    renderer.setSprite(self.root.sprites.getSprite(spriteData.path));
    renderer.pivotX = spriteData.pivotX;
    renderer.pivotY = spriteData.pivotY;
}

function plant(self, tile, spriteData) {
    var go = Pool.borrowObject(self.pool);

    dress(self, go, spriteData);
    place(self, go, tile, spriteData);

    self.root.game.scene.addGameObject(go);

    self._scenery[tile] = go;
}

function remove(self, tile){
    var go = self._scenery[tile];
    if (go !== undefined) {
        delete self._scenery[tile];
        Pool.returnObject(self.pool, go);
        self.root.game.scene.removeGameObject(go);
    }
}

function plantAll(self, chunk) {
    var tiles = chunk.tiles();
    var tile, spriteData;
    while (!tiles.done) {
        tile = TileIterator.next(tiles);
        if (self._scenery[tile] === undefined && (spriteData = sceneryOf(self, tile)) !== null)
            plant(self, tile, spriteData);
    }
}

function removeAll(self, chunk) {
    var tiles = chunk.tiles();
    var tile;

    while (!tiles.done) {
        tile = TileIterator.next(tiles);
        remove(self, tile);
    }
}

function onChunkLoad(sender, chunk, meta) {
    //console.log("EnvMan::onTileLoad", sender, args, meta);
    plantAll(meta, chunk);
}

function onChunkRemove(sender, chunk, meta) {
    //console.log("EnvMan::onTileRemove", sender, args, meta);
    removeAll(meta, chunk);
}

function onSceneryRemove(sender, tile, self){
    remove(self, tile);
}

/**
 * The ground under these tiles moved, so their trees and stones are put at
 * its new height - or taken away, where the tile is under water now, or put
 * where they were not.
 *
 * One that stays is moved rather than taken out and put there again: taking
 * one out only happens at the end of the tick, and the pool would hand the
 * same one straight back to be lost with it.
 */
function onGridUpdate(sender, args, self) {
    var tiles = args.tiles,
        tile, spriteData, go, i;

    for (i = 0; i < tiles.length; i++) {
        tile = tiles[i];
        go = self._scenery[tile];
        spriteData = sceneryOf(self, tile);

        if (go !== undefined) {
            if (spriteData === null)
                remove(self, tile);
            else {
                dress(self, go, spriteData);
                place(self, go, tile, spriteData);
            }
        //only ever put on a tile that is on screen
        } else if (spriteData !== null && self.root.terrain.getTile(tile) !== null) {
            plant(self, tile, spriteData);
        }
    }
}

/**
 * Draws what the world puts on the land by itself, wherever it is on screen:
 * the trees, and the stones.
 */
function EnvMan(root) {
    this.root = root;
    this._scenery = {};
    this.pool = new Pool(Tree);
}

EnvMan.prototype.init = function () {
    this.core = this.root.core;

    var chunks = this.root.chunkman.getChunks();

    for(var i in chunks){
        plantAll(this, chunks[i]);
    }

    Events.on(this.root.chunkman, Chunkman.events.chunkLoad, onChunkLoad, this);
    Events.on(this.root.chunkman, Chunkman.events.chunkUnload, onChunkRemove, this);

    Events.on(this.core.envService, Core.EnvService.events.sceneryRemove, onSceneryRemove, this);
    Events.on(this.core.terrain, Core.Terrain.events.gridUpdate, onGridUpdate, this);
};


export default EnvMan;

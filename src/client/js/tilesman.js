import engine from "engine";
import Config from "./config";
import Events from "events";
import Tile from "./gameObjects/tile";
import Core from "core/main";

var events = {
    tileLoad: 0,
    tileRemove: 1
};

function Tilesman(root) {
    this.chunkSize = Config.chunkSize;

    this.events = events;
    this.events["loadedTiles"] = 0;
    this.events["removedTiles"] = 1;

    this.chunks = [];

    var self = this;

    //the camera moved, or zoomed and sees more or less of the ground
    this.onCameraMove = function (camera) {
        var position = camera.gameObject.transform.getPosition(vec3Buffer1),
            radius = chunkRadius(self, camera),
            shrunk = radius < self.radius;

        self.currentChunkX = ((position[0] / Config.tileSize / Config.chunkSize) | 0);
        self.currentChunkY = ((position[2] / Config.tileSize / Config.chunkSize) | 0);
        self.radius = radius;

        self.loadChunks2(self.currentChunkX, self.currentChunkY);

        if (shrunk)
            self.cleanChunks();
    };
}

//a tile is this many pixels across on screen, and half as many down
var TILE_WIDTH = Config.tileSize * Math.SQRT2;

/**
 * How many rings of chunks around the one under the camera it takes to cover
 * everything it sees.
 *
 * A corner of the picture is as many tiles away from the middle, along each
 * of the tiles' axes, as it is tile widths across and tile heights down - the
 * axes run corner to corner across the screen. The camera is taken to be in
 * the middle of its chunk, which is where it is on average, so on the biggest
 * screens a corner can still come up bare as it nears a chunk's edge - that
 * is how it has always been at the zoom it started with, which this keeps to
 * a single ring on most.
 */
function chunkRadius(self, camera) {
    var corner = camera.frustumSize[1],
        tiles = corner[0] / TILE_WIDTH + corner[1] / (TILE_WIDTH / 2);

    return Math.max(1, Math.ceil(tiles / self.chunkSize - 0.5));
}

Tilesman.events = events;

var vec3Buffer1 = new Float32Array(3);

Tilesman.prototype.constructor = Tilesman;

Tilesman.prototype.mainCamera = null;
Tilesman.prototype.chunkSize = 24;// default (24 * ((window.innerWidth * window.innerHeight)/1852800))|0;
Tilesman.prototype.currentChunkX = 0;
Tilesman.prototype.currentChunkY = 0;
//how many rings of chunks around the current one are kept loaded
Tilesman.prototype.radius = 1;

Tilesman.prototype.start = function () {
    var cam = vkaria.game.logic.world.findByName("mainCamera");

    cam.camera.addEventListener(cam.camera.events.update, this.onCameraMove);
    //only the tiles around the ground that moved have to be drawn again
    Events.on(vkaria.core.terrain, Core.Terrain.events.gridUpdate, function (terrain, args) {
        vkaria.terrain.redraw(args.tiles);
    }, this);

    this.onCameraMove(cam.camera);
};

Tilesman.prototype.updateChunks = function () {
    var centerX = this.currentChunkX;
    var centerY = this.currentChunkY;
    var r = this.radius, side = 2 * r + 1;

    for (var i = 0; i < side * side; i++) {
        var x = (i / side) | 0,
            y = i - x * side,
            cx = centerX + x - r,
            cy = centerY + y - r;

        vkaria.terrain.clear(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
        vkaria.terrain.draw(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
    }
};

Tilesman.prototype.getCurrentChunks = function(){
    var centerX = this.currentChunkX;
    var centerY = this.currentChunkY;
    var r = [];
    var radius = this.radius, side = 2 * radius + 1;
    for (var i = 0; i < side * side; i++) {
        var x = (i / side) | 0,
            y = i - x * side,
            cx = centerX + x - radius,
            cy = centerY + y - radius;

        r.push({x: cx * this.chunkSize, y: cy * this.chunkSize});
    }
    return r;
};

Tilesman.prototype.loadChunks2 = function (centerX, centerY) {

    console.log("Load chunks");

    centerX = centerX || this.currentChunkX;
    centerY = centerY || this.currentChunkY;

    var r = this.radius, side = 2 * r + 1;

    for (var i = 0; i < side * side; i++) {
        var x = (i / side) | 0,
            y = i - x * side,
            cx = centerX + x - r,
            cy = centerY + y - r;


        if (this.getChunk(cx, cy) === false && cx >= 0 && cy >= 0) {
            this.makeChunk(cx, cy);
            var s = this;
            Events.fire(s, events.tileLoad, {
                meta: {
                    x: cx * s.chunkSize, y: cy * s.chunkSize, w: s.chunkSize, h: s.chunkSize
                }
            });
            vkaria.terrain.draw(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
            this.cleanChunks();
        }

    }
};

/**
 * Will create chunk of blank tiles
 * @param cX
 * @param cY
 * @returns {*}
 */
Tilesman.prototype.makeChunk = function (cX, cY) {
    if (!this.getChunk(cX, cY) && cX >= 0 && cY >= 0) {
        //console.time("makeChunk");
        var chunk;

        if (this.chunks[cX] == undefined)
            this.chunks[cX] = [];

        chunk = this.chunks[cX][cY] = true;

        return chunk;
    }
    return false;
};

Tilesman.prototype.getChunk = function (cX, cY) {
    if (cX >= 0 && cY >= 0 && this.chunks[cX] !== undefined && this.chunks[cX][cY] !== undefined) {
        return this.chunks[cX][cY];
    }
    return false;
};

Tilesman.prototype.removeChunk = function (cx, cy) {
    var chunk = this.getChunk(cx, cy);

    if (chunk !== false) {

        this.chunks[cx][cy] = undefined;
    }

    Events.fire(this, this.events.removedTiles, {
        x: cx * this.chunkSize,
        y: cy * this.chunkSize,
        w: this.chunkSize,
        h: this.chunkSize
    });
};

/**
 * Remove old chunks around current position, those that are further than radius from the current one.
 */
Tilesman.prototype.cleanChunks = function () {
    var chunks = this.chunks,
        cx, cy;

    for (cx = 0; cx < chunks.length; cx++) {
        if (chunks[cx] === undefined)
            continue;

        for (cy = 0; cy < chunks[cx].length; cy++) {
            if (chunks[cx][cy] !== undefined && (Math.abs(cx - this.currentChunkX) > this.radius || Math.abs(cy - this.currentChunkY) > this.radius)) {
                this.removeChunk(cx, cy);
                vkaria.terrain.clear(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
            }
        }
    }


};

export default Tilesman;

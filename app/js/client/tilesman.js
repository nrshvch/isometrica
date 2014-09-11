define(function (require) {
    var engine = require("engine"),
        Config = require("./config"),
        Events = require("events"),
        Tile = require("./gameObjects/Tile"),
        Core = require("core");

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

        this.onCameraMove = function (transform) {
            var position = transform.getPosition(vec3Buffer1);

            self.currentChunkX = ((position[0] / Config.tileSize / Config.chunkSize) | 0);
            self.currentChunkY = ((position[2] / Config.tileSize / Config.chunkSize) | 0);

            self.loadChunks2(self.currentChunkX, self.currentChunkY);
        };
    }

    Tilesman.events = events;

    var vec3Buffer1 = new Float32Array(3);

    Tilesman.prototype.constructor = Tilesman;

    Tilesman.prototype.mainCamera = null;
    Tilesman.prototype.chunkSize = 24;// default (24 * ((window.innerWidth * window.innerHeight)/1852800))|0;
    Tilesman.prototype.currentChunkX = 0;
    Tilesman.prototype.currentChunkY = 0;

    Tilesman.prototype.start = function () {
        var cam = vkaria.game.logic.world.findByName("mainCamera");

        cam.transform.addEventListener(cam.transform.events.update, this.onCameraMove);
        Events.on(vkaria.core.terrain, Core.Terrain.events.gridUpdate, function (terrain, args, self) {
            self.updateChunks();
        }, this);

        this.onCameraMove(cam.transform);
    };

    Tilesman.prototype.updateChunks = function () {
        var centerX = this.currentChunkX;
        var centerY = this.currentChunkY;

        for (var i = 0; i < 9; i++) {
            var x = (i / 3) | 0,
                y = i - x * 3,
                cx = centerX + x - 1,
                cy = centerY + y - 1;

            vkaria.terrain.clear(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
            vkaria.terrain.draw(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
        }
    };

    Tilesman.prototype.getCurrentChunks = function(){
        var centerX = this.currentChunkX;
        var centerY = this.currentChunkY;
        var r = [];
        for (var i = 0; i < 9; i++) {
            var x = (i / 3) | 0,
                y = i - x * 3,
                cx = centerX + x - 1,
                cy = centerY + y - 1;

            r.push({x: cx * this.chunkSize, y: cy * this.chunkSize});
        }
        return r;
    };

    Tilesman.prototype.loadChunks2 = function (centerX, centerY) {

        console.log("Load chunks");

        centerX = centerX || this.currentChunkX;
        centerY = centerY || this.currentChunkY;

        for (var i = 0; i < 9; i++) {
            var x = (i / 3) | 0,
                y = i - x * 3,
                cx = centerX + x - 1,
                cy = centerY + y - 1;


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
     * Remove old chunks around current position, remove those that are outside of 3x3 area of current chunks.
     */
    Tilesman.prototype.cleanChunks = function () {
        var chunks = this.chunks,
            cx, cy;

        for (cx = 0; cx < chunks.length; cx++) {
            if (chunks[cx] === undefined)
                continue;

            for (cy = 0; cy < chunks[cx].length; cy++) {
                if (chunks[cx][cy] !== undefined && (Math.abs(cx - this.currentChunkX) > 1 || Math.abs(cy - this.currentChunkY) > 1)) {
                    this.removeChunk(cx, cy);
                    vkaria.terrain.clear(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
                }
            }
        }


    };

    return Tilesman;
});

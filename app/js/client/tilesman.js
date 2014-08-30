define(function (require) {
    var engine = require("engine"),
        Config = require("./config"),
        EventManager = require("events"),
        Events = require("events"),
        Tile = require("./gameObjects/Tile"),
        Core = require("core"),
        TileMessage = require("./gameObjects/tilemessage");

    function Tilesman(mainScript, camera) {
        this.chunkSize = Config.chunkSize;
        //this.chunkSize = 4;

        this.events = {
            loadedTiles: 0,
            removedTiles: 1
        };

        this.chunks = [];

        this.main = mainScript;
        this.mainCamera = camera;

        var self = this;

        this.onCameraMove = function (transform) {
            var position = transform.getPosition(vec3Buffer1);

            self.currentChunkX = ((position[0] / Config.tileSize / Config.chunkSize) | 0);
            self.currentChunkY = ((position[2] / Config.tileSize / Config.chunkSize) | 0);

            self.loadChunks2(self.currentChunkX, self.currentChunkY);
        };
    }

    var vec3Buffer1 = new Float32Array(3);

    Tilesman.prototype = Object.create(EventManager.prototype);
    Tilesman.prototype.constructor = Tilesman;

    Tilesman.prototype.mainCamera = null;
    Tilesman.prototype.chunkSize = 24;// default (24 * ((window.innerWidth * window.innerHeight)/1852800))|0;
    Tilesman.prototype.currentChunkX = 0;
    Tilesman.prototype.currentChunkY = 0;

    Tilesman.prototype.start = function () {
        var cam = vkaria.game.logic.world.findByName("mainCamera");

        cam.transform.addEventListener(cam.transform.events.update, this.onCameraMove);
        Events.on(vkaria.core.terrain, Core.Terrain.events.gridUpdate, function (terrain, args, self) {
            console.log(111);
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
                vkaria.terrain.draw(cx * this.chunkSize, cy * this.chunkSize, this.chunkSize, this.chunkSize);
                var s = this;
                Events.fire(s, s.events.loadedTiles, {
                    meta: {
                        x: cx * s.chunkSize, y: cy * s.chunkSize, w: s.chunkSize, h: s.chunkSize
                    }
                });
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
        //console.time("makeChunk");
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

    Tilesman.prototype.getTile = function (x, y) {
        var cx = (x / this.chunkSize) | 0,
            cy = (y / this.chunkSize) | 0,
            chunk = this.getChunk(cx, cy);

        if (chunk) {
            return chunk[this.chunkSize * (x - cx * this.chunkSize) + (y - cy * this.chunkSize)];
        } else {
            return null;
        }
    };

    Tilesman.prototype.clearTile = function (x, y) {
        var self = this;
        vkaria.core.clearTile(x, y, function (data, data2) {
            if (data) {
                var tile = self.getTile(x, y),
                    pos = tile.transform.getPosition();

                vkaria.assets.getAsset("/audio/explosion.wav", vkaria.assets.constructor.Resource.ResourceTypeEnum.audio).done(function (resource) {
                    //resource.data.play();
                });

                var msg = new TileMessage("1$", "red");
                msg.transform.setPosition(pos[0], pos[1], pos[2]);
                vkaria.game.logic.world.addGameObject(msg);
            }
        });
    };

    return Tilesman;
});

define(function (require) {
    var Tile = require("./tile");

    function Tiles(world) {
        this.world = world;
        this.terrain = world.terrain;
        this.objects = world.objects;

        this.fillMap = new Uint8Array((world.size*world.size)/8);

        this.collection = new Array(world.size * world.size);
    }

    Tiles.prototype.constructor = Tiles;

    Tiles.prototype.onTileUpdate = null;

    /**
     * @type {[]}
     */
    Tiles.prototype.collection = null;

    Tiles.prototype.init = function(){
        //initalize all tiles
        for(var i = 0; i < this.world.size * this.world.size; i++){
            var x = (i / this.world.size) | 0;
            var y = i - (x * this.world.size);

            this.collection[i] = this.createTile(x,y);
            this.fill(x,y);
        }
    };

    Tiles.prototype.createTile = function(x, y){
        var tile = new Tile(this.world, x, y);
        //tile.id = x * this.world.size + y;
        tile.id = y << 16 ^ x;
        return tile;
    }

    /**
     * @param {int} x
     * @param {int] y
     */
    Tiles.prototype.get = function (x, y) {
        var index = x * (this.world.size) + y;

        if(this.checkFill(x, y)){
            return this.collection[index];
        }

        return null;
    };

    Tiles.prototype.getRange = function (x0, y0, w, h) {
        var wh = w * h,
            r = new Array(),
            x, y, i, tile;

        for (i = 0; i < wh; i++) {
            x = ((i / h) | 0) + x0;
            y = i % h + y0;

            tile = this.get(x, y);

            if (tile) {
                r[i] = tile;
            }
        }

        return r;
    };

    Tiles.prototype.searchSquareRadius = function (x0, y0, radius, f) {
        var x1 = x0 + radius,
            x0 = x0 - radius,
            y1 = y0 + radius,
            y0 = y0 - radius;

        x0 = Math.max(x0,0);
        y0 = Math.max(y0,0);
        x1 = Math.min(x1, this.world.size-1);
        y1 = Math.min(y1, this.world.size-1);

        for (var x = x0; x <= x1; x++) {
            for (var y = y0; y <= y1; y++) {
                if (f(this.get(x, y)))
                    return true;
            }
        }
        return false;
    };

    Tiles.prototype.checkFill = function(x,y){
        var n = x * this.world.size + y,
            index = n >> 3,
            offset = n - (index << 3);

        return !!(this.fillMap[index] >> offset & 1);
    };

    Tiles.prototype.fill = function(x, y){
        var n = x * this.world.size + y,
            index = n >> 3,
            offset = n - (index << 3);

        return this.fillMap[index] |= 1 << offset;
    };

    Tiles.prototype.clear = function (x, y) {
        this.get(x, y).clear();
    };

    Tiles.prototype.save = function(){
        return {}
    };

    Tiles.prototype.load = function(){
        return true;
    };

    return Tiles;
});
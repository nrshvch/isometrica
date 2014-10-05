/**
 * Created by denis on 9/11/14.
 */
define(function (require) {
    var Core = require("core");
    var Chunk = require("./chunk");
    var TilesMan = require("./tilesman");
    var Config = require("./config");
    var Terrain = Core.Terrain;
    var Events = require("events");

    var events = {
        chunkLoad: 0,
        chunkRemove: 1,
        chunkUnload: 1
    };

    function onChunkLoad(sender, args, self){
        var tile0 = Terrain.convertToIndex(args.meta.x, args.meta.y);
        var tile1 = Terrain.convertToIndex(args.meta.x + args.meta.w - 1, args.meta.y + args.meta.h - 1);
        var chunk = new Chunk(tile0, tile1);

        self._chunks[tile0+";"+tile1] = chunk;

        Events.fire(self, events.chunkLoad, chunk);
    }

    function onChunkRemove(sender, args, self){
        var tile0 = Terrain.convertToIndex(args.x, args.y);
        var tile1 = Terrain.convertToIndex(args.x + args.w - 1, args.y + args.h - 1);
        var chunk = new Chunk(tile0, tile1);

        delete self._chunks[tile0+";"+tile1];

        Events.fire(self, events.chunkRemove, chunk);
    }

    function Chunkman(root) {
        this._chunks = {};
        this.root = root;
    }

    Chunkman.events = events;

    Chunkman.prototype.init = function(){
        var tilesman = this.root.tilesman;

        var chks = tilesman.getCurrentChunks();
        for(var i in chks){
            var c = chks[i];
            var tile0 = Terrain.convertToIndex(c.x, c.y);
            var tile1 = Terrain.convertToIndex(c.x + Config.chunkSize - 1, c.y + Config.chunkSize - 1);
            this._chunks[tile0+";"+tile1] = new Chunk(tile0, tile1);
        }

        Events.on(tilesman, TilesMan.events.tileLoad, onChunkLoad, this);
        Events.on(tilesman, TilesMan.events.tileRemove, onChunkRemove, this);
    };

    Chunkman.prototype.getChunks = function(){
        var r = [];
        for(var key in this._chunks){
            r.push(this._chunks[key])
        }
        return r;
    };

    return Chunkman;
});

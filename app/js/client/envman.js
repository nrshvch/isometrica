/**
 * Created by denis on 8/27/14.
 */
define(function(require){
    var Events = require("events");
    var Terrain = require("./terrain");

    function onTilesLoaded(sender, args, meta){
       var self = meta;
        //self.core.envService.getTree()
        console.log(sender, args, meta);
    }

    function EnvMan(root){
        this.root = root;
    }

    EnvMan.prototype.init = function(){
        this.core = this.root.core;
        this.terrain = this.root.terrain;

        //Events.on(this.terrain, Terrain.events.onTiles
    };



    return EnvMan;
});
/**
 * Created by User on 13.07.2014.
 */
define(function(require){
    var Tile = require("./gameObjects/tile");
    var TerrainType = require('lib/terraintype');

    var grass = {
        2222: 'grass/2222.png',
        2111: 'grass/2111.png',
        2223: 'grass/2223.png',
        2112: 'grass/2112.png',
        2232: 'grass/2232.png',
        2121: 'grass/2121.png',
        2233: 'grass/2233.png',
        2122: 'grass/2122.png',
        2322: 'grass/2322.png',
        2211: 'grass/2211.png',
        2323: 'grass/2323.png',
        2212: 'grass/2212.png',
        2332: 'grass/2332.png',
        2221: 'grass/2221.png',
        2333: 'grass/2333.png',
        2321: 'grass/2321.png',
        2123: 'grass/2123.png',
        2101: 'grass/2101.png',
        2343: 'grass/2343.png'
    };

    var shore = {
        2222: 'shore/2222.png',
        2111: 'shore/2111.png',
        2223: 'shore/2223.png',
        2112: 'shore/2112.png',
        2232: 'shore/2232.png',
        2121: 'shore/2121.png',
        2233: 'shore/2233.png',
        2122: 'shore/2122.png',
        2322: 'shore/2322.png',
        2211: 'shore/2211.png',
        2323: 'shore/2323.png',
        2212: 'shore/2212.png',
        2332: 'shore/2332.png',
        2221: 'shore/2221.png',
        2333: 'shore/2333.png',
        2321: 'shore/2321.png',
        2123: 'shore/2123.png',
        2101: 'shore/2101.png',
        2343: 'shore/2343.png'
    };

    var water = {
        2222: "water/2222.png"
    };

    function Terrain(){
        this.tiles = [];
        this.gos = [];
        this.pool = [];
    }

    function CreateTile(self){
        if(self.pool.length>0) {
            return self.pool.pop();
        }else {
            return new Tile();
        }
    }

    Terrain.prototype.clear = function(x0,y0,w,l){
        var x1 = x0 + w,
            y1 = y0 + l;

        for(var x = x0; x < x1; x++){
            for(var y = y0; y < y1; y++){
                var index = y << 16 ^ x;
                var tile = this.tiles[index];
                if(tile) {
                   //tile.destroy();
                    vkaria.game.logic.world.removeGameObject(tile);
                    this.pool.push(tile);
                    delete this.tiles[index];
                    delete this.gos[t.instanceId];
                }
            }
        }
    };

    Terrain.prototype.draw = function(x0,y0,w,l){
        var coreTerrain = vkaria.core.world.terrain;

        var x1 = x0 + w,
            y1 = y0 + l;

        //var gridpoints = coreTerrain.getAreaGrid(x0,y0,w,l);



        for(var x = x0; x < x1; x++){
            for(var y = y0; y < y1; y++){
                var index = y << 16 ^ x;
                if(!this.tiles[index]) {
                    var t = CreateTile(this);

                    var gps = coreTerrain.getGridPoints(x,y);


                    var slope = coreTerrain.calcSlopeId(x,y);
                    var type = coreTerrain.getTerrainType(x,y);
                    var sprite = null;

                    var z = 0;

                    if(type !== TerrainType.water)
                        z = gps[2];

                    t.transform.setPosition(
                            x * vkaria.config.tileSize,
                            z * vkaria.config.tileZStep,
                            y * vkaria.config.tileSize
                    );

                    if(type === TerrainType.grass)
                        sprite = vkaria.sprites.getSprite(grass[slope.toString()]);
                    else if(type === TerrainType.shore)
                        sprite = vkaria.sprites.getSprite(shore[slope.toString()]);
                    else
                        sprite = vkaria.sprites.getSprite(water["2222"]);

                    t.renderer.setSprite(sprite);
                    vkaria.game.logic.world.addGameObject(t);

                    this.tiles[index] = t;
                    this.gos[t.instanceId] = index;
                }
            }
        }
    };

    Terrain.prototype.getHeight = function(x,y){
        return vkaria.core.world.terrain.getGridPoints(x,y)[2];
    };

    Terrain.prototype.getTile = function(x,y){
        var t = this.tiles[y<<16^x];
        if(t != undefined)
            return t;
        else
            return null;
    };

    /**
     * Find tile coordinates by gameObject
     */
    Terrain.prototype.getCoordinates = function(go){
        var g = this.gos[go.instanceId];
        if(g !== undefined){
            return {
                x: g & 0xFFFF,
                y: g >>> 16
            };
        }
        return null;
    };

    return Terrain;
});

/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 19.05.14
 * Time: 12:58
 * To change this template use File | Settings | File Templates.
 */
define(function(require){
    function getMapData(terrain){
        var world = terrain.world;
        var result = new Uint8Array(world.size*world.size);

        return result;
    }

    function generateTile(terrain, x, y){
        var tile = new Tile(x,y);
        var tree = new Building("");
    }
});

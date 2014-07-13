define(function(require){
   var engine = require("engine");

    function Script(){
        engine.Component.call(this);
    }

    Script.prototype = Object.create(engine.Component.prototype);

    Script.prototype.setHiliteData = function(hiliteData){
        var r = this.gameObject.renderer,
            t = this.gameObject.transform;

        r.x = hiliteData.x;
        r.y = hiliteData.y;
        r.fillColor = hiliteData.fillColor;
        r.borderColor = hiliteData.borderColor;

        if(hiliteData.borderWidth !== undefined)
            r.borderWidth = hiliteData.borderWidth;

        var tile = vkaria.terrain.getTile(r.x, r.y);
        var pos = tile.transform.getPosition();
        t.setPosition(pos[0], pos[1], pos[2]);

        var type = vkaria.core.world.terrain.getTerrainType(r.x, r.y);
        var gps = vkaria.core.world.terrain.getGridPoints(r.x, r.y);

        var zStep = vkaria.config.tileZStep;

        if (type === 0) {
            r.points[0][1] = 0;
            r.points[1][1] = 0;
            r.points[2][1] = 0;
            r.points[3][1] = 0;
        } else {
            r.points[0][1] = (gps[3] - gps[2]) * zStep;
            r.points[1][1] = (gps[0] - gps[2]) * zStep;
            r.points[2][1] = (gps[1] - gps[2]) * zStep;
            r.points[3][1] = (gps[2] - gps[2]) * zStep;
        }
    };


    return Script;
});

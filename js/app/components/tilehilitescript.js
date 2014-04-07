define(function(require){
   var engine = require("engine");

    function Script(){
        engine.Component.call(this);
    }

    Script.prototype = Object.create(engine.Component.prototype);

    Script.prototype.setHiliteData = function(hiliteData){
        var r = this.gameObject.renderer,
            t = this.gameObject.transform,
            tilesman = vkariaApp.tilesman;

        r.x = hiliteData.x;
        r.y = hiliteData.y;
        r.fillColor = hiliteData.fillColor;
        r.borderColor = hiliteData.borderColor;

        if(hiliteData.borderWidth !== undefined)
            r.borderWidth = hiliteData.borderWidth;

        var tile = tilesman.getTile(r.x, r.y);
        var pos = tile.transform.getPosition();
        t.setPosition(pos[0], pos[1], pos[2]);

        tile = tile.tileScript;

        var zStep = vkaria.config.tileZStep;

        if (tile.type === 0) {
            r.points[0][1] = 0;
            r.points[1][1] = 0;
            r.points[2][1] = 0;
            r.points[3][1] = 0;
        } else {
            r.points[0][1] = (tile.gridPoints[3] - tile.z) * zStep;
            r.points[1][1] = (tile.gridPoints[0] - tile.z) * zStep;
            r.points[2][1] = (tile.gridPoints[1] - tile.z) * zStep;
            r.points[3][1] = (tile.gridPoints[2] - tile.z) * zStep;
        }
    };


    return Script;
});

define(function(require){
    var ToolBase = require("./toolbase");

    function Tool(tools){
        ToolBase.call(this, tools);
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        tileSelected: 1
    };

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

        this.tools.cameraScript.pan(dragX, dragY);
    };

    Tool.prototype.move = function(screenX, screenY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
        if (tile)
            this.tools.highliteTile(tile.tileScript.x, tile.tileScript.y);
        else
            this.tools.disableHighliters();
    };

    Tool.prototype.click = function(screenX, screenY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
        if (tile)
            this.dispatchEvent(this.events.tileSelected, this, tile);
    };



    return Tool;
});

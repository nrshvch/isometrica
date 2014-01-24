define(function(require){
    var ToolBase = require("./toolbase");

    function Tool(tools){
        ToolBase.call(this, tools);
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        tileSelected: 1
    };

    Tool.prototype.dragEnd = function(screenX ,screenY){
        if (this.dragSource && this.dragDestination) {
            var x0 = Math.min(this.dragSource.x, this.dragDestination.x),
                y0 = Math.min(this.dragSource.y, this.dragDestination.y),
                x1 = Math.max(this.dragSource.x, this.dragDestination.x),
                y1 = Math.max(this.dragSource.y, this.dragDestination.y);

            for (var x = x0; x <= x1; x++) {
                for (var y = y0; y <= y1; y++) {
                    vkaria.logicInterface.clearTile(x, y);
                }
            }
        }
        this.tools.disableHighliters();

        this.dragSource = this.dragDestination = null;
    };

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));

        if(tile){
            this.dragDestination = tile.tileScript;
            this.tools.highliteArea(this.dragSource.x, this.dragSource.y, this.dragDestination.x, this.dragDestination.y, "red");
        }
    };

    Tool.prototype.move = function(screenX, screenY){
        if (!this.dragSource) {
            var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
            if (tile)
                this.tools.highliteTile(tile.tileScript.x, tile.tileScript.y, "red");
            else
                this.tools.disableHighliters();
        }
    };

    Tool.prototype.click = function(screenX, screenY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
        if (tile)
            vkaria.logicInterface.clearTile(tile.tileScript.x, tile.tileScript.y);
    };



    return Tool;
});

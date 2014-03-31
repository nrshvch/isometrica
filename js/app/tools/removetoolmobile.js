define(function(require){
    var ToolBase = require("./toolbase");

    function Tool(tools){
        ToolBase.call(this, tools);
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.areaX0 = null;
    Tool.prototype.areaY0 = null;
    Tool.prototype.areaX1 = null;
    Tool.prototype.areaY1 = null;

    Tool.prototype.events = {
        awaitingConfirmation: 0,
        receivedConfirmation: 1
    };

    Tool.prototype.dragEnd = function(screenX ,screenY){
        if (this.dragSource && this.dragDestination) {
            var x0 = Math.min(this.dragSource.x, this.dragDestination.x),
                y0 = Math.min(this.dragSource.y, this.dragDestination.y),
                x1 = Math.max(this.dragSource.x, this.dragDestination.x),
                y1 = Math.max(this.dragSource.y, this.dragDestination.y);

            this.areaX0 = x0;
            this.areaY0 = y0;
            this.areaX1 = x1;
            this.areaY1 = y1;

            this.dispatchEvent(this.events.awaitingConfirmation, this, null);
        }

        this.dragSource = this.dragDestination = null;
    };

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));

        if(tile){
            this.dragDestination = tile.tileScript;
            vkariaApp.hiliteMan.hiliteTileArea(this.dragSource.x, this.dragSource.y, this.dragDestination.x, this.dragDestination.y, "red");
        }
    };

    Tool.prototype.click = function(screenX, screenY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
        if (tile)                   {
            this.areaX0 = tile.tileScript.x;
            this.areaY0 = tile.tileScript.y;
            this.areaX1 = tile.tileScript.x;
            this.areaY1 = tile.tileScript.y;

            vkariaApp.hiliteMan.hiliteTile(tile.tileScript.x, tile.tileScript.y, "red");

            this.dispatchEvent(this.events.awaitingConfirmation, this, null);
        }
    };

    Tool.prototype.confirm = function(){
        var x0 = this.areaX0,
            y0 = this.areaY0,
            x1 = this.areaX1,
            y1 = this.areaY1;

        for (var x = x0; x <= x1; x++) {
            for (var y = y0; y <= y1; y++) {
                vkaria.tilesman.clearTile(x,y);
            }
        }

        this.dispatchEvent(this.events.receivedConfirmation, this, null);
        vkariaApp.hiliteMan.disableAll();
    };

    Tool.prototype.cancel = function(){
        vkariaApp.hiliteMan.disableAll();
        this.dispatchEvent(this.events.receivedConfirmation, this, null);
    };

    Tool.prototype.deselect = function(){
        this.cancel();
    };

    return Tool;
});

define(function(require){
    var ToolBase = require("./toolbase");
    var Events = require("events");
    var Core = require("core/main");
    var Terrain = Core.Terrain;

    function Tool(tools){
        ToolBase.call(this, tools);
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        tileSelected: 1,
        awaitingConfirmation: 2,
        receivedConfirmation: 3
    };

    Tool.prototype.onTileSelect = null;

    Tool.prototype.selectedTile = -1;
    Tool.prototype.selectedToken = null;

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

        this.tools.cameraScript.pan(dragX, dragY);
    };

    Tool.prototype.click = function(screenX, screenY){
        var tile = this.tools.pickTile(screenX, screenY);

        if(tile)
            tile = Terrain.convertToIndex(tile.x, tile.y);
        else
            tile = -1;

        if(this.tileValidator !== undefined && !this.tileValidator(tile))
            tile = -1;

        if (tile !== -1){
            if(this.selectedToken != null)
                vkariaApp.hiliteMan.disable(this.selectedToken);

            this.selectedToken = vkariaApp.hiliteMan.hilite({
                x: Terrain.extractX(tile),
                y: Terrain.extractY(tile),
                borderColor: "rgba(255,255,255,1)",
                borderWidth: 2
            });
            this.selectedTile = tile;
            this.dispatchEvent(this.events.awaitingConfirmation, this);
        }
        this.selectedTile = tile;
    };

    Tool.prototype.confirm = function(){
        if(this.selectedTile !== -1 && this.onTileSelect !== null) {
            var result = this.onTileSelect(this.selectedTile);

            if(result) {
                Events.fire(this, this.events.tileSelected, this.selectedTile);
                Events.fire(this, this.events.receivedConfirmation, this);
                vkariaApp.hiliteMan.disable();
            }
        }
    };

    Tool.prototype.cancel = function(){
        this.selectedTile = null;
        vkariaApp.hiliteMan.disable();
        this.dispatchEvent(this.events.receivedConfirmation, this);
    };

    Tool.prototype.deselect = function(){
        this.cancel();
    };

    return Tool;
});

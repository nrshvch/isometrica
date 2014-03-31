define(function(require){
    var ToolBase = require("./toolbase");

    function Tool(tools){
        ToolBase.call(this, tools);
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        tileSelected: 1,
        awaitingConfirmation: 2,
        receivedConfirmation: 3
    };

    Tool.prototype.selectedTile = null;

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

        this.tools.cameraScript.pan(dragX, dragY);
    };

    Tool.prototype.click = function(screenX, screenY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
        if (tile){
            vkariaApp.hiliteMan.hiliteTile(tile.tileScript.x, tile.tileScript.y);
            this.selectedTile = tile;
            this.dispatchEvent(this.events.awaitingConfirmation, this, null);
        }
    };

    Tool.prototype.confirm = function(){
        if(this.selectedTile)
            this.dispatchEvent(this.events.tileSelected, this, this.selectedTile);

        this.dispatchEvent(this.events.receivedConfirmation, this, null);
        vkariaApp.hiliteMan.disableAll();
    };

    Tool.prototype.cancel = function(){
        this.selectedTile = null;
        vkariaApp.hiliteMan.disableAll();
        this.dispatchEvent(this.events.receivedConfirmation, this, null);
    };

    Tool.prototype.deselect = function(){
        this.cancel();
    };

    return Tool;
});

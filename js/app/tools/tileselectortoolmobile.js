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
    Tool.prototype.selectedTileX = -1;
    Tool.prototype.selectedTileY = -1;
    Tool.prototype.selectedToken = null;

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

        this.tools.cameraScript.pan(dragX, dragY);
    };

    Tool.prototype.click = function(screenX, screenY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
        if (tile){
            if(this.selectedToken != null)
                vkariaApp.hiliteMan.disable(this.selectedToken);

            var crds = vkaria.terrain.getCoordinates(tile);

            this.selectedToken = vkariaApp.hiliteMan.hilite({
                x: crds.x,
                y: crds.y,
                borderColor: "rgba(255,255,255,1)",
                borderWidth: 2
            });
            this.selectedTileX = crds.x;
            this.selectedTileY = crds.y;
            this.dispatchEvent(this.events.awaitingConfirmation, this, null);
        }
    };

    Tool.prototype.confirm = function(){
        if(this.selectedTileX !== -1 && this.selectedTileY !== -1)
            this.dispatchEvent(this.events.tileSelected, this, {
                x: this.selectedTileX,
                y: this.selectedTileY
            });

        this.dispatchEvent(this.events.receivedConfirmation, this, null);

        vkariaApp.hiliteMan.disable();
    };

    Tool.prototype.cancel = function(){
        this.selectedTile = null;
        vkariaApp.hiliteMan.disable();
        this.dispatchEvent(this.events.receivedConfirmation, this, null);
    };

    Tool.prototype.deselect = function(){
        this.cancel();
    };

    return Tool;
});

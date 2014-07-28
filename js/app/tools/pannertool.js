define(function(require){
    var ToolBase = require("./toolbase");

   function Tool(tools){
       ToolBase.call(this, tools);
   }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        clicked: 0
    };

    Tool.prototype.dragStart = function(screenX, screenY){
        var tile = this.tools.pickTile(screenX, screenY);
        if(tile)
            this.dragSource = this.tools.tileScript;
    };

    Tool.prototype.dragEnd = function(screenX ,screenY){
        ToolBase.prototype.dragEnd.call(this, screenX, screenY);
    };

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);
        this.tools.cameraScript.pan(dragX, dragY);
    };

    Tool.prototype.move = function(screenX, screenY){

    };

    Tool.prototype.click = function(screenX, screenY){
        var gos = this.tools.cameraScript.pickGameObject(screenX, screenY);
        this.dispatchEvent(this.events.clicked, this, gos);
    };

    return Tool;
});

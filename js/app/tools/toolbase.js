define(function(require){
    var EventManager = require("lib/eventmanager");

    function Tool(tools){
        EventManager.call(this);
        this.tools = tools;
    }

    Tool.prototype = Object.create(EventManager.prototype);

    Tool.prototype.dragSource = null;
    Tool.prototype.dragDestination = null;

    Tool.prototype.dragStart = function(screenX, screenY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
        if(tile)
            this.dragSource = tile.tileScript;
    };

    Tool.prototype.dragEnd = function(screenX ,screenY){
        this.dragSource = this.dragDestination = null;
    };

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));

        if(tile)
            this.dragDestination = tile.tileScript;
    };

    Tool.prototype.move = function(screenX, screenY){

    };

    Tool.prototype.click = function(screenX, screenY){

    };

    Tool.prototype.select = function(){

    };

    Tool.prototype.deselect = function(){

    };

    return Tool;
});

define(function(require){
    var ToolBase = require("./toolbase"),
        buildingData = require("lib/buildingdata");

   function Tool(tools){
       ToolBase.call(this, tools);
   }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {

    };

    Tool.prototype.dragEnd = function(screenX ,screenY){
        if (this.multiBuilder) {
            if (this.dragSource && this.dragDestination) {
                var x0 = Math.min(this.dragSource.x, this.dragDestination.x),
                    y0 = Math.min(this.dragSource.y, this.dragDestination.y),
                    x1 = Math.max(this.dragSource.x, this.dragDestination.x),
                    y1 = Math.max(this.dragSource.y, this.dragDestination.y),
                    tiles;

                //tiles = this.tiles || (this.tiles = this.tools.gameObject.world.findByName("main").mainScript.tilesManager);

                for (var x = x0; x <= x1; x++) {
                    for (var y = y0; y <= y1; y++) {
                        //var tile = tiles.getTile(x, y);
                        vkaria.logicInterface.build(this.buildingCode, x, y);
                        //this.gameObject.world.findByName("city").cityScript.build(tile.tileScript.x, tile.tileScript.y, this.buildingToBuild);
                    }
                }
            }
            this.tools.disableHighliters();
        }

        ToolBase.prototype.dragEnd.call(this, screenX, screenY);
    };

    Tool.prototype.drag = function(screenX, screenY, dragX, dragY){
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

        if (this.multiBuilder) {
            if (this.dragSource !== null) {
                var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
                if (tile)
                    this.tools.highliteArea(this.dragSource.x, this.dragSource.y, this.dragDestination.x, this.dragDestination.y, "blue");
            }
        }
    };

    Tool.prototype.move = function(screenX, screenY){
        ToolBase.prototype.move.call(this, screenX, screenY);

        if (!this.dragSource) {
            var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));

            if (tile) {
                //var tiles = this.tiles || (this.tiles = this.tools.gameObject.world.findByName("main").mainScript.tilesManager);
                this.tools.highliteArea(
                    tile.tileScript.x,
                    tile.tileScript.y,
                    tile.tileScript.x + this.buildingSizeX - 1,
                    tile.tileScript.y + this.buildingSizeY - 1,
                    'blue'
                );
            } else
                this.tools.disableHighliters();
        }
    };

    Tool.prototype.rotate = false;
    Tool.prototype.click = function(screenX, screenY){
        ToolBase.prototype.click.call(this, screenX, screenY);

        var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));

        if (tile)
            vkaria.logicInterface.build(this.buildingCode, tile.tileScript.x, tile.tileScript.y, this.rotate);
    };

    Tool.prototype.setBuilding = function(buildingCode){
        this.buildingCode = buildingCode;

        this.buildingSizeX = buildingData[buildingCode].size & 15;
        this.buildingSizeY = buildingData[buildingCode].size >> 4;

        this.multiBuild(false);

        return this;
    };

    Tool.prototype.multiBuild = function(value){
        this.multiBuilder = value;
        return this;
    };

    return Tool;
});

define(function(require){
    var ToolBase = require("./toolbase"),
        buildingData = require("lib/buildingdata");

    function Tool(tools){
        ToolBase.call(this, tools);
        window.tool = this;
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        awaitingConfirmation: 0,
        receivedConfirmation: 1
    };

    Tool.prototype.selectedTiles = [];

    Tool.prototype.dragEnd = function(screenX ,screenY){
        if (this.multiBuilder) {
            if (this.dragSource && this.dragDestination) {
                var x0 = Math.min(this.dragSource.x, this.dragDestination.x),
                    y0 = Math.min(this.dragSource.y, this.dragDestination.y),
                    x1 = Math.max(this.dragSource.x, this.dragDestination.x),
                    y1 = Math.max(this.dragSource.y, this.dragDestination.y);


                this.selectedTiles = [];
                for (var x = x0; x <= x1; x++)
                    for (var y = y0; y <= y1; y++)
                        this.selectedTiles.push({x:x, y:y});

                this.dispatchEvent(this.events.awaitingConfirmation, this, null);
            }
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

    Tool.prototype.click = function(screenX, screenY){
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
                this.selectedTiles = [{x: tile.tileScript.x, y: tile.tileScript.y}];
                this.dispatchEvent(this.events.awaitingConfirmation, this, null);
            } else
                this.tools.disableHighliters();
        }
    };

    Tool.prototype.setBuilding = function(buildingCode){
        this.buildingCode = buildingCode;

        this.buildingSizeX = buildingData[buildingCode].size & 15;
        this.buildingSizeY = buildingData[buildingCode].size >> 4;

        this.multiBuild(false);

        //test code
        /*
         var pos = this.cameraScript.gameObject.transform.getPosition();
         var conf = vkaria.config;
         var x = (pos[0]/conf.tileSize)|0,
         y = (pos[2]/conf.tileSize)|0;

         console.log(x,y);
         console.log(this.gameObject.world.findByName("main").mainScript.tilesManager.getTile(x,y))
         this.highliteTile(this.gameObject.world.findByName("main").mainScript.tilesManager.getTile(x,y).tileScript);
         */

        return this;
    };

    Tool.prototype.multiBuild = function(value){
        this.multiBuilder = value;
        return this;
    };

    Tool.prototype._rotate = false;
    Tool.prototype.rotate = function(){
        this._rotate = !this._rotate;

        if(!this._rotate){
            this.buildingSizeX = buildingData[this.buildingCode].size & 15;
            this.buildingSizeY = buildingData[this.buildingCode].size >> 4;
        }else{
            this.buildingSizeY = buildingData[this.buildingCode].size & 15;
            this.buildingSizeX = buildingData[this.buildingCode].size >> 4;
        }

        //update highlite
        if(this.selectedTiles.length === 1){
            var tile = this.selectedTiles[0];
            this.tools.highliteArea(
                tile.x,
                tile.y,
                tile.x + this.buildingSizeX - 1,
                tile.y + this.buildingSizeY - 1,
                'blue'
            );
        }
    };

    Tool.prototype.confirm = function(){
        for(var i in this.selectedTiles){
            vkaria.buildman.build(this.buildingCode, this.selectedTiles[i].x, this.selectedTiles[i].y, this._rotate);
        };
        this.tools.disableHighliters();
        this.dispatchEvent(this.events.receivedConfirmation, this, null);
    };

    Tool.prototype.cancel = function(){
        this.selectedTiles = [];
        this.tools.disableHighliters();
        this.dispatchEvent(this.events.receivedConfirmation, this, null);
    };

    Tool.prototype.select = function(){
        this.buildingCode = null;
        this.buildingSizeX = 0;
        this.buildingSizeY = 0;
        this.multiBuild(false);
    };

    Tool.prototype.deselect = function(){
        this.cancel();
    };

    return Tool;
});

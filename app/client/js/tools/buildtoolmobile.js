define(function (require) {
    var Core = require("core/main");
    var ToolBase = require("./toolbase"),
        buildingData = Core.BuildingData;
    var BuildingClassCode = Core.BuildingClassCode;

    var Terrain = Core.Terrain;

    function Tool(tools) {
        ToolBase.call(this, tools);
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        awaitingConfirmation: 0,
        receivedConfirmation: 1
    };

    Tool.prototype.selectedTiles = [];
    Tool.prototype.hiliteTokens = [];

    Tool.prototype.hiliteGrid = function(){
        var visibleGOs = vkariaApp.camera.camera.getVisibleGameObjects(),
            len = visibleGOs.length;

        for (var i = 0; i < len; i++) {
            var g = visibleGOs[i];

            var arg = [];

            if (g.layer == 1) {
                var coord = vkaria.terrain.getCoordinates(g);
                var x = Core.Terrain.extractX(coord);
                var y = Core.Terrain.extractY(coord);
                var res = vkaria.core.world.terrain.getResource(x, y);
                var ResourceCode = Core.ResourceCode;
                if (res) {
                    var color;
                    if(res === ResourceCode.stone)
                        color = "gray";
                    else if(res === ResourceCode.iron)
                        color  = "orange";
                    else
                        color  = "black";

                    arg.push({
                        x: x,
                        y: y,
                        fillColor: color,
                        borderColor: "rgba(255,0,0,0.4)",
                        borderWidth: 2
                    });
                }/* else {
                    arg.push({
                        x: coord.x,
                        y: coord.y,
                        borderColor: "rgba(255,255,255,0.5)"
                    });
                }                                         */
            }

            vkariaApp.hiliteMan.hilite(arg);
        }
    };

    Tool.prototype.disableHiliters = function(){
        if(this.hiliteTokens != null)  {
            for(var i = 0; i < this.hiliteTokens.length; i++)
                vkariaApp.hiliteMan.disable(this.hiliteTokens[i]);
        }
    };

    Tool.prototype.dragEnd = function (screenX, screenY) {
        if (this.multiBuilder) {
            if (this.dragSource && this.dragDestination) {
                var x0 = Math.min(this.dragSource.x, this.dragDestination.x),
                    y0 = Math.min(this.dragSource.y, this.dragDestination.y),
                    x1 = Math.max(this.dragSource.x, this.dragDestination.x),
                    y1 = Math.max(this.dragSource.y, this.dragDestination.y);

                this.selectedTiles = [];
                for (var x = x0; x <= x1; x++)
                    for (var y = y0; y <= y1; y++)
                        this.selectedTiles.push({x: x, y: y});

                this.dispatchEvent(this.events.awaitingConfirmation, this);
            }
        }

        ToolBase.prototype.dragEnd.call(this, screenX, screenY);
    };

    Tool.prototype.drag = function (screenX, screenY, dragX, dragY) {
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

        if (this.multiBuilder) {
            if (this.dragSource !== null) {
                var tile = this.tools.pickTile(screenX, screenY);
                if (tile) {
                    this.disableHiliters();

                    var x0 = this.dragSource.x,
                        y0 = this.dragSource.y,
                        x1 = this.dragDestination.x,
                        y1 = this.dragDestination.y,
                        w = x1 - x0 + 1,
                        h = y1 - y0 + 1;

                    this.hiliteTokens = vkariaApp.hiliteMan.hilite({
                        x: x0,
                        y: y0,
                        w: w,
                        h: h,
                        fillColor: "rgba(0,0,127,0.4)",
                        borderColor: "rgba(0,0,255,0.4)",
                        borderWidth: 2
                    });
                }
            }
        }
    };

    Tool.prototype.click = function (screenX, screenY) {
        ToolBase.prototype.move.call(this, screenX, screenY);

        if (!this.dragSource) {
            var tile = this.tools.pickTile(screenX, screenY);

            if (tile) {
                this.disableHiliters();

                //var tiles = this.tiles || (this.tiles = this.tools.gameObject.world.findByName("main").mainScript.tilesManager);
                var x0 = tile.x,
                    y0 = tile.y,
                    w = this.buildingSizeX,
                    h = this.buildingSizeY;

                this.hiliteTokens = [vkariaApp.hiliteMan.hilite({
                    x: x0,
                    y: y0,
                    w: w,
                    h: h,
                    fillColor: "rgba(0,0,127,0.4)",
                    borderColor: "rgba(0,0,255,0.4)",
                    borderWidth: 2
                })];
                this.selectedTiles = [
                    tile
                ];
                this.dispatchEvent(this.events.awaitingConfirmation, this);
            } else
                vkariaApp.hiliteMan.disableAll();
        }
    };

    Tool.prototype.setBuilding = function (buildingCode) {
        this.buildingCode = buildingCode;

        this.buildingSizeX = buildingData[buildingCode].sizeX;// & 15;
        this.buildingSizeY = buildingData[buildingCode].sizeY;// >> 4;

        this.multiBuild(false);

        return this;
    };

    Tool.prototype.multiBuild = function (value) {
        this.multiBuilder = value;
        return this;
    };

    Tool.prototype._rotate = false;
    Tool.prototype.rotate = function () {
        if(!buildingData[this.buildingCode].canRotate)
            return;

        this._rotate = !this._rotate;

        if (!this._rotate) {
            this.buildingSizeX = buildingData[this.buildingCode].sizeX;// & 15;
            this.buildingSizeY = buildingData[this.buildingCode].sizeY;// >> 4;
        } else {
            this.buildingSizeY = buildingData[this.buildingCode].sizeX;// & 15;
            this.buildingSizeX = buildingData[this.buildingCode].sizeY;// >> 4;
        }

        //update highlite
        if (this.selectedTiles.length === 1) {
            var tile = this.selectedTiles[0];
            this.disableHiliters();
            this.hiliteTokens = [vkariaApp.hiliteMan.hilite({
                x: tile.x,
                y: tile.y,
                w: this.buildingSizeX,
                h: this.buildingSizeY,
                fillColor: "rgba(0,0,127,0.4)",
                borderColor: "rgba(0,0,255,0.4)",
                borderWidth: 2
            })];
        }
    };

    Tool.prototype.confirm = function () {
        for (var i in this.selectedTiles) {
            var tile = Terrain.convertToIndex(this.selectedTiles[i].x, this.selectedTiles[i].y);
            this.tools.root.core.cities.getCity(0).buildingService.buildBuilding(this.buildingCode, tile, this._rotate);
        }

        this.disableHiliters();
        this.dispatchEvent(this.events.receivedConfirmation, this);

        return;
    };

    Tool.prototype.cancel = function () {
        this.selectedTiles = [];
        this.disableHiliters();

        this.dispatchEvent(this.events.receivedConfirmation, this);
    };

    Tool.prototype.select = function () {
        this.buildingCode = null;
        this.buildingSizeX = 0;
        this.buildingSizeY = 0;
        this.multiBuild(false);
        this.hiliteGrid();
    };

    Tool.prototype.deselect = function () {
        vkariaApp.hiliteMan.disable();
        this.cancel();
    };

    return Tool;
});

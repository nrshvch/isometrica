define(function (require) {
    var ToolBase = require("./toolbase"),
        buildingData = require("lib/buildingdata");

    function Tool(tools) {
        ToolBase.call(this, tools);
        window.tool = this;
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.events = {
        awaitingConfirmation: 0,
        receivedConfirmation: 1
    };

    Tool.prototype.selectedTiles = [];
    Tool.prototype.hiliteTokens = null;

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

                this.dispatchEvent(this.events.awaitingConfirmation, this, null);
            }
        }

        ToolBase.prototype.dragEnd.call(this, screenX, screenY);
    };

    Tool.prototype.drag = function (screenX, screenY, dragX, dragY) {
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

        if (this.multiBuilder) {
            if (this.dragSource !== null) {
                var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));
                if (tile) {
                    if(this.hiliteTokens != null)
                        for(var i = 0; i < this.hiliteTokens.length; i++)
                            vkariaApp.hiliteMan.disable(this.hiliteTokens[i]);

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
                        fillColor: "rgba(0,0,127,0.5)"
                    });
                }
            }
        }
    };

    Tool.prototype.click = function (screenX, screenY) {
        ToolBase.prototype.move.call(this, screenX, screenY);

        if (!this.dragSource) {
            var tile = this.tools.filterTile(this.tools.cameraScript.pickGameObject(screenX, screenY));

            if (tile) {
                if(this.hilitiTokens != null)
                    for(var i = 0; i < this.hilitiTokens; i++)
                        vkariaApp.hiliteMan.disable(this.hilitiTokens[i]);

                //var tiles = this.tiles || (this.tiles = this.tools.gameObject.world.findByName("main").mainScript.tilesManager);
                var x0 = tile.tileScript.x,
                    y0 = tile.tileScript.y,
                    w = this.buildingSizeX,
                    h = this.buildingSizeY;

                vkariaApp.hiliteMan.hilite({
                    x: x0,
                    y: y0,
                    w: w,
                    h: h,
                    fillColor: "rgba(0,0,127,0.5)"
                });
                this.selectedTiles = [
                    {x: tile.tileScript.x, y: tile.tileScript.y}
                ];
                this.dispatchEvent(this.events.awaitingConfirmation, this, null);
            } else
                vkariaApp.hiliteMan.disableAll();
        }
    };

    Tool.prototype.setBuilding = function (buildingCode) {
        this.buildingCode = buildingCode;

        this.buildingSizeX = buildingData[buildingCode].size & 15;
        this.buildingSizeY = buildingData[buildingCode].size >> 4;

        this.multiBuild(false);


        var visibleGOs = vkariaApp.camera.camera.getVisibleGameObjects(),
            len = visibleGOs.length;
        for (var i = 0; i < len; i++) {
            var g = visibleGOs[i];

            var arg = [];

            if (g.tileScript) {
                if (g.tileScript.data.resource !== null) {
                    arg.push({
                        x: g.tileScript.x,
                        y: g.tileScript.y,
                        fillColor: "rgba(127,0,0,0.5)",
                        borderColor: "rgba(255,0,0,0.5)"
                    });
                } else {
                    arg.push({
                        x: g.tileScript.x,
                        y: g.tileScript.y,
                        borderColor: "rgba(255,255,255,0.5)"
                    });
                }
            }

            vkariaApp.hiliteMan.hilite(arg);
        }


        return this;
    };

    Tool.prototype.multiBuild = function (value) {
        this.multiBuilder = value;
        return this;
    };

    Tool.prototype._rotate = false;
    Tool.prototype.rotate = function () {
        this._rotate = !this._rotate;

        if (!this._rotate) {
            this.buildingSizeX = buildingData[this.buildingCode].size & 15;
            this.buildingSizeY = buildingData[this.buildingCode].size >> 4;
        } else {
            this.buildingSizeY = buildingData[this.buildingCode].size & 15;
            this.buildingSizeX = buildingData[this.buildingCode].size >> 4;
        }

        //update highlite
        if (this.selectedTiles.length === 1) {
            var tile = this.selectedTiles[0];
            vkariaApp.hiliteMan.hiliteTileArea(
                tile.x,
                tile.y,
                tile.x + this.buildingSizeX - 1,
                tile.y + this.buildingSizeY - 1,
                'blue'
            );
        }
    };

    Tool.prototype.confirm = function () {
        for (var i in this.selectedTiles) {
            vkariaApp.buildman.build(this.buildingCode, this.selectedTiles[i].x, this.selectedTiles[i].y, this._rotate);
        }

        vkariaApp.hiliteMan.disable();

        this.dispatchEvent(this.events.receivedConfirmation, this, null);
    };

    Tool.prototype.cancel = function () {
        this.selectedTiles = [];
        vkariaApp.hiliteMan.disable();
        this.dispatchEvent(this.events.receivedConfirmation, this, null);
    };

    Tool.prototype.select = function () {
        this.buildingCode = null;
        this.buildingSizeX = 0;
        this.buildingSizeY = 0;
        this.multiBuild(false);
    };

    Tool.prototype.deselect = function () {
        this.cancel();
    };

    return Tool;
});

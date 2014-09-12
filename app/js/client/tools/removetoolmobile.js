define(function (require) {
    var ToolBase = require("./toolbase");
    var Core = require("core");

    function Tool(tools) {
        ToolBase.call(this, tools);
    }

    Tool.prototype = Object.create(ToolBase.prototype);

    Tool.prototype.selectedTiles = [];
    Tool.prototype.hiliteTokens = [];

    Tool.prototype.events = {
        awaitingConfirmation: 0,
        receivedConfirmation: 1
    };

    Tool.prototype.dragEnd = function (screenX, screenY) {
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

        ToolBase.prototype.dragEnd.call(this, screenX, screenY);
    };

    Tool.prototype.drag = function (screenX, screenY, dragX, dragY) {
        ToolBase.prototype.drag.call(this, screenX, screenY, dragX, dragY);

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
                    fillColor: "rgba(127,0,0,0.4)",
                    borderColor: "rgba(255,0,0,0.4)",
                    borderWidth: 2
                });
            }
        }
    };

    Tool.prototype.click = function (screenX, screenY) {
        var tile = this.tools.pickTile(screenX, screenY);
        if (tile) {
            this.disableHiliters();

            this.hiliteTokens = [vkaria.hiliteMan.hilite({
                x: tile.x,
                y: tile.y,
                fillColor: "rgba(127,0,0,0.4)",
                borderColor: "rgba(255,0,0,0.4)",
                borderWidth: 2
            })];
            this.selectedTiles = [{x: tile.x, y: tile.y}];
            this.dispatchEvent(this.events.awaitingConfirmation, this);
        }
    };

    Tool.prototype.confirm = function () {
        for (var i in this.selectedTiles) {
            var x = this.selectedTiles[i].x;
            var y = this.selectedTiles[i].y;

            vkaria.core.world.city.clearTile(Core.Terrain.convertToIndex(x,y));
        }

        this.selectedTiles = [];
        this.disableHiliters();

        this.dispatchEvent(this.events.receivedConfirmation, this);
    };

    Tool.prototype.cancel = function () {
        this.selectedTiles = [];
        this.disableHiliters();

        this.dispatchEvent(this.events.receivedConfirmation, this);
    };

    Tool.prototype.deselect = function () {
        this.cancel();
    };

    Tool.prototype.disableHiliters = function () {
        if (this.hiliteTokens != null) {
            for (var i = 0; i < this.hiliteTokens.length; i++)
                vkariaApp.hiliteMan.disable(this.hiliteTokens[i]);
        }
    };

    return Tool;
});

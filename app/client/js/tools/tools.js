//TODO adapt building for mobiles. build only on approve

define(function(require){
    var engine = require("engine/main"),
        EventManager = require("events"),
        ToolCode = require("./toolcode"),
        PannerTool = require("./pannertool"),
        BuildToolMobile = require("./buildtoolmobile"),
        TileSelectorToolMobile = require("./tileselectortoolmobile"),
        RemoveToolMobile = require("./removetoolmobile"),
        RenderLayer = require("../renderlayer");
    var Core = require("core/main");

    function Tools(client){
        EventManager.call(this);

        this.root = client;

        //mask of toolCodes, indicating tools that are disabled
        this.disabledTools = 0;

        this.tools = Object.create(null);
        this.tools[ToolCode.panner] = new PannerTool(this);
        //this.tools[ToolCode.tileSelector] = new TileSelectorTool(this);
        //this.tools[ToolCode.builder] = new BuildTool(this);
        //this.tools[ToolCode.remover] = new RemoveTool(this);
        this.tools[ToolCode.tileSelector] = new TileSelectorToolMobile(this);
        this.tools[ToolCode.remover] = new RemoveToolMobile(this);
        this.tools[ToolCode.builder] = new BuildToolMobile(this);

        this.currentTool = this.tools[ToolCode.panner];

        var self = this;

        this.onInputMove = function (sender, e) {
            self.move(e.gameViewportX, e.gameViewportY);
        };

        this.onInputClick = function (sender, e) {
            self.click(e.gameViewportX, e.gameViewportY);
        };

        this.onInputDragStart = function (sender, e) {
            self.dragStart(e.gameViewportX, e.gameViewportY);
        };

        this.onInputDragEnd = function (sender, e) {
            self.dragEnd(e.gameViewportX, e.gameViewportY);
        };

        this.onInputDrag = function (sender, param) {
            self.drag(param.e.gameViewportX, param.e.gameViewportY, param.dx, param.dy);
        }
    }

    Tools.prototype = Object.create(EventManager.prototype);

    Tools.prototype.events = {
        toolEnabled: 0,
        toolDisabled: 1,
    };

    Tools.prototype.start = function () {
        var camera = this.cameraScript = vkariaApp.camera.cameraScript;
        camera.addEventListener(camera.events.inputClick, this.onInputClick);
        camera.addEventListener(camera.events.inputMove, this.onInputMove);
        camera.addEventListener(camera.events.inputDragStart, this.onInputDragStart);
        camera.addEventListener(camera.events.inputDragEnd, this.onInputDragEnd);
        camera.addEventListener(camera.events.inputDrag, this.onInputDrag);
    };

    Tools.prototype.click = function(screenX, screenY){
        this.currentTool.click(screenX, screenY);
    };

    Tools.prototype.move = function(screenX, screenY){
        this.currentTool.move(screenX, screenY);
    };

    Tools.prototype.dragStart = function(screenX, screenY){
        this.currentTool.dragStart(screenX, screenY);
    };

    Tools.prototype.dragEnd = function(screenX, screenY){
        this.currentTool.dragEnd(screenX, screenY);
    };

    Tools.prototype.drag = function(screenX, screenY, dragX, dragY){
        this.currentTool.drag(screenX, screenY, dragX, dragY);
    };




    Tools.prototype.selectTool = function (toolCode) {
        var enabled = (this.disabledTools & (1 << toolCode)) === 0;

        if(enabled){
            var tool = this.tools[toolCode];

            if(this.currentTool)
                this.currentTool.deselect();

            this.currentTool = tool
            tool.select();

            return tool;
        }

        return false;
    };

    Tools.prototype.disableTool = function (toolCode) {
        this.disabledTools |= 1 << toolCode;
        this.dispatchEvent(this.events.toolDisabled, toolCode);
    };

    Tools.prototype.enableTool = function (toolCode) {
        this.disabledTools &= ~(1 << toolCode);
        this.dispatchEvent(this.events.toolEnabled, toolCode);
    };

    Tools.prototype.disableAll = function(){
        for(var key in ToolCode){
            this.disableTool(ToolCode[key]);
        }
    };

    Tools.prototype.enableAll = function(){
        for(var key in ToolCode){
            this.enableTool(ToolCode[key]);
        }
    };

    Tools.prototype.filterTile = function (gameObjects) {
        var r = gameObjects,
            l = r.length;

        for (var i = 0; i < l; i++)
            if (r[i].layer === RenderLayer.groundLayer)
                return r[i];

        return false;
    };

    Tools.prototype.pickTile = function(screenX, screenY) {
        var tile = this.filterTile(this.cameraScript.pickGameObject(screenX, screenY));
        if(tile){
            var coords = vkaria.terrain.getCoordinates(tile);

            if(coords !== -1){
                return {
                    x: Core.Terrain.extractX(coords),
                    y: Core.Terrain.extractY(coords)
                }
            }

        }
        return null;
    };

    return Tools;
});

define(["./Viewport", "./Canvas2dRenderer"], function (Viewport, Renderer) {
    /**
     * @constructor
     */
    function Graphics(game) {
        this.game = game;
        this.viewports = [];
        this.renderer = new Renderer(this);
        this.started = false;
    }

    var p = Graphics.prototype;

    /**
     * @type {Game}
     */
    p.game = null;

    /**
     * Flag is set when Game was run
     * @type {boolean}
     */
    p.started = false;

    /**
     * @type {Viewport[]}
     */
    p.viewports = null;

    p.start = function(){
        var viewports = this.viewports,
            viewportsCount = viewports.length;
        for(var i = 0; i < viewportsCount; i++){
            viewports[i].start();
        }
        this.started = true;
    }

    /**
     * @param {CameraComponent} camera
     * @return {Viewport}
     */
    p.createViewport = function(canvas){
        var viewport = new Viewport(this, canvas);
        this.viewports.push(viewport);
        if(this.started)
            viewport.start();
        return viewport;
    }

    /**
     * @return {void}
     */
    p.render = function(){
        var viewports = this.viewports,
            viewportsCount = viewports.length;
        for(var i = 0; i < viewportsCount; i++){
            viewports[i].render();
        }
    }

    return Graphics;
});

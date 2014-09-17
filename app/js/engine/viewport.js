//TODO when viewport canvas is scaled the image becomes blurry. CSS3 imageRendering works, but not for Webkit.
// http://jsfiddle.net/VAXrL/21/ this fiddle show if browser supports it somehow.
// http://phrogz.net/tmp/canvas_image_zoom.html
define(function (require) {
    var Events = require("events");
    var config = require("./config");

    /**
     * @param {Graphics} graphics
     * @param {HTMLCanvasElement} canvas @optional
     * @constructor
     */
    function Viewport(graphics, canvas) {
        this.camera = null;
        this.canvas = canvas || document.createElement('canvas');
        this.context = this.canvas.getContext("2d");
        this.context.imageSmoothingEnabled = false;
        this.context.webkitImageSmoothingEnabled = false;
        this.graphics = graphics;
        this.width = 0;
        this.height = 0;

        this.viewportMatrix = new Float32Array(16);

        //generate layers
        this.layers = [];
        for (var i = 0; i < config.layersCount; i++) {
            var cnv = document.createElement("canvas");
            this.layers[i] = cnv.getContext("2d");
            this.layers[i].imageSmoothingEnabled = false;
            //this.layers[i].webkitImageSmoothingEnabled = false;
        }

        var viewport = this;
        window.addEventListener('resize', function(){
            viewport.setSize(viewport.canvas.offsetWidth, viewport.canvas.offsetHeight);
        });

        this.canvas.addEventListener("mousedown", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            Events.fire(viewport, viewport.events.pointerdown, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mouseup", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            Events.fire(viewport, viewport.events.pointerup, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mousemove", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            Events.fire(viewport, viewport.events.pointermove, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mousein", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            Events.fire(viewport, viewport.events.pointerin, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mouseout", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            Events.fire(viewport, viewport.events.pointerout, e);
            e.preventDefault();
        });

        /* touches */

        this.canvas.addEventListener("touchstart", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;


            Events.fire(viewport, viewport.events.pointerdown, e);
        });

        this.canvas.addEventListener("touchmove", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;


            Events.fire(viewport, viewport.events.pointermove, e);
        });

        this.canvas.addEventListener("touchend", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            Events.fire(viewport, viewport.events.pointerup, e);
        });

        this.canvas.addEventListener("touchleave", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            Events.fire(viewport, viewport.events.pointerout, e);
            e.preventDefault();
        });


    }

    var p = Viewport.prototype;

    p.events = {
        update: 0,
        resize: 1,
        pointerdown: 2,
        pointerup: 3,
        pointermove: 4,
        pointerin: 5,
        pointerout: 6
    };

    /**
     * @type {int[]}
     */
    p.size = null;

    p.width = null;
    p.height = null;

    /**
     * 4x4 viewport matrix
     * @type {Array}
     */
    p.viewportMatrix = null;

    /**
     * @type {CameraObject}
     */
    p.camera = null;

    /**
     * @type {HTMLCanvasElement}
     */
    p.canvas = null;

    /**
     * @type {CanvasRenderingContext2D}
     */
    p.context = null;

    p.start = function(){
        this.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
    }

    /**
     * @param {int[]} size Vector2. Size of the viewport
     * @constructor
     */
    p.setSize = function (width, height) {
        this.width = width;
        this.height = height;

        this.canvas.width = width;
        this.canvas.height = height;

        //update viewport matrix
        this.viewportMatrix[0] = (width/2)|0;
        this.viewportMatrix[5] = -(height/2)|0;
        this.viewportMatrix[12] = (width/2)|0;
        this.viewportMatrix[13] = (height/2)|0;

        //update layer sizes
        for (var i = 0; i < this.layers.length; i++) {
            var ctx = this.layers[i];
            ctx.canvas.width = width;
            ctx.canvas.height = height;
        }

        Events.fire(this, this.events.resize, this);

        return this;
    };

    p.setCamera = function(camera){
        //this.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);//kostql
        this.camera = camera;
        this.camera.camera.setViewport(this);

        return this;
    };

    return Viewport;
});
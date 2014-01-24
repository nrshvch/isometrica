//TODO when viewport canvas is scaled the image becomes blurry. CSS3 imageRendering works, but not for Webkit.
// http://jsfiddle.net/VAXrL/21/ this fiddle show if browser supports it somehow.
// http://phrogz.net/tmp/canvas_image_zoom.html
define(['lib/eventmanager', './config'], function (EventManager, config) {
    /**
     * @param {Graphics} graphics
     * @param {HTMLCanvasElement} canvas @optional
     * @constructor
     */
    function Viewport(graphics, canvas) {
        EventManager.call(this);
        this.events = {
            update: 0,
            resize: 1,
            pointerdown: 2,
            pointerup: 3,
            pointermove: 4,
            poiterin: 5,
            pointerout: 6
        }

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

            viewport.dispatchEvent(viewport.events.pointerdown, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mouseup", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            viewport.dispatchEvent(viewport.events.pointerup, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mousemove", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            viewport.dispatchEvent(viewport.events.pointermove, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mousein", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            viewport.dispatchEvent(viewport.events.pointerin, e);
            e.preventDefault();
        });

        this.canvas.addEventListener("mouseout", function(e){
            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            viewport.dispatchEvent(viewport.events.pointerout, e);
            e.preventDefault();
        });

        /* touches */

        this.canvas.addEventListener("touchstart", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;


            viewport.dispatchEvent(viewport.events.pointerdown, e);
        });

        this.canvas.addEventListener("touchmove", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;


            viewport.dispatchEvent(viewport.events.pointermove, e);
        });

        this.canvas.addEventListener("touchend", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            viewport.dispatchEvent(viewport.events.pointerup, e);
        });

        this.canvas.addEventListener("touchleave", function(e){
            e.preventDefault();
            e = e.changedTouches[0];

            var viewportBoundingRect = e.target.getBoundingClientRect();
            e.gameViewportX = e.pageX - viewportBoundingRect.left;
            e.gameViewportY = e.pageY - viewportBoundingRect.top;

            viewport.dispatchEvent(viewport.events.pointerout, e);
            e.preventDefault();
        });
    }

    var p = Viewport.prototype = Object.create(EventManager.prototype);

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
     * @return {*}
     */
    p.render = function () {
        if(this.camera !== null)
            this.graphics.renderer.render(this.camera, this);
    };

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

        this.dispatchEvent(this.events.resize, this);

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
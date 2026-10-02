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

        function mouse(event) {
            return function (e) {
                locate(viewport, e, e);
                Events.fire(viewport, event, e);
                e.preventDefault();
            };
        }

        this.canvas.addEventListener("mousedown", mouse(this.events.pointerdown));
        this.canvas.addEventListener("mouseup", mouse(this.events.pointerup));
        this.canvas.addEventListener("mousemove", mouse(this.events.pointermove));
        this.canvas.addEventListener("mousein", mouse(this.events.pointerin));
        this.canvas.addEventListener("mouseout", mouse(this.events.pointerout));

        /* touches */

        //One finger is a pointer, the same as the mouse. The moment a second
        //one comes down, whatever the first had started is called off rather
        //than finished - it is not a tap - and the two of them pinch instead.
        //Once they let go, nothing more happens until every finger is up.
        var touch = null,   //identifier of the finger that is the pointer
            pinch = null,   //the two fingers pinching, and how far apart they started
            spent = false,  //a pinch is over, but fingers from it are still down
            gesture = false;//Safari is pinching, see gesturestart

        this.canvas.addEventListener("touchstart", function (e) {
            e.preventDefault();

            if (pinch !== null || spent)
                return;

            if (e.touches.length === 1) {
                var t = e.changedTouches[0];
                touch = t.identifier;
                Events.fire(viewport, viewport.events.pointerdown, locate(viewport, t, t));
                return;
            }

            var first = touch === null ? null : find(e.touches, touch);
            touch = null;
            if (first !== null)
                Events.fire(viewport, viewport.events.pointerout, locate(viewport, first, first));

            var a = e.touches[0],
                b = e.touches[1],
                args = between(viewport, a, b);

            pinch = {a: a.identifier, b: b.identifier, distance: args.distance, angle: args.angle};
            args.scale = 1;
            args.rotation = 0;
            Events.fire(viewport, viewport.events.pinchstart, args);
        });

        this.canvas.addEventListener("touchmove", function (e) {
            e.preventDefault();

            if (pinch !== null) {
                var a = find(e.touches, pinch.a),
                    b = find(e.touches, pinch.b);

                if (a === null || b === null)
                    return;

                var args = between(viewport, a, b);
                args.scale = pinch.distance > 0 ? args.distance / pinch.distance : 1;
                //how far the fingers have turned since they came down, in
                //degrees, clockwise as the screen has it - the short way round
                args.rotation = ((args.angle - pinch.angle + 540) % 360) - 180;
                Events.fire(viewport, viewport.events.pinch, args);
                return;
            }

            var t = touch === null ? null : find(e.changedTouches, touch);
            if (t !== null)
                Events.fire(viewport, viewport.events.pointermove, locate(viewport, t, t));
        });

        function lift(event) {
            return function (e) {
                e.preventDefault();

                if (pinch !== null) {
                    if (find(e.touches, pinch.a) === null || find(e.touches, pinch.b) === null) {
                        pinch = null;
                        spent = true;
                        Events.fire(viewport, viewport.events.pinchend);
                    }
                } else {
                    var t = touch === null ? null : find(e.changedTouches, touch);
                    if (t !== null) {
                        touch = null;
                        Events.fire(viewport, event, locate(viewport, t, t));
                    }
                }

                if (e.touches.length === 0)
                    spent = false;
            };
        }

        this.canvas.addEventListener("touchend", lift(this.events.pointerup));
        //the finger did not let go of anything, so it is not a tap either
        this.canvas.addEventListener("touchcancel", lift(this.events.pointerout));
        this.canvas.addEventListener("touchleave", lift(this.events.pointerout));

        /* trackpad pinch */

        //Chrome, Firefox and Edge turn a trackpad pinch into wheel events with
        //ctrl held, which is also what ctrl and a mouse wheel make. They come
        //with no start or end, so a pinch is taken to start with the first one
        //and to be over once they stop coming.
        var wheel = null;

        this.canvas.addEventListener("wheel", function (e) {
            if (!e.ctrlKey)
                return;

            //or the browser zooms the whole page
            e.preventDefault();

            if (pinch !== null || gesture)
                return;

            //spreading the fingers scrolls up, by as much as Chrome makes of
            //the scale; a mouse wheel's lines and pages are taken for about
            //as many pixels
            var delta = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1);

            if (wheel === null) {
                wheel = {scale: 1, timer: 0};
                Events.fire(viewport, viewport.events.pinchstart, locate(viewport, e, {scale: 1}));
            }

            wheel.scale *= Math.exp(-delta / 100);
            Events.fire(viewport, viewport.events.pinch, locate(viewport, e, {scale: wheel.scale}));

            clearTimeout(wheel.timer);
            wheel.timer = setTimeout(function () {
                wheel = null;
                Events.fire(viewport, viewport.events.pinchend);
            }, WHEEL_PINCH_END);
        }, {passive: false});

        //Safari has events of its own for a trackpad pinch, scale worked out
        //and all. On a touch screen it sends them next to the touches, which
        //are already being followed above, so those are left alone.
        this.canvas.addEventListener("gesturestart", function (e) {
            e.preventDefault();

            if (touch !== null || pinch !== null || spent || wheel !== null)
                return;

            gesture = true;
            Events.fire(viewport, viewport.events.pinchstart, locate(viewport, e, {scale: 1}));
        });

        this.canvas.addEventListener("gesturechange", function (e) {
            e.preventDefault();

            if (!gesture)
                return;

            Events.fire(viewport, viewport.events.pinch, locate(viewport, e, {scale: e.scale, rotation: e.rotation}));
        });

        this.canvas.addEventListener("gestureend", function (e) {
            e.preventDefault();

            if (!gesture)
                return;

            gesture = false;
            Events.fire(viewport, viewport.events.pinchend);
        });
    }

    //how long after the last ctrl + wheel a pinch made of them is over, in ms
    var WHEEL_PINCH_END = 200;

    /**
     * Puts where on the canvas a mouse, touch or gesture event happened on
     * target, as gameViewportX and gameViewportY: in the viewport's own
     * pixels, which are only the page's while the camera is not zoomed.
     */
    function locate(viewport, e, target) {
        var rect = viewport.canvas.getBoundingClientRect();

        target.gameViewportX = (e.clientX - rect.left) / viewport.pixelSize;
        target.gameViewportY = (e.clientY - rect.top) / viewport.pixelSize;

        return target;
    }

    /**
     * The spot halfway between two fingers, and how far apart they are in
     * page pixels.
     */
    function between(viewport, a, b) {
        var dx = b.clientX - a.clientX,
            dy = b.clientY - a.clientY,
            args = locate(viewport, {clientX: a.clientX + dx / 2, clientY: a.clientY + dy / 2}, {});

        args.distance = Math.sqrt(dx * dx + dy * dy);
        //which way one finger is from the other, in degrees
        args.angle = Math.atan2(dy, dx) * 180 / Math.PI;

        return args;
    }

    function find(touches, identifier) {
        for (var i = 0; i < touches.length; i++) {
            if (touches[i].identifier === identifier)
                return touches[i];
        }

        return null;
    }

    var p = Viewport.prototype;

    p.events = {
        update: 0,
        resize: 1,
        pointerdown: 2,
        pointerup: 3,
        pointermove: 4,
        pointerin: 5,
        pointerout: 6,
        //two fingers, a trackpad or ctrl + wheel. Each comes with the spot it
        //is about, as gameViewportX and gameViewportY, and scale: how much
        //closer it would have things than when it started
        pinchstart: 7,
        pinch: 8,
        pinchend: 9
    };

    p._active = true;

    /**
     * @type {int[]}
     */
    p.size = null;

    /**
     * Size of the picture, in its own pixels - what is drawn into and what
     * the camera sees
     */
    p.width = null;
    p.height = null;

    /**
     * Size it takes on the page, in page pixels
     */
    p.displayWidth = null;
    p.displayHeight = null;

    /**
     * How many page pixels across each of its own pixels takes: the camera's
     * zoom, see CameraComponent#zoom
     * @type {number}
     */
    p.pixelSize = 1;

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
     * The picture is drawn at the camera's own resolution, and stretched over
     * as much of the page as the canvas takes. Like a retina screen, the other
     * way round: zoomed in, fewer pixels are drawn and each takes more of the
     * page; zoomed out, more of them are, each taking less.
     *
     * @param {number} width on the page, in page pixels
     * @param {number} height
     */
    p.setSize = function (width, height) {
        var zoom = this.camera !== null ? this.camera.camera.zoom : 1;

        this.displayWidth = width;
        this.displayHeight = height;
        this.pixelSize = zoom;

        width = this.width = Math.round(width / zoom);
        height = this.height = Math.round(height / zoom);

        //stretched, pixels stay square instead of blurring into each other;
        //shrunk, it is left to the browser to smooth them together
        this.canvas.style.imageRendering = zoom > 1 ? "pixelated" : "";

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

        //at the new camera's zoom
        if (this.displayWidth !== null)
            this.setSize(this.displayWidth, this.displayHeight);

        this.camera.camera.setViewport(this);

        return this;
    };

    /**
     *
     * @param val
     * @returns {boolean|*}
     */
    p.active = function(val){
      if(val === undefined)
        return this._active;

        this._active = !!val;
    };

    return Viewport;
});

define('engine/config',['require','namespace'],function(require) {
    var namespace = require("namespace");
    var Engine = namespace("Isometrica.Engine");

    Engine.Config = {
        noLayerDepthSortingMask: 0,
        noLayerClearMask: 0,
        layersCount: 1,
        useOctree: false,
        renderOctree: false
    };

    return Engine.Config;
});

//TODO when viewport canvas is scaled the image becomes blurry. CSS3 imageRendering works, but not for Webkit.
// http://jsfiddle.net/VAXrL/21/ this fiddle show if browser supports it somehow.
// http://phrogz.net/tmp/canvas_image_zoom.html
define('engine/viewport',['require','events','./config'],function (require) {
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

    p._active = true;

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

define('engine/component',['require','namespace','events'],function (require) {
    var namespace = require("namespace");
    var EventManager = require("events");

    namespace("Isometrica.Engine").Component = Component;

    /**
     * @constructor
     */
    function Component() {}

    var p = Component.prototype = Object.create(EventManager.prototype);

    /**
     * @type {GameObject}
     * @read-only
     */
    p.gameObject = null;

    p.enabled = true;

    p.setGameObject = function(gameObject){
        this.gameObject = gameObject;
    };

    p.unsetGameObject = function(){
        this.gameObject = null;
    };

    /**
     * Runs before any start
     * @type {function}
     */
    p.awake = null;

    /**
     * Runs when game starts
     */
    p.start = null;

    /**
     * Runs on every game logic tick
     * @type {function}
     */
    p.tick = null;

    return Component;
});
define('engine/components/transformcomponent',['require','namespace','../component','gl-matrix'],function (require) {
    var namespace = require("namespace");
    var Component = require("../component");
    var glMatrix = require("gl-matrix");
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    namespace("Isometrica.Engine").TransformComponent = Transform;

    var identityMat4Values = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];

    /**
     * Create Transform component.
     * Every component has a game object.
     * @param {GameObject} gameObject
     * @constructor
     */
    function Transform() {
        this.children = [];

        this.local = new Float32Array(identityMat4Values);

        this.localToWorld = new Float32Array(identityMat4Values);

        this.worldToLocal = new Float32Array(identityMat4Values);

        //When parent updates, our coords changes
        //so let's set flag to update out matrices
        var self = this;
        this.onParentUpdate = function(parent){
            self.dirtyL = true;
            self.dirtyW = true;
        }
    }

    function getLocalToWorld(self){
        if (self.dirtyL === true) {
            if (self.parent === null) {
                glMatrix.mat4.copy(self.localToWorld, self.local);
            } else {
                glMatrix.mat4.multiply(self.localToWorld, getLocalToWorld(self.parent), self.local)
            }
            self.dirtyL = false;
        }

        return self.localToWorld;
    }

    function getPosition(transform, out){
        if (out === undefined)
            out = [];

        var m = getLocalToWorld(transform);

        out[0] = m[12];
        out[1] = m[13];
        out[2] = m[14];

        return out;
    }

    Transform.getPosition = getPosition;

    Transform.getLocalToWorld = getLocalToWorld;

    var p = Transform.prototype = Object.create(Component.prototype),

        bufferVec3 = new Float32Array([0, 0, 0]),
        bufferMat4 = new Float32Array(16);

    p.constructor = Transform;

    p.events = {
        update: 0
    };

    p.local = null;

    p.localToWorld = null;

    p.worldToLocal = null;

    p.children = null;

    p.parent = null;

    p.dirtyW = false;

    p.dirtyL = false;

    /**
     * Event handler for parent update event
     * @type {function}
     */
    p.onParentUpdate = null;

    /**
     * @param {Transform} children
     */
    p.addChild = function (child) {
        this.children[this.children.length] = child;
        child.setParent(this);
    }

    /**
     * @param {Transform} child
     */
    p.removeChild = function(child){
        this.children.splice(this.children.indexOf(child),1);
        child.removeParent();
    }

    p.destroy = function(){
        if(this.parent !== null)
            this.parent.removeChild(this);
    };

    /**
     * @param {Transform} parent
     */
    p.setParent = function(parent){
        this.parent = parent;

        parent.addEventListener(parent.events.update, this.onParentUpdate);

        //if parent's gameObject is already added to scene, then add ourselves too
        if(parent.gameObject.world !== null)
            parent.gameObject.world.addGameObject(this.gameObject);

        this.dirtyL = true;
        this.dirtyW = true;
    }

    p.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.transform = this;
    }

    p.unsetGameObject = function(){
        throw "Transform shouldn't be remove from gameObject";
    }

    p.removeParent = function(){
        this.parent.removeEventListener(this.parent.events.update, this.onParentUpdate);
        this.parent = null;
        this.dirtyL = true;
        this.dirtyW = true;
    }

    p.translate = function (x, y, z, relativeTo) {
        bufferVec3[0] = x;
        bufferVec3[1] = y;
        bufferVec3[2] = z;

        if (relativeTo === "world") {
            mat4.identity(bufferMat4);
            mat4.translate(bufferMat4, bufferMat4, bufferVec3);
            mat4.multiply(this.local, bufferMat4, this.local);
        } else
            mat4.translate(this.local, this.local, bufferVec3);

        this.dirtyL = true; //flag to update localToWorld
        this.dirtyW = true; //flag to update worldToLocal

        this.dispatchEvent(this.events.update, this);
    }

    p.rotate = function (x, y, z, relativeTo) {
        var degreeToRad = Math.PI / 180,
            mat4 = glMatrix.mat4;

        if (relativeTo === "world") {
            mat4.identity(bufferMat4);

            mat4.rotateZ(bufferMat4, bufferMat4, z * degreeToRad);
            mat4.rotateY(bufferMat4, bufferMat4, y * degreeToRad);
            mat4.rotateX(bufferMat4, bufferMat4, x * degreeToRad);

            mat4.multiply(this.local, bufferMat4, this.local);
        } else {
            mat4.rotateZ(this.local, this.local, z * degreeToRad);
            mat4.rotateY(this.local, this.local, y * degreeToRad);
            mat4.rotateX(this.local, this.local, x * degreeToRad);
        }

        this.dirtyL = true; //flag to update localToWorld
        this.dirtyW = true; //flag to update worldToLocal

        this.dispatchEvent(this.events.update, this);
    }


    
    p.getLocalToWorld = function () {
        //return getLocalToWorld(this);
        if (this.dirtyL === true) {
            if (this.parent === null) {
                glMatrix.mat4.copy(this.localToWorld, this.local);
            } else {
                glMatrix.mat4.multiply(this.localToWorld, getLocalToWorld(this.parent), this.local)
            }
            this.dirtyL = false;
        }

        return this.localToWorld;
    }

    p.getWorldToLocal = function () {
        if(this.dirtyW === true){
            glMatrix.mat4.invert(this.worldToLocal, getLocalToWorld(this));
            this.dirtyW = false;
        }
        return this.worldToLocal;
    }

    p.getPosition = function (out) {
        if (out === undefined)
            out = [];

        var m = getLocalToWorld(this);

        out[0] = m[12];
        out[1] = m[13];
        out[2] = m[14];

        return out;
    }

    p.getLocalPosition = function (out) {
        if (out === undefined)
            out = [];

        var m = this.local;

        out[0] = m[12];
        out[1] = m[13];
        out[2] = m[14];

        return out;
    }

    p.getRotation = function () {
        throw "TransformComponent.getRotation not implemented yet";
    }

    p.getLocalRotation = function () {
        throw "TransformComponent.getLocalRotation not implemented yet";
    }

    p.setPosition = function (x, y, z) {

        bufferVec3[0] = x;
        bufferVec3[1] = y;
        bufferVec3[2] = z;

        //transform given world position into local position
        if (this.parent !== null)
            vec3.transformMat4(bufferVec3, bufferVec3, this.parent.getWorldToLocal());

        //set local position for local transform
        this.local[12] = bufferVec3[0];
        this.local[13] = bufferVec3[1];
        this.local[14] = bufferVec3[2];

        this.dirtyL = true; //flag to update localToWorld
        this.dirtyW = true; //flag to update worldToLocal

        this.dispatchEvent(this.events.update, this);
    }

    p.setLocalPosition = function(x, y, z){
        //set local position for local transform
        this.local[12] = x;
        this.local[13] = y;
        this.local[14] = z;

        this.dirtyL = true; //flag to update localToWorld
        this.dirtyW = true; //flag to update worldToLocal

        this.dispatchEvent(this.events.update, this);
    }

    return Transform;
});

//TODO render only dirty areas of screen
//TODO each GO could have multiple renderers...
//TODO ...all scene renderers should be grouped in single array.
define('engine/Canvas2dRenderer',['require','./config','gl-matrix','./components/transformcomponent'],function (require) {
    var config = require("./config");
    var glMatrix = require("gl-matrix");
    var Transform = require("./components/transformcomponent");

    function Canvas2dRenderer(graphics) {
        this.graphics = graphics;
        this.layerBuffers = [];
        for (var i = 0; i < config.layersCount; i++)
            this.layerBuffers[i] = [];
        this.M = [];
        this.V = [];
    }

    var p = Canvas2dRenderer.prototype,
        bufferVec3 = new Float32Array([0, 0, 0]),
        buffer2Vec3 = new Float32Array([0, 0, 0]),
        bufferMat4 = new Float32Array(16),
        depthSort = function (a, b) {
            //a.gameObject.transform.getPosition(bufferVec3);
            Transform.getPosition(a.gameObject.transform, bufferVec3);
            a = bufferVec3[0] - bufferVec3[1] + bufferVec3[2];
            //b.gameObject.transform.getPosition(bufferVec3);
            Transform.getPosition(b.gameObject.transform, bufferVec3);
            return a - (bufferVec3[0] - bufferVec3[1] + bufferVec3[2]);
        };

    function render(self, camera, viewport) {
        viewport.context.fillRect(0,0,100,100);

        var gameObjects = camera.world.retrieve(camera),
            gameObjectsCount = gameObjects.length,
            layersCount = config.layersCount,
            renderer, renderers, renderersCount,
            i, j, ctx;

        self.M = camera.camera.getWorldToScreen();
        self.V = camera.camera.getWorldToViewport();

        viewport.context.clearRect(0, 0, viewport.width, viewport.height);

        for (i = 0; i < gameObjectsCount; i++){
            renderer = gameObjects[i].renderer;
            if(renderer !== undefined && renderer.enabled && renderer.cullingTest(viewport, self, renderer)) {
                self.layerBuffers[renderer.layer].push(renderer)
            }
        }

        for (i = 0; i < layersCount; i++) {
            ctx = viewport.layers[i];

            if(~config.noLayerClearMask & 1<<i){
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }

            renderers = self.layerBuffers[i];
            renderersCount = renderers.length;

            if (~config.noLayerDepthSortingMask & 1 << i) {
                renderers.sort(depthSort);
            }

            for (j = 0; j < renderersCount; j++) {
                renderer = renderers.pop();

                renderer.render(ctx, self, viewport, renderer);
            }

            viewport.context.drawImage(ctx.canvas, 0, 0);
        }

        //if (config.renderOctree && config.useOctree && camera.world.octree.root !== null)
        //self.renderOctreeNode(camera.world.octree.root, viewport.context);

    };

    Canvas2dRenderer.render = render;

    p.graphics = null;

    /*
    p.render = function (camera, viewport) {
        var gameObjects = camera.world.retrieve(camera),
            gameObjectsCount = gameObjects.length,
            layersCount = config.layersCount,
            renderer, renderers, renderersCount,
            i, j, ctx;

        this.M = camera.camera.getWorldToScreen();
        this.V = camera.camera.getWorldToViewport();

        viewport.context.clearRect(0, 0, viewport.width, viewport.height);

        for (i = 0; i < gameObjectsCount; i++){
            var go = gameObjects[i];
            if(go.renderer !== undefined && go.renderer.enabled && go.renderer.cullingTest(viewport, this))
                this.layerBuffers[go.renderer.layer].push(go.renderer)
        }

        for (i = 0; i < layersCount; i++) {
            ctx = viewport.layers[i];

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            renderers = this.layerBuffers[i];
            renderersCount = renderers.length;

            if (config.depthSortingMask & (1 << i)) {
                renderers.sort(depthSort);
            }

            for (j = 0; j < renderersCount; j++) {
                renderer = renderers.pop();

                renderer.render(ctx, this, viewport);
            }

            viewport.context.drawImage(ctx.canvas, 0, 0);
        }

        //if (config.renderOctree && config.useOctree && camera.world.octree.root !== null)
        //this.renderOctreeNode(camera.world.octree.root, viewport.context);

    };
    */
                           /*

    p.renderAxis = function (gameObject, ctx) {
        var W = gameObject.transform.getLocalToWorld(),
            pos0 = gameObject.transform.getPosition();

        glMatrix.vec3.transformMat4(pos0, pos0, this.M);

        var pos = bufferVec3;

        //draw X
        pos[0] = 100;
        pos[1] = 0;
        pos[2] = 0;

        glMatrix.vec3.transformMat4(pos, pos, W);
        glMatrix.vec3.transformMat4(pos, pos, this.M);

        ctx.beginPath();
        ctx.moveTo(pos0[0], pos0[1]);
        ctx.lineTo(pos[0], pos[1]);
        ctx.closePath();
        ctx.strokeStyle = '#ff0000';
        ctx.stroke();

        //draw Y
        pos[0] = 0;
        pos[1] = 100;
        pos[2] = 0;

        glMatrix.vec3.transformMat4(pos, pos, W);
        glMatrix.vec3.transformMat4(pos, pos, this.M);

        ctx.beginPath();
        ctx.moveTo(pos0[0], pos0[1]);
        ctx.lineTo(pos[0], pos[1]);
        ctx.closePath();
        ctx.strokeStyle = '#00ff00';
        ctx.stroke();

        //draw Z
        pos[0] = 0;
        pos[1] = 0;
        pos[2] = 100;

        glMatrix.vec3.transformMat4(pos, pos, W);
        glMatrix.vec3.transformMat4(pos, pos, this.M);

        ctx.beginPath();
        ctx.moveTo(pos0[0], pos0[1]);
        ctx.lineTo(pos[0], pos[1]);
        ctx.closePath();
        ctx.strokeStyle = '#0000ff';
        ctx.stroke();
    }

    p.renderOctreeNode = function (node, ctx) {
        if (node.type === 0)
            this.renderBound(node.x, node.y, node.z, node.ex, node.ey, node.ez, ctx);

        //render childs
        if (node.type === 1) {
            if (node.nodesMask & 1)
                this.renderOctreeNode(node.subnode0, ctx);

            if (node.nodesMask & 2)
                this.renderOctreeNode(node.subnode1, ctx);

            if (node.nodesMask & 4)
                this.renderOctreeNode(node.subnode2, ctx);

            if (node.nodesMask & 8)
                this.renderOctreeNode(node.subnode3, ctx);

            if (node.nodesMask & 16)
                this.renderOctreeNode(node.subnode4, ctx);

            if (node.nodesMask & 32)
                this.renderOctreeNode(node.subnode5, ctx);

            if (node.nodesMask & 64)
                this.renderOctreeNode(node.subnode6, ctx);

            if (node.nodesMask & 128)
                this.renderOctreeNode(node.subnode7, ctx);
        }
    }


    p.renderBound = function (x, y, z, ex, ey, ez, ctx) {
        var min = [x - ex, y - ey, z - ez],
            max = [x + ex, y + ey, z + ez],
            w = max[0] - min[0],
            h = max[1] - min[1],
            d = max[2] - min[2];

        var m1 = [min[0] + w, min[1], min[2]],
            m2 = [min[0], min[1] + h , min[2]],
            m3 = [min[0] + w, min[1] + h, min[2]];

        var mx1 = [min[0], min[1], min[2] + d],
            mx2 = [min[0] + w, min[1] , min[2] + d],
            mx3 = [min[0], min[1] + h, min[2] + d];


        var p = bufferVec3;

        ctx.beginPath();
        glMatrix.vec3.transformMat4(p, min, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, m1, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, m3, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, m2, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, min, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx1, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx2, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, max, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx3, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx1, this.M);
        ctx.lineTo(p[0], p[1]);

        glMatrix.vec3.transformMat4(p, m1, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx2, this.M);
        ctx.lineTo(p[0], p[1]);

        glMatrix.vec3.transformMat4(p, m2, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx3, this.M);
        ctx.lineTo(p[0], p[1]);

        glMatrix.vec3.transformMat4(p, m3, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, max, this.M);
        ctx.lineTo(p[0], p[1]);

        var bound = {};
        ctx.closePath();
        //ctx.strokeStyle = bound.color || (bound.color = '#' + ((0xFFFFFF * Math.random()) | 0).toString(16));
        ctx.stroke();

    };


              */
    return Canvas2dRenderer;
});
define('engine/graphics',["./viewport", "./Canvas2dRenderer"], function (Viewport, Renderer) {
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
    };

    /**
     * @return {void}
     */
    p.render = function(){
        var viewports = this.viewports,
            viewportsCount = viewports.length,
            viewport = null;

        for(var i = 0; i < viewportsCount; i++){
            viewport = viewports[i];
            if(viewport.active() === true && viewport.camera !== null)
                Renderer.render(this.renderer, viewport.camera, viewports[i]);
        }
    };

    return Graphics;
});

define('engine/time',[],function () {
    /**
     * @constructor
     */
    function Time() {
        // real (wall-clock) timestamp of the last tick, used only to measure dt
        this._lastReal = Date.now();
        this.now = Date.now();
    }

    var p = Time.prototype;

    /**
     * milliseconds since start
     * @type {Number}
     */
    p.time = 0;

    /**
     * @type {Number}
     */
    p.now = 0;

    /**
     * milliseconds elapsed since the previous tick, measured against the
     * wall clock so speeds stay the same regardless of frame rate
     * @type {Number}
     */
    p.dt = 0;

    // Cap a single tick's elapsed time so a stalled tab (backgrounded,
    // debugger paused, ...) doesn't dump one huge dt on resume and make
    // everything jump.
    var MAX_DT = 200;

    p.tick = function(){
        var real = Date.now();
        this.dt = Math.min(real - this._lastReal, MAX_DT);
        this._lastReal = real;

        this.time += this.dt;
        this.now += this.dt;
    };

    return Time;
});
define('engine/lib/Octree/node',[],function () {
    //single set bit index lookup table
    var bitIndex = new Int8Array(129);
    bitIndex[2] = 1;
    bitIndex[4] = 2;
    bitIndex[8] = 3;
    bitIndex[16] = 4;
    bitIndex[32] = 5;
    bitIndex[64] = 6;
    bitIndex[128] = 7;

    var indexToKey = new Array(8);
    indexToKey[0] = "subnode0";
    indexToKey[1] = "subnode1";
    indexToKey[2] = "subnode2";
    indexToKey[3] = "subnode3";
    indexToKey[4] = "subnode4";
    indexToKey[5] = "subnode5";
    indexToKey[6] = "subnode6";
    indexToKey[7] = "subnode7";

    //I bet some values can be precalculated and stored in table.
    var intersectionMask2 = function (node, item) {
        var p0 = 0,
            p1 = 0;

        if (item.z - item.ez >= node.z) {
            p0 = 4;
            p1 = 4;
        } else if (item.z + item.ez >= node.z) {
            p1 = 4;
        }

        if (item.y - item.ey >= node.y) {
            p0 |= 2;
            p1 |= 2;
        } else if (item.y + item.ey >= node.y) {
            p1 |= 2;
        }

        if (item.x - item.ex >= node.x) {
            p0 |= 1;
            p1 |= 1;
        } else if (item.x + item.ex >= node.x) {
            p1 |= 1;
        }

        if (p0 === p1) {
            return 1 << p0;
        } else {
            return (1 << p0) |
                (1 << (p0 & 1 | p1 & 6)) |
                (1 << (p0 & 2 | p1 & 5)) |
                (1 << (p0 & 3 | p1 & 4)) |
                (1 << (p0 & 4 | p1 & 3)) |
                (1 << (p0 & 5 | p1 & 2)) |
                (1 << (p0 & 6 | p1 & 1)) |
                (1 << p1);

        }
    }

    //precalculated masks for all p0 and p1 point variantions
    //mask can be calculated like this:
    /*     (1 << p0) |
     (1 << (p0 & 1 | p1 & 6)) |
     (1 << (p0 & 2 | p1 & 5)) |
     (1 << (p0 & 3 | p1 & 4)) |
     (1 << (p0 & 4 | p1 & 3)) |
     (1 << (p0 & 5 | p1 & 2)) |
     (1 << (p0 & 6 | p1 & 1)) |
     (1 << p1);
     */
    var intersectionMaskTable = new Uint8Array(64);
    intersectionMaskTable[0] = 1;
    intersectionMaskTable[1] = 3;
    intersectionMaskTable[2] = 5;
    intersectionMaskTable[3] = 15;
    intersectionMaskTable[4] = 17;
    intersectionMaskTable[5] = 51;
    intersectionMaskTable[6] = 85;
    intersectionMaskTable[7] = 255;
    intersectionMaskTable[8] = 3;
    intersectionMaskTable[9] = 2;
    intersectionMaskTable[10] = 15;
    intersectionMaskTable[11] = 10;
    intersectionMaskTable[12] = 51;
    intersectionMaskTable[13] = 34;
    intersectionMaskTable[14] = 255;
    intersectionMaskTable[15] = 170;
    intersectionMaskTable[16] = 5;
    intersectionMaskTable[17] = 15;
    intersectionMaskTable[18] = 4;
    intersectionMaskTable[19] = 12;
    intersectionMaskTable[20] = 85;
    intersectionMaskTable[21] = 255;
    intersectionMaskTable[22] = 68;
    intersectionMaskTable[23] = 204;
    intersectionMaskTable[24] = 15;
    intersectionMaskTable[25] = 10;
    intersectionMaskTable[26] = 12;
    intersectionMaskTable[27] = 8;
    intersectionMaskTable[28] = 255;
    intersectionMaskTable[29] = 170;
    intersectionMaskTable[30] = 204;
    intersectionMaskTable[31] = 136;
    intersectionMaskTable[32] = 17;
    intersectionMaskTable[33] = 51;
    intersectionMaskTable[34] = 85;
    intersectionMaskTable[35] = 255;
    intersectionMaskTable[36] = 16;
    intersectionMaskTable[37] = 48;
    intersectionMaskTable[38] = 80;
    intersectionMaskTable[39] = 240;
    intersectionMaskTable[40] = 51;
    intersectionMaskTable[41] = 34;
    intersectionMaskTable[42] = 255;
    intersectionMaskTable[43] = 170;
    intersectionMaskTable[44] = 48;
    intersectionMaskTable[45] = 32;
    intersectionMaskTable[46] = 240;
    intersectionMaskTable[47] = 160;
    intersectionMaskTable[48] = 85;
    intersectionMaskTable[49] = 255;
    intersectionMaskTable[50] = 68;
    intersectionMaskTable[51] = 204;
    intersectionMaskTable[52] = 80;
    intersectionMaskTable[53] = 240;
    intersectionMaskTable[54] = 64;
    intersectionMaskTable[55] = 192;
    intersectionMaskTable[56] = 255;
    intersectionMaskTable[57] = 170;
    intersectionMaskTable[58] = 204;
    intersectionMaskTable[59] = 136;
    intersectionMaskTable[60] = 240;
    intersectionMaskTable[61] = 160;
    intersectionMaskTable[62] = 192;
    intersectionMaskTable[63] = 128;

    var intersectionMask = function (node, item) {
        //p are bounding box min & max point position inside node.
        //p can have value of 0-7, it's an index of node's subnode,
        //e.g. x=0,y=0,z=0 is 0 index subnode, x=1,y=1,z=1 is 7.
        //or simply x is first bit of index, y - second, z - third.
        // for Z=0 subnodes are indexed like this. for Z=1 each index +4.
        //  ---------
        //  | 0 | 1 |
        //  |---|---|
        //  | 2 | 3 |
        //  ---------
        //
        var p0 = 0,
            p1 = 0;

        if (item.z - item.ez >= node.z) {
            p0 = 4;
            p1 = 4;
        } else if (item.z + item.ez >= node.z) {
            p1 = 4;
        }

        if (item.y - item.ey >= node.y) {
            p0 |= 2;
            p1 |= 2;
        } else if (item.y + item.ey >= node.y) {
            p1 |= 2;
        }

        if (item.x - item.ex >= node.x) {
            p0 |= 1;
            p1 |= 1;
        } else if (item.x + item.ex >= node.x) {
            p1 |= 1;
        }

        return intersectionMaskTable[p0 * 8 + p1];
    }

    function Node(tree) {
        this.tree = tree;
        this.type = 0;
        this.items = [];
        this.count = 0;
        this.nodesCount = 0;
        this.nodesMask = 0;
        this.parent = null;
        this.depth = 0;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.ex = 0;
        this.ey = 0;
        this.ez = 0;

        this.subnode0 = null;
        this.subnode1 = null;
        this.subnode2 = null;
        this.subnode3 = null;
        this.subnode4 = null;
        this.subnode5 = null;
        this.subnode6 = null;
        this.subnode7 = null;
    }

    Node.LEAF = 0;
    Node.BRANCH = 1;

    Node.indexToKey = indexToKey;

    /**
     * Creates subnode with set bounds accordingly to parent node and subnodes position defined by index.
     * @param node
     * @param index
     * @returns {*}
     */
    var createSubnode = function (tree, parent, index) {
        var subnode = new Node(tree);

        subnode.ex = parent.ex / 2;
        subnode.ey = parent.ey / 2;
        subnode.ez = parent.ez / 2;
        subnode.x = (parent.x - subnode.ex) + parent.ex * (index & 1);
        subnode.y = (parent.y - subnode.ey) + parent.ey * ((index & 2) >> 1);
        subnode.z = (parent.z - subnode.ez) + parent.ez * ((index & 4) >> 2);
        subnode.depth = parent.depth + 1;
        subnode.parent = parent;

        parent[indexToKey[index]] = subnode;
        parent.nodesCount++;
        parent.nodesMask |= (1 << index);

        return subnode;
    }

    /**
     * Insert item into given node.
     * @param node Node to insert in
     * @param {BoundingBox} item Item to insert
     */
    var insert = function (tree, node, item) {
        node.count++;

        if (node.type === Node.LEAF) {
            node.items.push(item);

            if (node.count >= tree.treshold)
                split(tree, node);
        } else {
            var mask = intersectionMask(node, item),
                nodesMask = node.nodesMask;

            if (mask & 1)
                if (nodesMask & 1) {
                    insert(tree, node.subnode0, item);
                } else {
                    insert(tree, createSubnode(tree, node, 0), item);
                }

            if (mask & 2)
                if (nodesMask & 2) {
                    insert(tree, node.subnode1, item);
                } else {
                    insert(tree, createSubnode(tree, node, 1), item);
                }

            if (mask & 4)
                if (nodesMask & 4) {
                    insert(tree, node.subnode2, item);
                } else {
                    insert(tree, createSubnode(tree, node, 2), item);
                }

            if (mask & 8)
                if (nodesMask & 8) {
                    insert(tree, node.subnode3, item);
                } else {
                    insert(tree, createSubnode(tree, node, 3), item);
                }

            if (mask & 16)
                if (nodesMask & 16) {
                    insert(tree, node.subnode4, item);
                } else {
                    insert(tree, createSubnode(tree, node, 4), item);
                }

            if (mask & 32)
                if (nodesMask & 32) {
                    insert(tree, node.subnode5, item);
                } else {
                    insert(tree, createSubnode(tree, node, 5), item);
                }

            if (mask & 64)
                if (nodesMask & 64) {
                    insert(tree, node.subnode6, item);
                } else {
                    insert(tree, createSubnode(tree, node, 6), item);
                }

            if (mask & 128)
                if (nodesMask & 128) {
                    insert(tree, node.subnode7, item);
                } else {
                    insert(tree, createSubnode(tree, node, 7), item);
                }

        }
    }

    /**
     * Remove item from given node.
     * @param node Node to remove from
     * @param {BoundingBox} item Item to remove
     */
    var remove = function (tree, node, item) {
        if (node.type === Node.LEAF) {
            var index = node.items.indexOf(item);

            if (index !== -1) {
                node.items.splice(index, 1);
                node.count--;

                return true;
            } else
                return false;
        } else {
            var r = true,
                mask = intersectionMask(node, item),
                subnode;

            if (mask & 1) {
                subnode = node.subnode0;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode0 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 1;
                    }
                } else {
                    r = false;
                }
            }

            if (mask & 2) {
                subnode = node.subnode1;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode1 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 2;
                    }
                } else {
                    r = false;
                }
            }

            if (mask & 4) {
                subnode = node.subnode2;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode2 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 4;
                    }
                } else {
                    r = false;
                }
            }

            if (mask & 8) {
                subnode = node.subnode3;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode3 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 8;
                    }
                } else {
                    r = false;
                }
            }

            if (mask & 16) {
                subnode = node.subnode4;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode4 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 16;
                    }
                } else {
                    r = false;
                }
            }

            if (mask & 32) {
                subnode = node.subnode5;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode5 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 32;
                    }
                } else {
                    r = false;
                }
            }

            if (mask & 64) {
                subnode = node.subnode6;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode6 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 64;
                    }
                } else {
                    r = false;
                }
            }

            if (mask & 128) {
                subnode = node.subnode7;

                if (remove(tree, subnode, item)) {
                    if (subnode.count === 0) {
                        node.subnode7 = null;
                        node.nodesCount--;
                        node.nodesMask ^= 128;
                    }
                } else {
                    r = false;
                }
            }


            if (r === true)
                node.count--;

            if (node.count < node.tree.treshold)
                merge(tree, node);

            return r;
        }
    }

    /**
     * Splits given node into 8 subnodes. Empty subnodes are not created.
     * @param node
     */
    var split = function (tree, node) {
        if (node.depth > tree.maxDepth)
            return;

        if (node.ex <= node.tree.tearDrop)
            return;

        var items = node.items,
            itemsCount = items.length,
            item, mask, nodesMask;

        node.type = Node.BRANCH;
        node.items = null;

        for (var j = 0; j < itemsCount; j++) {
            item = items[j];
            mask = intersectionMask(node, item);
            nodesMask = node.nodesMask;

            if (mask & 1)
                if (nodesMask & 1) {
                    insert(tree, node.subnode0, item);
                } else {
                    insert(tree, createSubnode(tree, node, 0), item);
                }

            if (mask & 2)
                if (nodesMask & 2) {
                    insert(tree, node.subnode1, item);
                } else {
                    insert(tree, createSubnode(tree, node, 1), item);
                }

            if (mask & 4)
                if (nodesMask & 4) {
                    insert(tree, node.subnode2, item);
                } else {
                    insert(tree, createSubnode(tree, node, 2), item);
                }

            if (mask & 8)
                if (nodesMask & 8) {
                    insert(tree, node.subnode3, item);
                } else {
                    insert(tree, createSubnode(tree, node, 3), item);
                }

            if (mask & 16)
                if (nodesMask & 16) {
                    insert(tree, node.subnode4, item);
                } else {
                    insert(tree, createSubnode(tree, node, 4), item);
                }

            if (mask & 32)
                if (nodesMask & 32) {
                    insert(tree, node.subnode5, item);
                } else {
                    insert(tree, createSubnode(tree, node, 5), item);
                }

            if (mask & 64)
                if (nodesMask & 64) {
                    insert(tree, node.subnode6, item);
                } else {
                    insert(tree, createSubnode(tree, node, 6), item);
                }

            if (mask & 128)
                if (nodesMask & 128) {
                    insert(tree, node.subnode7, item);
                } else {
                    insert(tree, createSubnode(tree, node, 7), item);
                }
        }
    }

    /**
     * Merges subnodes of given node.
     * @param node
     */
    var merge = function (tree, node) {
        var childNode,
            mask = node.nodesMask,
            items,
            childNodeItems,
            childNodeItemsLen,
            childNodeItem;

        node.type = Node.LEAF;
        //node.nodes = null;
        node.nodesCount = 0;
        node.nodesMask = 0;

        if (mask & 1) {
            childNode = node.subnode0;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode0 = null;
        }

        if (mask & 2) {
            childNode = node.subnode1;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode1 = null;
        }

        if (mask & 4) {
            childNode = node.subnode2;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode2 = null;
        }

        if (mask & 8) {
            childNode = node.subnode3;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode3 = null;
        }

        if (mask & 16) {
            childNode = node.subnode4;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode4 = null;
        }

        if (mask & 32) {
            childNode = node.subnode5;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode5 = null;
        }

        if (mask & 64) {
            childNode = node.subnode6;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode6 = null;
        }

        if (mask & 128) {
            childNode = node.subnode7;

            if (node.items === null) {
                node.items = items = childNode.items;
            } else {
                childNodeItems = childNode.items;
                childNodeItemsLen = childNodeItems.length;

                for (var j = 0; j < childNodeItemsLen; j++)
                    if (items.indexOf(childNodeItem = childNodeItems[j]) === -1)
                        items.push(childNodeItem);
            }

            node.subnode7 = null;
        }
    }


    /**
     * Return array of items near giver item.
     * @param node
     * @param item
     * @param {Array} resultArray
     * @returns {*}
     */
    var retrieve = function (node, item, resultArray) {
        if (node.type === Node.BRANCH) {
            var mask = intersectionMask(node, item);

            if (mask & 1)
                retrieve(node.subnode0, item, resultArray);

            if (mask & 2)
                retrieve(node.subnode1, item, resultArray);

            if (mask & 4)
                retrieve(node.subnode2, item, resultArray);

            if (mask & 8)
                retrieve(node.subnode3, item, resultArray);

            if (mask & 16)
                retrieve(node.subnode4, item, resultArray);

            if (mask & 32)
                retrieve(node.subnode5, item, resultArray);

            if (mask & 64)
                retrieve(node.subnode6, item, resultArray);

            if (mask & 128)
                retrieve(node.subnode7, item, resultArray);

        } else {
            var items = node.items,
                itemsLen = items.length,
                resultItem, i;

            for (i = 0; i < itemsLen; i++) {
                resultItem = items[i];

                if (resultItem === item)
                    continue;

                resultItem.flag = 1;
                resultArray.push(resultItem.id);
                //resultArray[resultArray.count++] = resultItem.id;
            }
        }
    }

    /**
     * @param node
     * @param index Index of subnode where the current node will be placed
     * @constructor
     */
    var grow = function (tree, node, index) {
        if (node.parent !== null)
            return false;

        var ex = node.ex * 2,
            ey = node.ey * 2,
            ez = node.ez * 2,
            x = node.x + node.ex - ex * (index & 1), //001 extract x
            y = node.y + node.ey - ey * ((index & 2) >> 1), //010 extract y
            z = node.z + node.ez - ez * ((index & 4) >> 2), //100 extract z
            node2;

        if (node.type === Node.BRANCH) {
            node2 = new Node(tree);
            node2.x = x;
            node2.y = y;
            node2.z = z;
            node2.ex = ex;
            node2.ey = ey;
            node2.ez = ez;
            split(tree, node2);
            node2[indexToKey[index]] = node;
            node2.count = node.count;
            node2.nodesCount = 1;
            node2.nodesMask = 1 << index;
            node.parent = node2;
            updateDepth(tree, node);
            return node2;
        } else {
            //Expand existing root node
            node.x = x;
            node.y = y;
            node.z = z;
            node.ex = ex;
            node.ey = ey;
            node.ez = ez;
            return node;
        }
    }

    var shrink = function (tree, node) {
        if (node.parent === null && node.nodesCount === 1) {
            var childNode = node[indexToKey[bitIndex[node.nodesMask]]];
            childNode.parent.depth = -1;
            updateDepth(tree, childNode);
            childNode.parent = null;
            return childNode;
        } else
            return false;
    }

    var updateDepth = function (tree, node) {
        node.depth = node.parent.depth + 1;

        if (node.type === Node.BRANCH) {
            if (node.depth > tree.maxDepth)
                merge(tree, node);
            else {
                var nodesMask = node.nodesMask;

                if (nodesMask & 1)
                    updateDepth(tree, node.subnode0);

                if (nodesMask & 2)
                    updateDepth(tree, node.subnode1);

                if (nodesMask & 4)
                    updateDepth(tree, node.subnode2);

                if (nodesMask & 8)
                    updateDepth(tree, node.subnode3);

                if (nodesMask & 16)
                    updateDepth(tree, node.subnode4);

                if (nodesMask & 32)
                    updateDepth(tree, node.subnode5);

                if (nodesMask & 64)
                    updateDepth(tree, node.subnode6);

                if (nodesMask & 128)
                    updateDepth(tree, node.subnode7);
            }
        }
    }

    Node.insert = insert;
    Node.remove = remove;
    Node.retrieve = retrieve;
    Node.grow = grow;
    Node.shrink = shrink;

    return Node;
});
define('engine/lib/Octree/Item',[],function () {
    function Item(x, y, z, ex, ey, ez) {
        if (arguments.length === 3) {
            this.type = Item.POINT;
            this.x = x;
            this.y = y;
            this.z = z;
        } else {
            this.type = Item.AABB;
            this.x = x;
            this.y = y;
            this.z = z;
            this.ex = ex;
            this.ey = ey;
            this.ez = ez;
        }


        //this is neccesary to set on objects creation,
        //otherwise it will be set on retrieve and memory allocation will slow things down.
        //is used to avoid duplicates in retrieve results
        this.flag = 0;
        this.id = null;
    }

    Item.POINT = 0;
    Item.AABB = 1;

    var p = Item.prototype;

    p.id = null;
    p.type = null;
    p.flag = 0;

    p.x = 0;
    p.y = 0;
    p.z = 0;

    p.ex = 0;
    p.ey = 0;
    p.ez = 0;

    return Item;
});
define('engine/lib/octree',["./Octree/node", "./Octree/Item"], function (Node, Item) {

        /**
         * @param {number} min Root bounding box min XYZ value.
         * @param {number} max Root bounding box max XYZ value.
         * @param {int} maxDepth
         * @param {int} treshold
         * @param {int} tearDrop
         * @constructor
         */
        function Octree(maxDepth, treshold, tearDrop) {
            this.maxDepth = maxDepth || 8;
            this.treshold = treshold || 32;
            this.tearDrop = tearDrop || 1;
            this.items = [];
            this.lastItemId = 0;
        }

        Octree.Item = Item;
        Octree.Node = Node;

        var p = Octree.prototype;

        /**
         * Limit when node should subdivide
         * @type {int}
         */
        p.treshold = null;

        /**
         * @type {int}
         */
        p.maxDepth = null;

        /**
         * Minimal size of node bounds
         * @type {number}
         */
        p.tearDrop = 0;

        /**
         * Root node of tree
         * @type {Node}
         */
        p.root = null;

        p.lastItemId = 0;
        p.items = null;


        /**
         * Inserts bounding box into octree.
         * @param {BoundingBox} item
         * @returns {*}
         */
        p.insert = function (item) {
            if (item.id === null) {
                item.id = this.lastItemId++;
                this.items[item.id] = item;
            }

            if (this.root === null) {
                //var root = this.root = Node.create(this);
                var root = this.root = new Node(this);
                root.x = item.x;
                root.y = item.y;
                root.z = item.z;
                root.ex = item.ex + 1;
                root.ey = item.ey + 1;
                root.ez = item.ez + 1;
            } else {
                var root = this.root;
            }

            if ((item.x - item.ex) >= (root.x - root.ex) &&
                (item.x + item.ex) <= (root.x + root.ex) &&
                (item.y - item.ey) >= (root.y - root.ey) &&
                (item.y + item.ey) <= (root.y + root.ey) &&
                (item.z - item.ez) >= (root.z - root.ez) &&
                (item.z + item.ez) <= (root.z + root.ez)) {
                Node.insert(this, this.root, item);
            } else {
                var dx = this.root.x - item.x,
                    dy = this.root.y - item.y,
                    dz = this.root.z - item.z;
                this.grow(dx, dy, dz);
                this.insert(item);
            }

        }

        /**
         * Remove bounding box from octree
         * @param {BoundingBox} item
         * @returns {boolean} True on success, else false.
         */
        p.remove = function (item) {
            var root = this.root;

            if ((item.x - item.ex) >= (root.x - root.ex) &&
                (item.x + item.ex) <= (root.x + root.ex) &&
                (item.y - item.ey) >= (root.y - root.ey) &&
                (item.y + item.ey) <= (root.y + root.ey) &&
                (item.z - item.ez) >= (root.z - root.ez) &&
                (item.z + item.ez) <= (root.z + root.ez)) {
                var r = Node.remove(this, this.root, item);
                if (r === true) {
                    this.shrink()
                }

                if (this.root.count === 0)
                    this.root = null;

                return r;
            }

            return false;
        }

        /**
         * Returns array of bounding boxes, that lies near given bounding box.
         * @param {BoundingBox} item
         * @param Array out Array that will be filled with result items
         * @returns {BoundingBox[]}
         */
        p.retrieve = function (item, out) {
            out = out || [];

            if (this.root !== null) {
                Node.retrieve(this.root, item, out);
                var l = out.length,
                    items = this.items;

                for (var i = 0, j = 0; i < l; i++) {
                    var item = items[out[i]];

                    if (item.flag & 1) { //if item is not flagged then it's a duplicate and the item is in array already.
                        item.flag = 0;
                        out[j++] = item;
                    }

                }

                //now, remove all garbage(duplicate indexes in the tail of array) from array
                out.splice(j, i - j);

            }
            return out;
        }

        p.grow = function (x, y, z) {
            if (x >= 0)
                x = 1;
            else
                x = 0;

            if (y >= 0)
                y = 1;
            else
                y = 0;

            if (z >= 0)
                z = 1;
            else
                z = 0;

            var index = (z << 2) + (y << 1) + x;

            this.root = Node.grow(this, this.root, index);
        }

        p.shrink = function () {
            var newRoot = Node.shrink(this, this.root);
            if (newRoot !== false)
                this.root = newRoot;
        }


        return Octree;
    }
);

/* TODO gameObject's components should be grouped in global groups
* that way same components would be accessible anytime & from one place
* TODO Tick should be event. Not method.
* TODO ..ooor we can create collection of updatable components right when GO is added, doing update == null check just once.
* TODO rename to "scene"
*/

define('engine/world',['require','./lib/octree','events'],function (require) {
    var Octree = require('./lib/octree'),
        EventManager = require("events");

    /**
     * @param {Logic} logic
     * @constructor
     */
    function World(logic, useOctree) {
        EventManager.call(this);

        this.logic = logic;
        this.gameObjects = [];

        if (useOctree === true)
            q = this.octree = new Octree(64,1000,45)

        this.removeQueue = [];
    }

    var p = World.prototype = Object.create(EventManager.prototype);

    p.events = {
        awake: 0,
        start: 1,
        update: 2
    }

    /**
     * @type {Logic}
     */
    p.logic = null;

    /**
     * Reference to octree which will be used to partition space of the world
     * @type {null}
     * @private
     */
    p.octree = null;

    /**
     * @type {GameObject[]}
     * @private
     */
    p.gameObjects = null;

    /**
     * @type {number}
     * @private
     */
    p.gameObjectsCount = 0;

    /**
     * @private
     * @type {[]}
     */
    p.removeQueue = null;

    /**
     * @private
     * @type {boolean}
     */
    p.removeQueueWaiting = false;

    /**
     * @private
     * @type {boolean}
     */
    p._started = false;

    p._awaken = false;

    /**
     * Array with gameObjects
     * @param {GameObject} gameObject
     */
    p.addGameObject = function (gameObject) {
        //TODO check if gameObject is already present
        this.gameObjects[this.gameObjectsCount++] = gameObject;
        gameObject.setWorld(this);

        if (this.octree !== null) {
            var pos = gameObject.transform.getPosition();

                var item = new Octree.Item(pos[0], pos[1], pos[2]);

                gameObject.item = item;
                item.gameObject = gameObject;


                this.octree.insert(item);
                var octree = this.octree;
                gameObject.transform.addEventListener(gameObject.transform.events.update, function (transform) {
                    octree.remove(item);
                    var p = transform.getPosition();
                    item.x = p[0];
                    item.y = p[1];
                    item.z = p[2];
                    octree.insert(item);
                });
        }

        if(this._awaken)
            gameObject.awake();

        if (this._started)
            gameObject.start();

        if (gameObject.transform.children.length !== 0) {
            for (var i = 0; i < gameObject.transform.children.length; i++) {
                var child = gameObject.transform.children[i].gameObject;
                this.addGameObject(child);
            }
        }
    };

    /**
     * Puts game object in queue to remove.
     * Game object will be removed at the end of tick
     * @param {GameObject} gameObject
     */
    p.removeGameObject = function (gameObject) {
        //put GO's children in queue first, because they may be dependant on GO
        //therefore should be deleted first
        if (gameObject.transform.children.length !== 0) {
            for (var i = 0; i < gameObject.transform.children.length; i++) {
                var child = gameObject.transform.children[i].gameObject;
                this.removeGameObject(child);
            }
        }

        this.removeQueue.push(gameObject);
        this.removeQueueWaiting = true;
    }

    p.retrieve = function (gameObject) {
        if (this.octree !== null) {
            var items = this.octree.retrieve(gameObject.item);
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                items[i] = item.gameObject;
            }
            return items;
        }
        return this.gameObjects;//.slice(0); //slice(0) pollutes heap and does a sawtooth with GC
    };

    p.run = function(){
        this.awake();
        this.start();
    };

    /**
     * Runs awake methods of all components.
     * NOTICE! If some gameObject or component are being added in awake,
     * it will be pushed at the end of gameObject or componet array and it's awake method
     * will be called from the same loop.
     */
    p.awake = function(){
        for (var i = 0; i < this.gameObjectsCount; i++) {
            this.gameObjects[i].awake();
        }
        this._awaken = true;
    };

    p.start = function () {
        for (var i = 0; i < this.gameObjectsCount; i++) {
            this.gameObjects[i].start();
        }
        this._started = true;
    };

    p.tick = function (time) {
        var i,
            len = this.gameObjectsCount,
            gos = this.gameObjects;

        for (i = 0; i < len; i++)
            gos[i].tick(time);

        if (this.removeQueueWaiting) {
            var len = this.removeQueue.length,
                gameObject;

            for (i = 0; i < len; i++) {
                gameObject = this.removeQueue.pop();
                gameObject.transform.destroy(); //TODO: refactor this with event.
                this.gameObjects.splice(this.gameObjects.indexOf(gameObject), 1);
                this.gameObjectsCount--;

                //remove from tree
                if(this.octree !== null){
                    this.octree.remove(gameObject.item);
                }
            }

            this.removeQueueWaiting = false;
        }
    };

    p.findByName = function (name) {
        var result = [],
            gameObjects = this.gameObjects,
            len = this.gameObjectsCount,
            gameObject,
            i;

        for (i = 0; i < len; i++) {
            gameObject = gameObjects[i];
            if (gameObject.name === name) {
                result.push(gameObject);
            }
        }

        if (result.length === 1)
            return result[0];
        else if (result.length > 1)
            return result;
        else
            return false;
    }

    return World;
});
define('engine/game',['require','namespace','./graphics','./time','./world'],function (require) {
    var namespace = require("namespace");
    var Graphics = require("./graphics");
    var Time = require("./time");
    var Scene = require("./world");

    var Engine = namespace("Isometrica.Engine");

    /**
     * @constructor
     */
    function Game() {
        this.scene = new Scene(this);
        this.graphics = new Graphics(this);
        this.time = new Time();

        this.logic = {world:this.scene};

        var self = this,
            time = this.time,
            scene = this.scene,
            graphics = this.graphics;

        this.tick = function(){
            requestAnimFrame(self.tick);

            time.tick();
            scene.tick(time);
            graphics.render();
        }
    }

    Engine.Game = Game;

    var p = Game.prototype;

    p.time = null;

    /**
     * @type {Logic}
     */
    p.scene = null;

    /**
     * @type {Graphics}
     */
    p.graphics = null;

    /**
     * @type {void}
     */
    p.run = function () {
        this.scene.run();
        this.graphics.start();
        this.tick();
    };

    return Game;
});

define('engine/gameobject',['require','./components/transformcomponent','namespace'],function (require) {
    var Transform = require("./components/transformcomponent");
    var namespace = require("namespace");
    namespace("Isometrica.Engine").GameObject = GameObject;

    function init(instance, name) {
        instance.instanceId = GameObject.prototype.instanceId++;
        instance.components = [];
        instance.transform = instance.addComponent(new Transform());

        instance.removeQueue = [];

        instance.name = name || "gameObject";
    }

    /**
     * Base object
     * @constructor
     */
    function GameObject(name) {
        init(this, name);
    }

    GameObject.init = init;

    var p = GameObject.prototype;


    p.hasUpdatableComponents = function () {
        var components = this.components,
            len = this.componentsCount,
            i;

        for (i = 0; i < len; i++)
            if (components[i].tick !== null)
                return true;

        return false;
    };

    p.getUpdatableComponents = function () {
        var components = this.components,
            component,
            len = this.componentsCount,
            i, result = [];

        for (i = 0; i < len; i++) {
            component = components[i];
            if (component.tick !== null)
                result.push[component];
        }

        return result;
    };

    p.updateSubscription = function () {
        if (this.world)
            if (this.hasUpdatableComponents()) {
                this.world.addEventListener(this.world.events.update, this.update);
            } else {
                this.world.removeEventListener(this.world.events.update, this.update);
            }
    };


    /**
     * @type {Number}
     */
    p.instanceId = 0;

    p._awaken = false;

    /**
     * If currently is started.
     * GameObject is started when game is run, or when gameObject is added in already running world.
     * @type {boolean}
     */
    p._started = false;

    /**
     * @type {string}
     */
    p.name = null;

    /**
     * Layer index
     * @type {int}
     */
    p.layer = 0;

    /**
     * Reference to world object
     * @public
     * @type {World}
     */
    p.world = null;

    /**
     * Transform component attached to this game object.
     * @type {Transform}
     */
    p.transform = null;

    /**
     * @type {Component[]}
     */
    p.components = null;

    /**
     * @type {number}
     */
    p.componentsCount = 0;

    /**
     * @private
     * @type {[]}
     */
    p.removeQueue = null;

    /**
     * @private
     * @type {boolean}
     */
    p.removeQueueWaiting = false;

    /**
     * Runs once, before start
     */
    p.awake = function () {
        var cmp, i;
        for (i = 0; i < this.componentsCount; i++) {
            cmp = this.components[i];

            if (cmp.awake !== null)
                cmp.awake();
        }
        this._awaken = true;
    };

    /**
     * Runs when game starts
     */
    p.start = function () {
        var cmp, i;
        for (i = 0; i < this.componentsCount; i++) {
            cmp = this.components[i];

            if (cmp.start !== null)
                cmp.start();
        }
        this._started = true;
    };

    /**
     * @param {World} world
     */
    p.setWorld = function (world) {
        this.world = world;

        //this.updateSubscription();
    };

    /**
     * @public
     * @param {Component} component
     * @return {*}
     */
    p.addComponent = function (component) {
        this.components[this.componentsCount++] = component;

        component.setGameObject(this);

        this._started && component.start !== null && component.start();

        //this.updateSubscription();

        return component;
    };

    p.removeComponent = function (component) {
        component.unsetGameObject();
        this.removeQueue.push(component);
        this.removeQueueWaiting = true;

        //this.updateSubscription();
    };

    /**
     * Method will return component of type of given constructor function
     * @param {function} Type
     * @returns {*}
     */
    p.getComponent = function (Type) {
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            if (component instanceof Type)
                return component;
        }
        return null;
    };

    p.tick = function (time) {
        var components = this.components,
            component,
            len = this.componentsCount,
            i;

        for (i = 0; i < len; i++) {
            component = components[i];
            if (component.tick !== null)
                component.tick(time);
            //(component.tick || dummy)(time); //this sometimes is faster because its one property request less
        }

        if (this.removeQueueWaiting) {
            var len = this.removeQueue.length;

            for (i = 0; i < len; i++) {
                this.components.splice(this.components.indexOf(this.removeQueue.pop()), 1);
                this.componentsCount--;
            }

            this.removeQueueWaiting = false;
        }
    }

    p.destroy = function () {
        this.world.removeGameObject(this);
        this.world = null;
    }

    return GameObject;
});
define('engine/lib/boundingbox',[],function () {
    function BoundingBox(min, max, center) {
        if (min !== undefined) { //if min is set, then max is set too
            this.min = min;
            this.max = max;
        } else {
            this.min = [0, 0, 0];
            this.max = [0, 0, 0];
        }

        if (center !== undefined)
            this.center = center;
        else
            this.center = [0, 0, 0];

        this.calculateCenter();
    }

    BoundingBox.prototype.min = null;
    BoundingBox.prototype.max = null;
    BoundingBox.prototype.center = null;

    BoundingBox.prototype.calculateCenter = function () {
        var center = this.center,
            min = this.min,
            max = this.max;

        center[0] = min[0] + (max[0] - min[0]) / 2;
        center[1] = min[1] + (max[1] - min[1]) / 2;
        center[2] = min[2] + (max[2] - min[2]) / 2;
    }

    BoundingBox.prototype.setMinMax = function(x0, y0,z0,x1,y1,z1){
        var min = this.min,
            max = this.max;

        min[0] = x0;
        min[1] = y0;
        min[2] = z0;
        max[0] = x1;
        max[1] = y1;
        max[2] = z1;

        this.calculateCenter();
    }

    BoundingBox.prototype.Calculate = function (vertices) {
        var maxX = vertices[0][0],
            minX = vertices[0][0],
            maxY = vertices[0][1],
            minY = vertices[0][1],
            maxZ = vertices[0][2],
            minZ = vertices[0][2],
            verticesCount = vertices.length,
            vertex, i;

        for (i = 1; i < verticesCount; i++) {
            vertex = vertices[i];


            if (vertex[0] > maxX)
                maxX = vertex[0];
            else if (vertex[0] < minX)
                minX = vertex[0];


            if (vertex[1] > maxY)
                maxY = vertex[1];
            else if (vertex[1] < minY)
                minY = vertex[1];


            if (vertex[2] > maxZ)
                maxZ = vertex[2];
            else if (vertex[2] < minZ)
                minZ = vertex[2];
        }

        this.center[0] = minX + (maxX - minX) / 2;
        this.center[1] = minY + (maxY - minY) / 2;
        this.center[2] = minZ + (maxZ - minZ) / 2;

        this.min[0] = minX;
        this.min[1] = minY;
        this.min[2] = minZ;

        this.max[0] = maxX;
        this.max[1] = maxY;
        this.max[2] = maxZ;

        return this;
    }

    BoundingBox.prototype.Intersects = function (b) {
        return !(this.min[0] > b.max[0] || this.max[0] < b.min[0] || this.min[1] > b.max[1] || this.max[1] < b.min[1] || this.min[2] > b.max[2] || this.max[2] < b.min[2]);
    }

    BoundingBox.prototype.Contains = function (b) {
        return b.min[0] >= this.min[0] && b.max[0] <= this.max[0] && b.min[1] >= this.min[1] && b.max[1] <= this.max[1] && b.min[2] >= this.min[2] && b.max[2] <= this.max[2];
    }

    BoundingBox.prototype.ContainsPoint = function (point) {
        return point[0] >= this.min[0] && point[0] <= this.max[0] && point[1] >= this.min[1] && point[1] <= this.max[1] && point[2] >= this.min[2] && point[2] <= this.max[2];
    }

    return BoundingBox;
});

define('engine/lib/aabb',[],function () {
    function AABB(center, extents) {
        this.center = center || [0,0,0];
        this.extents = extents || [0,0,0];
        this.min = [];
        this.max = [];
        this.calculateMinMax();
    }

    AABB.prototype.setCenter = function(x,y,z){
        this.center[0] = x;
        this.center[1] = y;
        this.center[2] = z;
        this.calculateMinMax();
        return this;
    }

    AABB.prototype.setExtents = function(x,y,z){
        this.extents[0] = x;
        this.extents[1] = y;
        this.extents[2] = z;
        this.calculateMinMax();
        return this;
    }

    AABB.prototype.calculateMinMax = function () {
        var center = this.center,
            extents = this.extents,
            min = this.min,
            max = this.max;

        min[0] = center[0] - extents[0];
        min[1] = center[1] - extents[1];
        min[2] = center[2] - extents[2];

        max[0] = center[0] + extents[0];
        max[1] = center[1] + extents[1];
        max[2] = center[2] + extents[2];
    };

    AABB.prototype.Calculate = function (vertices) {
        var maxX = vertices[0][0],
            minX = vertices[0][0],
            maxY = vertices[0][1],
            minY = vertices[0][1],
            maxZ = vertices[0][2],
            minZ = vertices[0][2],
            verticesCount = vertices.length,
            vertex, i;

        for (i = 1; i < verticesCount; i++) {
            vertex = vertices[i];


            if (vertex[0] > maxX)
                maxX = vertex[0];
            else if (vertex[0] < minX)
                minX = vertex[0];


            if (vertex[1] > maxY)
                maxY = vertex[1];
            else if (vertex[1] < minY)
                minY = vertex[1];


            if (vertex[2] > maxZ)
                maxZ = vertex[2];
            else if (vertex[2] < minZ)
                minZ = vertex[2];
        }

        this.center[0] = minX + (maxX - minX) / 2;
        this.center[1] = minY + (maxY - minY) / 2;
        this.center[2] = minZ + (maxZ - minZ) / 2;

        this.min[0] = minX;
        this.min[1] = minY;
        this.min[2] = minZ;

        this.max[0] = maxX;
        this.max[1] = maxY;
        this.max[2] = maxZ;

        this.extents[0] = (maxX - minX) / 2;
        this.extents[1] = (maxY - minY) / 2;
        this.extents[2] = (maxZ - minZ) / 2;

        return this;
    }

    AABB.prototype.Intersects = function (b) {
        return !(this.min[0] > b.max[0] || this.max[0] < b.min[0] || this.min[1] > b.max[1] || this.max[1] < b.min[1] || this.min[2] > b.max[2] || this.max[2] < b.min[2]);
    }

    AABB.prototype.Contains = function (b) {
        return b.min[0] >= this.min[0] && b.max[0] <= this.max[0] && b.min[1] >= this.min[1] && b.max[1] <= this.max[1] && b.min[2] >= this.min[2] && b.max[2] <= this.max[2];
    }

    AABB.prototype.ContainsPoint = function (point) {
        return point[0] >= this.min[0] && point[0] <= this.max[0] && point[1] >= this.min[1] && point[1] <= this.max[1] && point[2] >= this.min[2] && point[2] <= this.max[2];
    }

    return AABB;
});

define('engine/components/cameracomponent',['require','namespace','../component','../lib/boundingbox','../lib/aabb','gl-matrix','events'],function(require){
    var namespace = require("namespace");
    var Component = require("../component");
    var BoundingBox = require("../lib/boundingbox");
    var AABB = require("../lib/aabb");
    var glMatrix = require("gl-matrix");
    var Events = require("events");

    namespace("Isometrica.Engine").CameraComponent = CameraComponent;

    /**
     * @constructor
     */
    function CameraComponent() {
        Component.call(this);
        this.projectionMatrix = new Float32Array(16);
        this.frustumSize = [
            [0, 0, 0],
            [0, 0, 0]
        ];
        this.frustumBox = [
            [0, 0, 0],
            [0, 0, 0]
        ];
        this.bounds = new BoundingBox();    //rename to AABB
        this.aabb = new AABB();
        this.worldToScreenMatrix = new Float32Array(16);
        this.worldToViewportMatrix = new Float32Array(16);

        var cam = this;
        this.transformUpdateEventHandler = function (transform) {
            //update frustumbox
            var localToWorld = transform.getLocalToWorld();
            glMatrix.vec3.transformMat4(cam.frustumBox[0], cam.frustumSize[0], localToWorld);
            glMatrix.vec3.transformMat4(cam.frustumBox[1], cam.frustumSize[1], localToWorld);

            //update wTv mat
            glMatrix.mat4.mul(cam.worldToViewportMatrix, cam.projectionMatrix, transform.getWorldToLocal());

            //update obbox
            cam.bounds.Calculate(cam.frustumBox);

            cam.dispatchEvent(cam.events.update);
        };

        this.viewportResizeEventHandler = function(viewport, args){
            cam.setup(viewport.width, viewport.height, 100);

            glMatrix.mat4.mul(cam.worldToViewportMatrix, cam.projectionMatrix, cam.gameObject.transform.getWorldToLocal());
        };
    }

    var vec3Buffer1 = new Float32Array(3);

    CameraComponent.prototype = Object.create(Component.prototype);

    CameraComponent.prototype.constructor = CameraComponent;

    CameraComponent.prototype.events = {
        update: 0,
        viewportSet: 1,
        viewportRemoved: 2
    };

    CameraComponent.prototype.viewport = null;

    CameraComponent.prototype.bounds = null;
    CameraComponent.prototype.frustumSize = null;
    CameraComponent.prototype.frustumBox = null;
    CameraComponent.prototype.projectionMatrix = null;

    CameraComponent.prototype.worldToScreenMatrix = null;
    CameraComponent.prototype.worldToViewportMatrix = null;

    CameraComponent.prototype.setup = function (width, height, length) {

        //update frustum size
        this.frustumSize = [
            [-width / 2, -height / 2, 0],
            [width / 2, height / 2, length]
        ];

        //update frustumbox
        var localToWorld = this.gameObject.transform.getLocalToWorld();
        glMatrix.vec3.transformMat4(this.frustumBox[0], this.frustumSize[0], localToWorld);
        glMatrix.vec3.transformMat4(this.frustumBox[1], this.frustumSize[1], localToWorld);

        //update projection matrix
        glMatrix.mat4.ortho(this.projectionMatrix, -width / 2, width / 2, -height / 2, height / 2, 0, length);

        //update aabbox
        this.bounds.Calculate(this.frustumBox);
    }

    CameraComponent.prototype.setViewport = function (viewport) {
        this.viewport = viewport;

        this.setup(viewport.width, viewport.height, 100);

        Events.on(this.viewport, this.viewport.events.resize, this.viewportResizeEventHandler);

        this.dispatchEvent(this.events.viewportSet, this);
    }

    CameraComponent.prototype.removeViewport = function () {
        this.dispatchEvent(this.events.viewportRemoved, this);
        this.viewport = null;
    }


    CameraComponent.prototype.setGameObject = function (gameObject) {
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.camera = this;
        gameObject.transform.addEventListener(gameObject.transform.events.update, this.transformUpdateEventHandler);
    }

    CameraComponent.prototype.unsetGameObject = function () {
        this.gameObject.camera = undefined;
        this.gameObject.transform.removeEventListener(this.gameObject.transform.events.update, this.transformUpdateEventHandler);
        Component.prototype.unsetGameObject.call(this);
    }

    CameraComponent.prototype.getWorldToScreen = function () {
        return glMatrix.mat4.mul(this.worldToScreenMatrix, this.viewport.viewportMatrix, this.worldToViewportMatrix);
    }

    CameraComponent.prototype.getWorldToViewport = function () {
        return this.worldToViewportMatrix;
    }

    CameraComponent.prototype.getScreenToWorld = function () {
        throw "CameraComponent.getScreenToWorld: not implemented";
    }

    CameraComponent.prototype.getVisibleGameObjects = function(){
        var r = [];
        var gs = this.gameObject.world.retrieve(this.gameObject),
            g = null,
            len = gs.length,
            V = this.getWorldToViewport(),
            vec3 = glMatrix.vec3,
            pos, viewportPos;

        for(var i = 0; i < len; i++){
            g = gs[i];
            if(g.renderer !== null){
                pos = g.transform.getPosition(vec3Buffer1);
                viewportPos = vec3.transformMat4(vec3Buffer1, vec3Buffer1, V);

                if(viewportPos[0] >= -1 && viewportPos[0] < 1 && viewportPos[1] >= -1 && viewportPos[1] < 1)
                    r.push(g);
            }
        }

        return r;
    };

    return CameraComponent;
});


define('engine/gameObjects/camera',['require','namespace','../gameobject','../components/cameracomponent'],function (require) {
    var namespace = require("namespace");
    var GameObject = require("../gameobject");
    var CameraComponent = require("../components/cameracomponent");

    namespace("Isometrica.Engine").Camera = CameraObject;

    function CameraObject(name) {
        GameObject.call(this, name || "camera");
        this.addComponent(new CameraComponent());
    }

    CameraObject.prototype = Object.create(GameObject.prototype);

    return CameraObject;
});

/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 07.04.14
 * Time: 15:21
 * To change this template use File | Settings | File Templates.
 */
define('engine/components/renderer',['require','namespace','./../component','gl-matrix'],function (require) {
    var namespace = require("namespace");
    var Component = require("./../component");
    var vec3Buffer1 = new Float32Array(3);
    var glMatrix = require("gl-matrix");
    var Vec3 = glMatrix.vec3;

    namespace("Isometrica.Engine").Renderer = Renderer;

    function Renderer(){
        Component.call(this);
    }

    Renderer.prototype = Object.create(Component.prototype);

    Renderer.prototype.cullingTest = function(viewport, viewportRenderer){
        this.gameObject.transform.getPosition(vec3Buffer1);
        Vec3.transformMat4(vec3Buffer1, vec3Buffer1, viewportRenderer.V);

        return vec3Buffer1[0] <= 1 && vec3Buffer1[0] >= -1 && vec3Buffer1[1] <= 1 && vec3Buffer1[1] >= -1;
    };

    Renderer.prototype.render = function(layer,viewportRenderer,viewport){
        this.gameObject.transform.getPosition(vec3Buffer1);
        Vec3.transformMat4(vec3Buffer1, vec3Buffer1, viewportRenderer.V);

        glMatrix.vec3.transformMat4(vec3Buffer1, this.gameObject.transform.getPosition(vec3Buffer1), viewportRenderer.M);

        layer.font = "normal 12px arial";
        layer.fillStyle = "red"
        layer.textAlign = "center";
        layer.textBaseline = "middle";
        layer.fillText("EMPTY RENDERER", vec3Buffer1[0], vec3Buffer1[1]);
    };
    Renderer.prototype.layer = 0;

    Renderer.prototype.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.renderer = this;
    };

    Renderer.prototype.unsetGameObject = function(){
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    };

    return Renderer;
});
define('engine/components/spriterenderer',['require','namespace','./renderer','./transformcomponent','gl-matrix'],function (require) {
    var namespace = require("namespace");
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("./renderer");
    var Transform = require("./transformcomponent");
    var glMatrix = require("gl-matrix");
    var Vec3 = glMatrix.vec3;

    namespace("Isometrica.Engine").SpriteRenderer = Sprite;

    function Sprite(sprite) {
        Component.call(this);

        this.events = {
            ready: 0
        }

        this.buf = new Float32Array(3);

        this.enabled = false;
        this.t = Vec3.transformMat4;
    }

    var p = Sprite.prototype = Object.create(Component.prototype);

    p.constructor = Sprite;

    p.sprite = null;

    p.pivotX = 0;
    p.pivotY = 0;

    p.layer = 0;

    p.setGameObject = function (gameObject) {
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.spriteRenderer = this;
        gameObject.renderer = this;
        this.opacity = 1;
    };

    p.setSprite = function (sprite) {
        this.sprite = sprite;
        this.enabled = true;

        return this;
    };

    p.setPivot = function (x, y) {
        this.pivotX = x;
        this.pivotY = y;
        return this;
    };

    p.unsetGameObject = function () {
        this.gameObject.spriteRenderer = undefined;
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    };

    var getPos = Transform.getPosition;

    p.cullingTest = function (viewport, viewportRenderer, self) {
        var buffer = self.buf;

        //self.gameObject.transform.getPosition(buffer);
        getPos(self.gameObject.transform, buffer);

        Vec3.transformMat4(buffer, buffer, viewportRenderer.M);

        var sprite = self.sprite;
        var x0 = (buffer[0] - self.pivotX) | 0;
        var y0 = (buffer[1] - self.pivotY) | 0;

        return x0 <= viewport.width && x0 + sprite.width >= 0 && y0 <= viewport.height && y0 + sprite.height >= 0;
    };

    var transformMat4 = function(out, a, m) {
        var x = a[0], y = a[1], z = a[2];
        out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
        out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        return out;
    };

    p.render = function (layer, viewportRenderer, viewport, self) {
        var buffer = self.buf;

        //self.gameObject.transform.getPosition(buffer);
        getPos(self.gameObject.transform, buffer);
        transformMat4(buffer, buffer, viewportRenderer.M);

        var sprite = self.sprite;
        var w = sprite.width;
        var h = sprite.height;

        if(self.opacity !== 1) {
            layer.save();
            layer.globalAlpha = self.opacity;

            layer.drawImage(sprite.sourceImage, sprite.offsetX, sprite.offsetY, w, h, (buffer[0] - self.pivotX) | 0, (buffer[1] - self.pivotY) | 0, w, h);
            layer.restore();
        }else
            layer.drawImage(sprite.sourceImage, sprite.offsetX, sprite.offsetY, w, h, (buffer[0] - self.pivotX) | 0, (buffer[1] - self.pivotY) | 0, w, h);
    };

    return Sprite;
});
/**
 * This class is a wrapper for Image, Audio, Blob objects.
 * It allows to download blob,image,audio,json or text files using xhr, and use progress events of xhr requests.
 */
define('engine/lib/assetmanager/resource',['require','events'],function (require) {
    var EventManager = require("events");

    function Resource(path, type) {
        EventManager.call(this);

        this.state = ResourceStateEnum.none;
        this.type = type || ResourceTypeEnum.blob;
        this.path = path;
        this.data = null;

        var self = this;
        this.onProgress = function (e) {
            self.dispatchEvent(self.events.progress, e);
        };

        //this will be called once ajax/xhr loading will be finished
        this.onLoad = function (xhr) {
            var data,
                xhr = xhr.target;

            if (xhr.status === 200) {
                if (self.type === ResourceTypeEnum.image) {
                    data = new Image();
                    data.addEventListener("load", function () {
                        self.data = data;
                        self.state = ResourceStateEnum.ready;
                        self.dispatchEvent(self.events.done, self);
                    });
                    data.src = self.path;
                    return;
                } else if (self.type === ResourceTypeEnum.audio) {
                    data = new Audio();
                    data.addEventListener("canplaythrough", function () {
                        self.data = data;
                        self.state = ResourceStateEnum.ready;
                        self.dispatchEvent(self.events.done, self);
                    });
                    data.setAttribute('src', self.path);
                    return;
                } else if (self.type === ResourceTypeEnum.blob) {
                    data = xhr.response;
                } else if (self.type === ResourceTypeEnum.json) {
                    data = JSON.parse(xhr.response);
                } else if (self.type === ResourceTypeEnum.text) {
                    data = xhr.response
                }

                self.data = data;
                self.state = ResourceStateEnum.ready;
                self.dispatchEvent(self.events.done, self);

            }else{
                self.data = data;
                self.state = ResourceStateEnum.failed;
                self.dispatchEvent(self.events.done, self);
            }
        };

        this.load();
    }

    var ResourceTypeEnum = {
        blob: 0,
        image: 1,
        audio: 2,
        json: 3,
        text: 4
    };

    var ResourceStateEnum = {
        none: 0,
        loading: 1,
        ready: 2,
        failed: 3
    };

    Resource.prototype = Object.create(EventManager.prototype);

    Resource.prototype.constructor = Resource;

    Resource.prototype.events = {
        "done": 0,
        "progress": 1
    };

    Resource.prototype.done = function (callback) {
        if (this.state === ResourceStateEnum.ready)
            callback(this);
        else if (this.state === ResourceStateEnum.loading || this.state === ResourceStateEnum.none)
            this.addEventListener(this.events.done, callback);

        return this;
    };

    Resource.prototype.progress = function (callback) {
        if (this.state === ResourceStateEnum.loading || this.state === ResourceStateEnum.none)
            this.addEventListener(this.events.progress, callback);

        return this;
    };


    Resource.prototype.load = function () {
        //Don't load if it is already loaded
        if (this.state === ResourceStateEnum.loading ||
            this.state === ResourceStateEnum.ready) return;

        this.state = ResourceStateEnum.loading;

        var xhr = new XMLHttpRequest();

        xhr.open("GET", this.path, true);

        //we'll parse json by ourself, so return text please.
        xhr.responseType = this.type === ResourceTypeEnum.json || this.type === ResourceTypeEnum.text ? "text" : "blob";

        //if progress callback was provided, then register it to XHR progress event
        xhr.addEventListener('progress', this.onProgress);
        xhr.addEventListener('load', this.onLoad);

        xhr.send();

        return xhr;
    };

    Resource.ResourceTypeEnum = ResourceTypeEnum;
    Resource.ResourceStateEnum = ResourceStateEnum;

    return Resource;
});
/**
 * This class represents interface for managing binary resources like images and audio, or any other type as blob.
 * Main goal of asset manager is to avoid binary data duplication in memory by caching and returning requested resources.
 * If resource is not cached, then is should be loaded, put in cache and reference of resource should be passed into callback function.
 * If resource is cached, onsuccess callback should be called immediately and passed a cached resource.
 * Each resource is identified by its path relatively to web application root.
 *
 * Because memory amount is limited asset manager should provide interface to load only currently needed resources
 * and release unneeded. It is upon programmer to decide whenever to release resources and which resources to load.
 */
define('engine/lib/assetmanager/assetmanager',['require','namespace','./resource'],function (require) {
        var namespace = require("namespace");
        var Resource = require("./resource");

        namespace("Isometrica.Engine").AssetManager = AssetManager;

        function AssetManager() {
            this.assets = {};
        }

        AssetManager.prototype.assets = null;

        AssetManager.prototype.getAsset = function (path, type) {
            if (this.assets[path] !== undefined)
                return this.assets[path];
            else if(type === Resource.ResourceTypeEnum.audio)
                return new AssetManager.Resource(path, type);
            else
                return this.assets[path] = new AssetManager.Resource(path, type);

        };

        AssetManager.prototype.releaseAsset = function (path) {
            if (this.assets[path] !== undefined)
                delete this.assets[path];
        };

        AssetManager.Resource = Resource;

        return AssetManager;
    }
);


/**
 * This class provides api to work with sprites, spritesheets etc;
 */
define('engine/spritemanager',['require','namespace'],function (require) {
    var namespace = require("namespace");
    namespace("Isometrica.Engine").SpriteManager = SpriteMgr;

    function SpriteMgr(assetMgr) {
        this.assets = assetMgr;
        this.frames = {};
    }



    SpriteMgr.Sprite = function Sprite() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.width = 0;
        this.height = 0;
    };

    SpriteMgr.Sprite.prototype.sourceImage = new Image();

    SpriteMgr.prototype.getSprite = function (name) {
        var sprite = new SpriteMgr.Sprite();

        if (this.frames[name] !== undefined) {
            var data = this.frames[name];
            sprite.sourceImage = this.atlas;
            sprite.width = data.frame.w;
            sprite.height = data.frame.h;
            sprite.offsetX = data.frame.x;
            sprite.offsetY = data.frame.y;
        } else {
            this.assets.getAsset("client/assets/" + name, this.assets.constructor.Resource.ResourceTypeEnum.image).done(function (resource) {
                sprite.sourceImage = resource.data;
                sprite.width = resource.data.width;
                sprite.height = resource.data.height;
            });

        }

        return sprite;
    };

    return SpriteMgr;
});


define('engine/components/textrenderer',['require','namespace','./renderer','gl-matrix'],function (require) {
    var namespace = require("namespace");
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("./renderer");
    var glMatrix = require("gl-matrix");

    namespace("Isometrica.Engine").TextRenderer = TextRenderer;

    function TextRenderer() {
        Component.call(this);
    }

    var p = TextRenderer.prototype = Object.create(Component.prototype);

    p.constructor = TextRenderer;

    p.text = "sample text";
    p.color = "white";
    p.style = "normal 12px arial"
    p.layer = 0;
    p.align = "center";
    p.valign = "middle";

    p.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.textRenderer = this;
        gameObject.renderer = this;
    };

    p.unsetGameObject = function(){
        this.gameObject.textRenderer = undefined;
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    };

    p.render = function(layer, viewportRenderer){
        glMatrix.vec3.transformMat4(vec3Buffer1, this.gameObject.transform.getPosition(vec3Buffer1), viewportRenderer.M);

        layer.font = this.style;
        layer.fillStyle = this.color;
        layer.textAlign = this.align;
        layer.textBaseline = this.valign;
        layer.fillText(this.text, vec3Buffer1[0], vec3Buffer1[1]);
    };

    return TextRenderer;
});
define('engine/components/animatedspriterenderer',['require','namespace','./spriterenderer'],function (require) {
    var namespace = require("namespace");
    var SpriteRenderer = require("./spriterenderer");

    namespace("Isometrica.Engine").AnimatedSpriteRenderer = AnimatedSprite;

    function AnimatedSprite(sprite) {
        SpriteRenderer.call(this);

        this.frames = [];
    }

    var p = AnimatedSprite.prototype = Object.create(SpriteRenderer.prototype);

    p.constructor = AnimatedSprite;

    p.frames = null;
    p.currentFrame = 0;
    p.speed = 1; // 0 - 1.  1 = 24FPS

    p.addFrame = function (sprite) {
        this.frames.push(sprite);
    };

    p.setAnimationSpeed = function (value) {
        this.speed = value;
    };

    p.tick = function () {
        if (this.frames !== null && this.frames.length > 0) {
            var index = this.currentFrame + 1;

            if (index >= this.frames.length)
                index = 0;

            this.currentFrame = index;
            this.setSprite(this.frames[index]);
        }
    };

    return AnimatedSprite;
});
/**
 * Created by User on 28.07.2014.
 */
define('engine/coroutine',['require','namespace'],function(require){
    var namespace = require("namespace");
    var Coroutine = namespace("Isometrica.Engine.Coroutine");

    var coroutineId = 0;
    var coroutines = {};

    /*
    Routine is a function that return a number, that indicates how long the delay should be, before executing routine next time,
    if -1 is returned, routine won't be called again.
     */

    /**
     *
     * @param routine
     * @param {...*} Optional parameters that will be passed to routine
     * @returns {number}
     */
    Coroutine.startCoroutine = function(routine){
        var cid = coroutineId++;
        var args = Array.prototype.slice.call(arguments,1);
        var timerHandler = function(){
            var delay = routine.apply(this,args);
            if(delay >= 0)
                coroutines[cid] = setTimeout(timerHandler,delay);
        };
        timerHandler();

        return cid;
    };

    Coroutine.stopCoroutine = function(coroutineId){
        clearTimeout(coroutines[coroutineId]);
        delete coroutines[coroutineId];
    };

    return Coroutine;
});

/*RAF shim*/
window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame/* ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    */
})();

define('engine/main',['require','namespace','./config','./game','./gameobject','./component','./gameObjects/camera','./components/cameracomponent','./components/transformcomponent','./components/spriterenderer','./lib/assetmanager/assetmanager','./spritemanager','./components/textrenderer','./components/animatedspriterenderer','./components/renderer','./coroutine'],function(require){
    var namespace = require("namespace");

    var Config = require("./config");
    var Game = require("./game");
    var GameObject = require("./gameobject");
    var Component = require("./component");
    var Camera = require("./gameObjects/camera");
    var CameraComponent = require("./components/cameracomponent");
    var TransformComponent = require("./components/transformcomponent");
    var SpriteRenderer = require("./components/spriterenderer");
    var AssetManager = require("./lib/assetmanager/assetmanager");
    var SpriteManager = require("./spritemanager");
    var TextRenderer = require("./components/textrenderer");
    var AnimaterSpriteRenderer = require("./components/animatedspriterenderer");
    var Renderer = require("./components/renderer");
    var Coroutine = require("./coroutine");

    return namespace("Isometrica.Engine");
});

define(function(require){
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

            //it sees more or less of the world now, if from the same spot
            cam.dispatchEvent(cam.events.update);
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

    /**
     * How much larger than life it shows things: 2 is twice as close, 0.5
     * twice as far.
     *
     * It is the camera's resolution rather than its lens - it renders its
     * viewport's size divided by this, in pixels, and that picture is
     * stretched over the viewport (see Viewport#setSize). Everything that
     * draws, or picks what is under the pointer, keeps working in the
     * camera's own pixels, a sprite's pixel is still one of them, and the
     * pointer comes in those same pixels.
     * @type {number}
     */
    CameraComponent.prototype.zoom = 1;

    /**
     * What things are drawn in the order of, back to front: x, y and z of
     * where each is, times these, added up. Away from the camera along the
     * ground first, higher later - for a camera looking down at the ground
     * from over the corner where x and z are smallest. Whoever turns the
     * camera round turns these round with it.
     */
    CameraComponent.prototype.depthAxes = [1, -1, 1];

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

    CameraComponent.prototype.setZoom = function (zoom) {
        this.zoom = zoom;

        if (this.viewport !== null && this.viewport.displayWidth !== null)
            this.viewport.setSize(this.viewport.displayWidth, this.viewport.displayHeight);
    };

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


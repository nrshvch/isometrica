define(function (require) {
    var namespace = require("namespace");
    var Component = require("../Component");
    var glMatrix = require("../vendor/gl-matrix");
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    namespace("Isometrica.Engine").TransformComponent = Transform;

    /**
     * Create Transform component.
     * Every component has a game object.
     * @param {GameObject} gameObject
     * @constructor
     */
    function Transform() {
        Component.call(this);

        this.events = {
            update: 0
        }

        this.children = [];

        this.local = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

        this.localToWorld = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

        this.worldToLocal = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

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

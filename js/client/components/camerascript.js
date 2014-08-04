define(function (require) {
    var engine = require("engine");
    var glMatrix = require("../vendor/gl-matrix");
    var Events = require("events");

    function CameraScript() {
        engine.Component.call(this);
        this.events = {
            inputMove: 0,
            inputClick: 1,
            inputDragStart: 2,
            inputDragEnd: 3,
            inputDrag: 4
        };


        var self = this,
            lastPointerPos = null,
            moveLen = null,
            isDrag = false,
            lastPointerDownEvent = null;

        //These handlers take standard mouse\pointer events and transform them into game specific events like drag/click

        this.onPointerDown = function (sender, e) {
            lastPointerDownEvent = e;
            lastPointerPos = [e.gameViewportX, e.gameViewportY];
            moveLen = [0, 0];
            isDrag = false;
        };

        this.onPointerUp = function (sender, e) {
            if (lastPointerPos !== null) {
                if (isDrag) {
                    self.dispatchEvent(self.events.inputDragEnd, e);
                    isDrag = false;
                } else
                    self.dispatchEvent(self.events.inputClick, e);


                moveLen = null;
                lastPointerPos = null;
            }
        };

        this.onPointerMove = function (sender, e) {
            if (lastPointerPos !== null) {
                var x = e.gameViewportX - lastPointerPos[0],
                    y = e.gameViewportY - lastPointerPos[1];

                moveLen[0] += x;
                moveLen[1] += y;
                lastPointerPos[0] = e.gameViewportX;
                lastPointerPos[1] = e.gameViewportY;

                if (!isDrag && Math.sqrt(Math.pow(moveLen[0], 2) + Math.pow(moveLen[1], 2)) > 2) {
                    isDrag = true;
                    self.dispatchEvent(self.events.inputDragStart, lastPointerDownEvent);
                }

                if (isDrag)
                    self.dispatchEvent(self.events.inputDrag, {e: e, dx: x, dy: y})

            }

            self.dispatchEvent(self.events.inputMove, e);
        }

        this.onPointerOut = function (sender, e) {
            if (lastPointerPos !== null) {
                moveLen = null;
                lastPointerPos = null;

                if (isDrag)
                    self.dispatchEvent(self.events.inputDragEnd, e);
            }
        }
    }

    CameraScript.prototype = Object.create(engine.Component.prototype);
    CameraScript.prototype.constructor = CameraScript;

    var tmpctx = document.createElement("canvas").getContext("2d"),
        vec3Buffer1 = new Float32Array(3),
        vec3Buffer2 = new Float32Array(3),
        COS45 = Math.cos(45 * Math.PI / 180);

    tmpctx.canvas.width = 256;
    tmpctx.canvas.height = 256;

    /**
     * @type {Transform}
     */
    CameraScript.prototype.target = null;

    CameraScript.prototype.onTargetUpdate = null;
    CameraScript.prototype.onPointerMove = null;
    CameraScript.prototype.onPointerDown = null;
    CameraScript.prototype.onPointerUp = null;
    CameraScript.prototype.onPointerOut = null;
    CameraScript.prototype.panSens = 1;

    CameraScript.prototype.awake = function () {
        var camera = this.gameObject.camera,
            self = this;

        camera.addEventListener(camera.events.viewportSet, function (camera) {
            var viewport = camera.viewport;

            Events.on(viewport, viewport.events.pointerdown, self.onPointerDown);
            Events.on(viewport, viewport.events.pointerup, self.onPointerUp);
            Events.on(viewport, viewport.events.pointermove, self.onPointerMove);
            Events.on(viewport, viewport.events.pointerout, self.onPointerOut);
        });

        camera.addEventListener(camera.events.viewportRemoved, function (camera) {
            var viewport = camera.viewport;

            viewport.removeEventListener(viewport.events.pointerdown, self.onPointerDown);
            viewport.removeEventListener(viewport.events.pointerup, self.onPointerUp);
            viewport.removeEventListener(viewport.events.pointermove, self.onPointerMove);
            viewport.removeEventListener(viewport.events.pointerout, self.onPointerOut);
        });



        //this.gameObject.transform.setPosition(11585, 0, 15609);
        this.gameObject.transform.setPosition(2784.961181640625, 0, 3594.453369140625);
        this.gameObject.transform.rotate(30, 45, 0, "self");
    };

    CameraScript.prototype.setGameObject = function (gameObject) {
        engine.Component.prototype.setGameObject.call(this, gameObject);
        gameObject.cameraScript = this;
    };

    /**
     * @param {Transform} target
     */
    CameraScript.prototype.setTarget = function (target) {
        if (this.target !== null) {
            this.removeTarget();
        } else {
            var targetTransform = target.gameObject.transform;

            this.target = target;

            this.onTargetUpdate = function (transform) {
                CameraScript.prototype.moveTo(transform);
            }

            targetTransform.addEventListener(targetTransform.events.update, this.onTargetUpdate);
        }
    };

    CameraScript.prototype.unsetTarget = function () {
        if (this.target !== null) {
            var targetTransform = this.target.gameObject.transform;

            this.target = null;

            targetTransform.removeEventListener(targetTransform.events.update, this.onTargetUpdate);
        }
    };

    CameraScript.prototype.moveTo = function (transform) {
        var pos = transform.getPosition();
        this.gameObject.transform.setPosition(pos[0], 0, pos[2]);
    };

    CameraScript.prototype.pan = function (x, y) {
        this.gameObject.transform.translate(
            (-x * COS45 + y / COS45) / this.panSens, 0,
            (x * COS45 + y / COS45) / this.panSens, 'world'
        );
    };

    CameraScript.prototype.pickGameObject = function (x, y, resultArray) {
        var vec3 = glMatrix.vec3,
            gameObjects = this.gameObject.world.retrieve(this.gameObject),
            len = gameObjects.length,
            gameObject,
            camera = this.gameObject.camera,
            wTs = camera.getWorldToScreen(),
            wTv = camera.getWorldToViewport(),
            sprite, text, x0, y0, x1, y1,
            result = resultArray || [];

        for (var i = 0; i < len; i++) {
            gameObject = gameObjects[i];

            gameObject.transform.getPosition(vec3Buffer1);

            //skip objects that lay outside of screen
            vec3.transformMat4(vec3Buffer2, vec3Buffer1, wTv);
            if (Math.abs(vec3Buffer2[0]) > 1 || Math.abs(vec3Buffer2[1]) > 1)
                continue;

            vec3.transformMat4(vec3Buffer1, vec3Buffer1, wTs);

            sprite = gameObject.spriteRenderer;
            text = gameObject.textRenderer;

            if (sprite !== undefined && sprite.enabled) {
                var spriteImage = sprite.sprite,
                    w = spriteImage.width,
                    h = spriteImage.height;

                x0 = vec3Buffer1[0] - sprite.pivotX;
                y0 = vec3Buffer1[1] - sprite.pivotY;
                x1 = x0 + spriteImage.width;
                y1 = y0 + spriteImage.height;

                //fast & inaccurate test
                if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
                    //detailed test
                    tmpctx.clearRect(0, 0, w, h);
                    tmpctx.drawImage(spriteImage.sourceImage, spriteImage.offsetX, spriteImage.offsetY, w, h, 0, 0, w, h);
                    if (tmpctx.getImageData(x - x0, y - y0, 1, 1).data[3] > 0) {
                        result.push(gameObject);
                    }
                }
            } else if (text !== undefined && text.enabled) {
                x0 = vec3Buffer1[0];
                y0 = vec3Buffer1[1];

                if (x >= x0 - 20 && x <= x0 + 20 && y >= y0 - 20 && y <= y0 + 20) {
                    result.push(gameObject);
                }
            }
        }

        return result;
    };

    return CameraScript;
});

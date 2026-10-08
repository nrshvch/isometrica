import engine from "engine";
import * as glMatrix from "gl-matrix";
import Events from "events";
import View from "../view";

var events = {
  inputMove: 0,
  inputClick: 1,
  inputDragStart: 2,
  inputDragEnd: 3,
  inputDrag: 4,
  //{gameViewportX, gameViewportY, scale}, see Viewport#events.pinch
  inputPinchStart: 5,
  inputPinch: 6,
  inputPinchEnd: 7,
  //a second tap straight after the first, in the same spot - it comes
  //instead of that second tap's inputClick
  inputDoubleTap: 8,
};

//how soon after one tap the next makes it a double tap, and how near, in
//page pixels - a finger does not land twice on the same one
var DOUBLE_TAP_TIME = 300,
  DOUBLE_TAP_DISTANCE = 24;

function CameraScript() {
  engine.Component.call(this);

  var self = this,
    lastPointerPos = null,
    moveLen = null,
    isDrag = false,
    lastPointerDownEvent = null,
    //the tap before, while the next one could still make it a double
    lastTap = null;

  function tap(e) {
    var now = Date.now(),
      zoom = self.gameObject.camera.zoom,
      isDouble =
        lastTap !== null &&
        now - lastTap.time <= DOUBLE_TAP_TIME &&
        Math.sqrt(
          Math.pow((e.gameViewportX - lastTap.x) * zoom, 2) +
            Math.pow((e.gameViewportY - lastTap.y) * zoom, 2),
        ) <= DOUBLE_TAP_DISTANCE;

    if (isDouble) {
      //a third tap starts over rather than making another double
      lastTap = null;
      self.dispatchEvent(self.events.inputDoubleTap, e);
    } else {
      lastTap = { time: now, x: e.gameViewportX, y: e.gameViewportY };
      self.dispatchEvent(self.events.inputClick, e);
    }
  }

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
      } else tap(e);

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

      if (
        !isDrag &&
        Math.sqrt(Math.pow(moveLen[0], 2) + Math.pow(moveLen[1], 2)) > 2
      ) {
        isDrag = true;
        //a tap, a drag and a tap is no double tap
        lastTap = null;
        self.dispatchEvent(self.events.inputDragStart, lastPointerDownEvent);
      }

      if (isDrag)
        self.dispatchEvent(self.events.inputDrag, { e: e, dx: x, dy: y });
    }

    self.dispatchEvent(self.events.inputMove, e);
  };

  this.onPointerOut = function (sender, e) {
    if (lastPointerPos !== null) {
      moveLen = null;
      lastPointerPos = null;

      if (isDrag) self.dispatchEvent(self.events.inputDragEnd, e);
    }
  };

  this.onPinchStart = function (sender, e) {
    lastTap = null;
    self.dispatchEvent(self.events.inputPinchStart, e);
  };

  this.onPinch = function (sender, e) {
    self.dispatchEvent(self.events.inputPinch, e);
  };

  this.onPinchEnd = function (sender, e) {
    self.dispatchEvent(self.events.inputPinchEnd, e);
  };
}

CameraScript.events = events;

CameraScript.prototype = Object.create(engine.Component.prototype);

CameraScript.prototype.events = events;
CameraScript.prototype.constructor = CameraScript;

var tmpctx = document.createElement("canvas").getContext("2d"),
  vec3Buffer1 = new Float32Array(3),
  vec3Buffer2 = new Float32Array(3),
  COS45 = Math.cos((45 * Math.PI) / 180);

tmpctx.canvas.width = 256;
tmpctx.canvas.height = 256;

/**
 * Whether x, y lands on the text drawn at x0, y0 - the box it takes up, as
 * wide as it is measured to be and as tall as its font, laid out the way
 * TextRenderer draws it. A label several lines tall is only known roughly,
 * by the box around the point it hangs off.
 */
function textHit(text, x0, y0, x, y) {
  if (text.lines !== undefined)
    return x >= x0 - 20 && x <= x0 + 20 && y >= y0 - 20 && y <= y0 + 20;

  tmpctx.font = text.style;

  var size = /(\d+)px/.exec(text.style),
    //the outline sticks out past the letters by half its width
    pad = text.strokeStyle ? (text.lineWidth || 4) / 2 : 0,
    w = tmpctx.measureText(text.text).width + 2 * pad,
    h = (size !== null ? +size[1] : 12) + 2 * pad,
    left =
      text.align === "left" || text.align === "start"
        ? x0
        : text.align === "right" || text.align === "end"
          ? x0 - w
          : x0 - w / 2,
    top =
      text.valign === "top" || text.valign === "hanging"
        ? y0
        : text.valign === "middle"
          ? y0 - h / 2
          : y0 - h;

  return x >= left && x <= left + w && y >= top && y <= top + h;
}

/**
 * @type {Transform}
 */
CameraScript.prototype.target = null;

CameraScript.prototype.onTargetUpdate = null;
CameraScript.prototype.onPointerMove = null;
CameraScript.prototype.onPointerDown = null;
CameraScript.prototype.onPointerUp = null;
CameraScript.prototype.onPointerOut = null;
CameraScript.prototype.onPinchStart = null;
CameraScript.prototype.onPinch = null;
CameraScript.prototype.onPinchEnd = null;
CameraScript.prototype.panSens = 1;
CameraScript.prototype._lock = false;

CameraScript.prototype.lock = function (l) {
  if (l === undefined) return this._lock;

  this._lock = l;
};

CameraScript.prototype.awake = function () {
  var camera = this.gameObject.camera,
    self = this;

  camera.addEventListener(camera.events.viewportSet, function (camera) {
    var viewport = camera.viewport;

    Events.on(viewport, viewport.events.pointerdown, self.onPointerDown);
    Events.on(viewport, viewport.events.pointerup, self.onPointerUp);
    Events.on(viewport, viewport.events.pointermove, self.onPointerMove);
    Events.on(viewport, viewport.events.pointerout, self.onPointerOut);
    Events.on(viewport, viewport.events.pinchstart, self.onPinchStart);
    Events.on(viewport, viewport.events.pinch, self.onPinch);
    Events.on(viewport, viewport.events.pinchend, self.onPinchEnd);
  });

  camera.addEventListener(camera.events.viewportRemoved, function (camera) {
    var viewport = camera.viewport;

    viewport.removeEventListener(
      viewport.events.pointerdown,
      self.onPointerDown,
    );
    viewport.removeEventListener(viewport.events.pointerup, self.onPointerUp);
    viewport.removeEventListener(
      viewport.events.pointermove,
      self.onPointerMove,
    );
    viewport.removeEventListener(viewport.events.pointerout, self.onPointerOut);
    viewport.removeEventListener(viewport.events.pinchstart, self.onPinchStart);
    viewport.removeEventListener(viewport.events.pinch, self.onPinch);
    viewport.removeEventListener(viewport.events.pinchend, self.onPinchEnd);
  });

  //this.gameObject.transform.setPosition(11585, 0, 15609);
  //this.gameObject.transform.setPosition(2784.961181640625, 0, 3594.453369140625);
  this.gameObject.transform.setPosition(1000000.123, 0, 1000000.645);
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
    };

    targetTransform.addEventListener(
      targetTransform.events.update,
      this.onTargetUpdate,
    );
  }
};

CameraScript.prototype.unsetTarget = function () {
  if (this.target !== null) {
    var targetTransform = this.target.gameObject.transform;

    this.target = null;

    targetTransform.removeEventListener(
      targetTransform.events.update,
      this.onTargetUpdate,
    );
  }
};

CameraScript.prototype.moveTo = function (transform) {
  var pos = transform.getPosition();
  this.gameObject.transform.setPosition(pos[0], 0, pos[2]);
};

CameraScript.prototype.pan = function (x, y) {
  if (this._lock) return;

  //the way along the ground that goes that way on screen as it is seen,
  //and in the world, the camera turned (see client/view)
  var d = View.unvector(
    (-x * COS45 + y / COS45) / this.panSens,
    (x * COS45 + y / COS45) / this.panSens,
  );

  this.gameObject.transform.translate(d[0], 0, d[1], "world");
};

//how far the camera turns about the up axis for a quarter turn of the view,
//in degrees, the way client/view counts them
var TURN = -90;

/**
 * Turns the camera round by so many quarter turns about the ground in the
 * middle of the screen, which stays there - and the order things are drawn
 * in with it (CameraComponent#depthAxes). The world is seen from another
 * side; client/view tells what is seen of what from there.
 */
CameraScript.prototype.turn = function (by) {
  var transform = this.gameObject.transform,
    pos = transform.getPosition(),
    camera = this.gameObject.camera;

  transform.setPosition(0, 0, 0);
  transform.rotate(0, TURN * by, 0, "world");
  transform.setPosition(pos[0], pos[1], pos[2]);

  View.setTurns(View.turns() + by);

  //away from the camera along the ground as it is seen: away unturned
  var away = View.unvector(1, 1);

  camera.depthAxes = [away[0], -1, away[1]];
};

/**
 * Zooms, keeping the ground that is at x, y on screen right there - the spot
 * between the fingers, or under the pointer - or else the middle of it.
 *
 * @param [zoom] {number} see engine CameraComponent#zoom
 * @param [x] {number} in viewport pixels at the zoom it is at now
 * @param [y] {number}
 * @returns {number|undefined} the zoom it is at, when not given one
 */
CameraScript.prototype.zoom = function (zoom, x, y) {
  var camera = this.gameObject.camera,
    from = camera.zoom,
    viewport = camera.viewport;

  if (zoom === undefined) return from;

  if (zoom === from || this._lock) return;

  if (viewport === null || x === undefined) {
    camera.setZoom(zoom);
    return;
  }

  //how far off the middle of the screen it is, in page pixels, which
  //are the ones that stay where they are
  var dx = (x - viewport.width / 2) * from,
    dy = (y - viewport.height / 2) * from;

  camera.setZoom(zoom);

  //the camera zooms about the middle, so that ground is still dx / from
  //of its pixels off it - and pixels of a new size, of which it should
  //be dx / zoom
  this.pan(dx / zoom - dx / from, dy / zoom - dy / from);
};

CameraScript.prototype.pickGameObject = function (x, y, resultArray) {
  var vec3 = glMatrix.vec3,
    gameObjects = this.gameObject.world.retrieve(this.gameObject),
    len = gameObjects.length,
    gameObject,
    camera = this.gameObject.camera,
    wTs = camera.getWorldToScreen(),
    wTv = camera.getWorldToViewport(),
    sprite,
    text,
    x0,
    y0,
    x1,
    y1,
    result = resultArray || [];

  for (var i = 0; i < len; i++) {
    gameObject = gameObjects[i];

    gameObject.transform.getPosition(vec3Buffer1);

    //skip objects that lay outside of screen
    vec3.transformMat4(vec3Buffer2, vec3Buffer1, wTv);
    if (Math.abs(vec3Buffer2[0]) > 1 || Math.abs(vec3Buffer2[1]) > 1) continue;

    vec3.transformMat4(vec3Buffer1, vec3Buffer1, wTs);

    sprite = gameObject.spriteRenderer;
    text = gameObject.textRenderer;

    if (sprite !== undefined && sprite.enabled) {
      var spriteImage = sprite.sprite;

      x0 = vec3Buffer1[0] - sprite.pivotX;
      y0 = vec3Buffer1[1] - sprite.pivotY;
      x1 = x0 + spriteImage.width;
      y1 = y0 + spriteImage.height;

      //fast & inaccurate test - then the pixel itself, of a picture that is
      //there to look at
      if (
        x >= x0 &&
        x <= x1 &&
        y >= y0 &&
        y <= y1 &&
        spriteImage.acquire !== undefined &&
        spriteImage.acquire()
      ) {
        //detailed test: the pixel itself, on the page the picture is on
        if (
          vkaria.sprites.cache.alphaAt(
            spriteImage.sourceImage,
            spriteImage.offsetX + Math.floor(x - x0),
            spriteImage.offsetY + Math.floor(y - y0),
          ) > 0
        ) {
          result.push(gameObject);
        }
      }
    } else if (text !== undefined && text.enabled) {
      if (textHit(text, vec3Buffer1[0], vec3Buffer1[1], x, y)) {
        result.push(gameObject);
      }
    }
  }
  return result;
};

export default CameraScript;

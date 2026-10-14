/**
 * Turning the camera round the city, between one side of the world and the
 * next, shown as one smooth turn about the ground in the middle of the
 * screen - though the city is only ever drawn from its four sides.
 *
 * For the while, a picture of the city is laid over the game, the game
 * going on under it unseen: the side the camera is on, and the next side it
 * turns to, each drawn once - OVER more of it than the screen shows, without
 * the rain or the lightning - and kept. Each is turned as the ground would
 * be, seen from where the camera is - a map lying on a table turned about
 * the spot in the middle of it, which keeps its place - the one going over
 * into the other halfway, blurred the more the further from either side, so
 * that what turning a flat picture cannot get right goes unseen. Over it, a
 * ring on the ground round the middle of the screen with north marked on
 * it, and the square of ground in the middle, turning with it all - for the
 * eye to keep track of where it was looking and which way it went.
 *
 * Done, the camera is on the side the turn ended on and the picture goes,
 * showing the game drawn from there.
 *
 * Nothing else of the game knows about it but that it is told when a frame
 * has been drawn and can have the weather held calm for a frame
 * (client/lighting onFrame, calm), and that the camera control drives it
 * (client/cameracontrol).
 */
import View from "./view";

//how much more of the city each picture of it takes in than the screen
//shows, across and down - for its corners to stay covered as it turns
var OVER = 1.5;

//how long a turn from Q or E takes, how long a turn takes to settle on the
//nearest side once the fingers let go, and how long the picture takes to
//fade into the game, ms
var TURN_MS = 450,
  SETTLE_MS = 220,
  FADE_MS = 120;

//how many frames the game is let draw after it turns, or zooms out, before
//a picture is taken - no time to wait for whatever it has still to paint:
//the picture of the side the camera is on is taken again every REFRESH
//frames while the turn lasts, for what comes in late to be in it
var WAIT = 2,
  REFRESH = 4;

//how blurred the picture is halfway between two sides, page pixels
var BLUR = 3;

//how big the ring on the ground is, as a share of the screen's narrower
//side, and the square of ground in the middle
var RING = 0.16,
  SQUARE = 0.025;

//where a way along the ground is on the screen - across x - y, down
//(x + y) / 2 - and back
function project(x, y) {
  return [x - y, (x + y) / 2];
}

/* 2D affine transforms: [a, b, c, d, e, f] for x' = a x + c y + e,
 * y' = b x + d y + f, as CSS's matrix() */

function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function move(x, y) {
  return [1, 0, 0, 1, x, y];
}

function scale(k) {
  return [k, 0, 0, k, 0, 0];
}

/**
 * The ground turned deg degrees, as it is seen: from the screen to the
 * ground (the inverse of project), turned, and back - a quarter turn the
 * way the camera turns by View +1.
 */
function turned(deg) {
  var a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a),
    toGround = [0.5, -0.5, 1, 1, 0, 0],
    turn = [c, s, -s, c, 0, 0],
    toScreen = [1, 0.5, -1, 0.5, 0, 0];

  return mul(toScreen, mul(turn, toGround));
}

function css(m) {
  return "matrix(" + m.join(",") + ")";
}

function smooth(k) {
  k = Math.max(0, Math.min(1, k));

  return k * k * (3 - 2 * k);
}

/**
 * @param root {Vkaria}
 */
function Turner(root) {
  this.root = root;
  this.active = false;
}

Turner.prototype.camera = function () {
  return this.root.camera.cameraScript;
};

Turner.prototype.viewport = function () {
  return this.camera().gameObject.camera.viewport;
};

/**
 * Starts a turn from the side the camera is on: the picture laid over the
 * game - as soon as the game has drawn the next frame - and the pictures
 * taken of the city.
 */
Turner.prototype.begin = function () {
  var viewport = this.viewport(),
    lighting = this.root.lighting;

  if (this.active || !viewport || !lighting) return;

  var self = this,
    canvas = viewport.canvas;

  this.active = true;
  //the zoom it is drawn at, and the side it starts from
  this.zoom = this.camera().zoom();
  this.base = View.turns();
  //where the camera is now, a quarter turn at a time from there
  this.at = 0;
  this.zoomedOut = false;
  //how far it is turned, how much bigger it is shown about where - the
  //fingers pinching - and the pictures by the side they are of
  this.deg = 0;
  this.grow = 1;
  this.pivot = [canvas.offsetWidth / 2, canvas.offsetHeight / 2];
  this.pictures = {};
  //the picture being taken, and those to take after it
  this.job = { side: 0, wait: 0, quick: true };
  this.queue = [0];
  this.ending = null;

  this.build(canvas);
  lighting.onFrame = function () {
    self.frame();
  };
};

//what is laid over the game: the pictures, blurred, in a box the size and
//place of the game's own canvas; over them, the ring and the square
Turner.prototype.build = function (canvas) {
  var box = document.createElement("div"),
    blurred = document.createElement("div"),
    marks = document.createElement("canvas"),
    w = canvas.offsetWidth,
    h = canvas.offsetHeight,
    ratio = window.devicePixelRatio || 1;

  box.style.cssText =
    "position:absolute;overflow:hidden;pointer-events:none;" +
    "background:#1b1f24;visibility:hidden;" +
    "left:" +
    canvas.offsetLeft +
    "px;top:" +
    canvas.offsetTop +
    "px;width:" +
    w +
    "px;height:" +
    h +
    "px;transition:opacity " +
    FADE_MS +
    "ms linear";
  blurred.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%";
  marks.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
  marks.width = Math.round(w * ratio);
  marks.height = Math.round(h * ratio);

  box.appendChild(blurred);
  box.appendChild(marks);
  canvas.parentNode.insertBefore(box, canvas.nextSibling);

  //what stands over the canvas - the buttons, the bar at the top - kept
  //over the picture too
  this.raised = [].filter.call(canvas.parentNode.children, function (el) {
    return el !== canvas && el !== box && el.style.zIndex === "";
  });
  this.raised.forEach(function (el) {
    el.style.zIndex = "1";
  });

  this.box = box;
  this.blurred = blurred;
  this.marks = marks;
  this.size = [w, h];
  this.ratio = ratio;
};

/**
 * The game has drawn a frame: a picture taken of it, if one is due, and the
 * next one set up - the camera on that side, zoomed out to take in OVER
 * more - and once there is nothing more to take, the camera back to its
 * zoom; and the turn done with, if it is ending.
 */
Turner.prototype.frame = function () {
  var job = this.job;

  if (job !== null) {
    if (job.wait-- > 0) return;

    this.take(job.side);
    this.job = null;
  }

  while (this.queue.length > 0 && this.job === null) {
    var side = this.queue.shift();

    if (this.pictures[side] && !this.pictures[side].quick) continue;

    if (!this.zoomedOut) {
      this.camera().zoom(this.zoom / OVER);
      this.zoomedOut = true;
    }

    this.turnTo(side);
    this.job = { side: side, wait: WAIT };
    this.root.lighting.calm = true;
  }

  if (this.job !== null) return;

  //all there is taken: the side the camera is on again, in a while
  if (this.ending === null && this.zoomedOut) {
    this.job = { side: this.at, wait: REFRESH };
    return;
  }

  this.root.lighting.calm = false;

  if (this.zoomedOut) {
    this.camera().zoom(this.zoom);
    this.zoomedOut = false;
  }

  if (this.ending !== null && this.ending.settled) this.close();
};

//the camera turned to side, a quarter turn at a time from where it started
Turner.prototype.turnTo = function (side) {
  if (side !== this.at) this.root.turnView(side - this.at);
  this.at = side;
};

//a picture of the side the camera is on, from the frame just drawn - the
//first, quick, of what is on the screen, for the turn to start from
Turner.prototype.take = function (side) {
  var viewport = this.viewport(),
    source = viewport.canvas,
    old = this.pictures[side],
    picture = document.createElement("canvas"),
    zoom = this.camera().zoom();

  picture.width = source.width;
  picture.height = source.height;
  picture.getContext("2d").drawImage(source, 0, 0);
  picture.style.cssText =
    "position:absolute;left:0;top:0;transform-origin:0 0;" +
    (zoom > 1 ? "image-rendering:pixelated;" : "") +
    "width:" +
    source.width * zoom +
    "px;height:" +
    source.height * zoom +
    "px";

  if (old) this.blurred.removeChild(old.el);
  this.blurred.appendChild(picture);
  this.pictures[side] = {
    el: picture,
    zoom: zoom,
    w: source.width * zoom,
    h: source.height * zoom,
    quick: this.job !== null && this.job.quick === true,
  };

  this.box.style.visibility = "visible";
  this.show();
};

/**
 * How it is shown: turned deg degrees from the side it started on - +90
 * the next side round, as View +1 - and grow times bigger than the zoom it
 * started at, about x, y on the screen (the fingers pinching).
 */
Turner.prototype.view = function (deg, grow, x, y) {
  if (!this.active || this.ending !== null) return;

  this.deg = deg;
  this.grow = grow === undefined ? 1 : grow;
  if (x !== undefined) this.pivot = [x, y];

  //the pictures of the two sides it is between, to be taken
  var k = Math.floor(deg / 90);

  this.want(k);
  this.want(k + 1);
  this.show();
};

Turner.prototype.want = function (side) {
  if (!this.pictures[side] && this.queue.indexOf(side) === -1)
    this.queue.push(side);
};

//the pictures and the marks over them, as the turn is now
Turner.prototype.show = function () {
  var w = this.size[0],
    h = this.size[1],
    cx = w / 2,
    cy = h / 2,
    deg = this.deg,
    k = Math.floor(deg / 90),
    t = deg / 90 - k,
    //the next side's picture coming in over this side's, halfway
    mixed = smooth((t - 0.35) / 0.3),
    pinch = mul(
      move(this.pivot[0], this.pivot[1]),
      mul(scale(this.grow), move(-this.pivot[0], -this.pivot[1])),
    ),
    shown = 0;

  for (var key in this.pictures) {
    var side = +key,
      p = this.pictures[key],
      alpha =
        side === k
          ? this.pictures[k + 1]
            ? 1 - mixed
            : 1
          : side === k + 1
            ? this.pictures[k]
              ? mixed
              : 1
            : 0;

    p.el.style.opacity = alpha;
    if (alpha <= 0) continue;

    shown++;
    //its middle on the middle of the screen, as big as the zoom it started
    //at, turned from the side it is of
    var m = mul(
      pinch,
      mul(
        move(cx, cy),
        mul(
          turned(deg - side * 90),
          mul(scale(this.zoom / p.zoom), move(-p.w / 2, -p.h / 2)),
        ),
      ),
    );

    p.el.style.transform = css(m);
  }

  //blurred the more the further from either side
  var off = Math.abs(Math.sin((deg * Math.PI) / 90));

  this.blurred.style.filter =
    off > 0.02 ? "blur(" + (BLUR * Math.pow(off, 0.7)).toFixed(2) + "px)" : "";

  this.mark(pinch, Math.min(1, off * 3));

  if (shown === 0) this.box.style.visibility = "hidden";
};

/**
 * The ring on the ground round the middle of the screen, north marked on
 * it, and the square of ground in the middle - turned with everything, as
 * clear as they are needed: not at all at either side, plainly by halfway.
 */
Turner.prototype.mark = function (pinch, alpha) {
  var g = this.marks.getContext("2d"),
    r = this.ratio,
    w = this.size[0],
    h = this.size[1],
    ring = Math.min(w, h) * RING,
    square = Math.min(w, h) * SQUARE,
    //the way north goes along the ground, from the side the turn started
    //on - turned by as much as the world is
    a = ((this.deg + this.base * 90) * Math.PI) / 180;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, this.marks.width, this.marks.height);

  if (alpha <= 0.01) return;

  g.setTransform(
    r * pinch[0],
    r * pinch[1],
    r * pinch[2],
    r * pinch[3],
    r * pinch[4],
    r * pinch[5],
  );
  g.translate(w / 2, h / 2);
  g.globalAlpha = alpha * 0.85;
  g.lineJoin = "round";

  function line(points, close) {
    g.beginPath();
    points.forEach(function (p, i) {
      if (i === 0) g.moveTo(p[0], p[1]);
      else g.lineTo(p[0], p[1]);
    });
    if (close) g.closePath();
  }

  function ground(x, y) {
    //turned by a about the middle, then onto the screen
    return project(
      x * Math.cos(a) - y * Math.sin(a),
      x * Math.sin(a) + y * Math.cos(a),
    );
  }

  var circle = [];

  for (var i = 0; i <= 48; i++) {
    var t = (i / 48) * Math.PI * 2;

    circle.push(ground(Math.cos(t) * ring, Math.sin(t) * ring));
  }

  var box = [
      ground(-square, -square),
      ground(square, -square),
      ground(square, square),
      ground(-square, square),
    ],
    north = [
      ground(-ring * 0.12, -ring * 0.92),
      ground(0, -ring * 1.25),
      ground(ring * 0.12, -ring * 0.92),
    ];

  //each drawn dark and wide, then light and narrow over it
  [
    ["rgba(0,0,0,0.6)", 4],
    ["#fff", 2],
  ].forEach(function (pen) {
    g.strokeStyle = pen[0];
    g.lineWidth = pen[1];
    line(circle, true);
    g.stroke();
    line(box, true);
    g.stroke();
  });

  line(north, true);
  g.fillStyle = "#fff";
  g.strokeStyle = "rgba(0,0,0,0.6)";
  g.lineWidth = 2;
  g.stroke();
  g.fill();

  var n = ground(0, -ring * 1.5);

  g.font = "bold 13px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 3;
  g.strokeText("N", n[0], n[1]);
  g.fillText("N", n[0], n[1]);
};

/**
 * Ends the turn: it settles on the nearest side - and, pinched, on the zoom
 * the fingers let go at, about where they were (zoom, x, y) - the camera
 * is put there, and the picture fades into the game drawn from there.
 */
Turner.prototype.end = function (zoom, x, y) {
  if (!this.active || this.ending !== null) return;

  var self = this,
    from = this.deg,
    to = Math.round(from / 90) * 90,
    grow = this.grow,
    goal = zoom === undefined ? 1 : zoom / this.zoom,
    start = performance.now();

  this.ending = { side: to / 90, zoom: zoom, x: x, y: y, settled: false };
  //nothing more to take: what there is of it will do
  this.queue.length = 0;
  if (this.job !== null && !this.pictures[this.job.side]) this.job.wait = 0;
  else this.job = null;

  function step() {
    var t = Math.min(1, (performance.now() - start) / SETTLE_MS),
      e = 1 - (1 - t) * (1 - t);

    self.deg = from + (to - from) * e;
    self.grow = grow + (goal - grow) * e;
    self.show();

    if (t < 1) requestAnimationFrame(step);
    else {
      //done once the game has drawn a frame
      self.ending.settled = true;
    }
  }

  requestAnimationFrame(step);
};

//the camera where the turn ended, the game drawn from there for a frame or
//two, and the picture faded away into it
Turner.prototype.close = function () {
  var self = this,
    e = this.ending,
    cam = this.camera();

  if (e.placed === undefined) {
    this.turnTo(e.side);
    if (e.zoom !== undefined && e.zoom !== cam.zoom())
      cam.zoom(e.zoom, e.x / this.zoom, e.y / this.zoom);
    e.placed = WAIT;
    return;
  }

  if (e.placed-- > 0) return;

  this.root.lighting.onFrame = null;
  this.box.style.opacity = "0";
  setTimeout(function () {
    if (self.box.parentNode) self.box.parentNode.removeChild(self.box);
    self.raised.forEach(function (el) {
      el.style.zIndex = "";
    });
    self.active = false;
  }, FADE_MS);
  this.ending = null;
  this.pictures = {};
};

/**
 * A quarter turn of the world - by 1 or -1 - from Q or E, over TURN_MS.
 */
Turner.prototype.turn = function (by) {
  if (this.active) return;

  var self = this,
    start = performance.now();

  this.begin();
  if (!this.active) {
    this.root.turnView(by);
    return;
  }

  //the side it turns to first, needed by halfway
  this.queue.unshift(by);

  function step() {
    var t = Math.min(1, (performance.now() - start) / TURN_MS),
      e = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);

    self.view(by * 90 * e);

    if (t < 1) requestAnimationFrame(step);
    else self.end();
  }

  requestAnimationFrame(step);
};

export default Turner;

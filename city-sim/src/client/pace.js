/**
 * How often the world is drawn: as often as the game draws it at most
 * (engine Game fps, 30 a second) while anything is going on, and fewer
 * times while less is - easier on a phone's battery. Whatever moves goes by
 * the time gone, not by the frames, so it moves as far in a second either
 * way, only less smoothly.
 *
 * What asks for fewer, each for its own reason (RATE), the fewest of them
 * kept to: a screen over the world, which is only seen dimmed and blurred
 * behind it; and the world left alone a while - no touch, click, key nor
 * wheel - though never while a finger or a button is still held down, an
 * edge of the screen panning the map under it; and a battery running low,
 * not charging, where the browser tells (navigator.getBattery).
 */

//how many frames a second the world is drawn at, at most: as a rule, and
//for each reason there is for fewer
var FULL = 30,
  RATE = {
    covered: 10,
    idle: 20,
    battery: 20,
  };

//how low a battery runs, 0..1, for it to be low
var LOW = 0.2;

//how long it is left alone before it is taken to be idle, ms; and what
//says it is not
var IDLE_AFTER = 10000,
  INPUT = ["pointerdown", "pointermove", "pointerup", "wheel", "keydown"];

/**
 * @param game {engine.Game} the game whose frames it paces
 */
function Pace(game) {
  this.game = game;
  //which reasons for fewer frames there are just now, by name
  this.asked = {};
  //and the one kept to, or null
  this.why = null;
  //when it was last not left alone, and which pointers are held down; and
  //what waits to see whether it is left alone by then
  this.lastInput = performance.now();
  this.down = new Set();
  this.timer = null;
  watchInput(this);
  watchBattery(this);
}

/**
 * Whether there is a reason for fewer frames, or not any more.
 *
 * @param reason {string} one of RATE
 * @param yes {boolean}
 */
Pace.prototype.ask = function (reason, yes) {
  this.asked[reason] = !!yes;
  set(this);
};

/**
 * Listens for anything said to it - a touch, a click, a key, the wheel -
 * from wherever on the page, before anything else hears it: each puts it
 * back to every frame there is, and starts the wait to be idle again.
 */
function watchInput(self) {
  function input() {
    self.lastInput = performance.now();
    if (self.asked.idle) self.ask("idle", false);
    if (self.timer === null) idleIn(self, IDLE_AFTER);
  }

  INPUT.forEach(function (type) {
    window.addEventListener(type, input, { capture: true, passive: true });
  });

  window.addEventListener(
    "pointerdown",
    function (e) {
      self.down.add(e.pointerId);
    },
    true,
  );
  ["pointerup", "pointercancel"].forEach(function (type) {
    window.addEventListener(
      type,
      function (e) {
        self.down.delete(e.pointerId);
      },
      true,
    );
  });
  //a pointer let go of outside the window is never heard of again
  window.addEventListener("blur", function () {
    self.down.clear();
  });

  idleIn(self, IDLE_AFTER);
}

//idle once ms have gone by - if nothing has been said to it meanwhile, nor
//anything is held down; else it waits on
function idleIn(self, ms) {
  self.timer = setTimeout(function () {
    var left = IDLE_AFTER - (performance.now() - self.lastInput);

    self.timer = null;

    if (self.down.size > 0) idleIn(self, IDLE_AFTER);
    else if (left > 0) idleIn(self, left);
    else self.ask("idle", true);
  }, ms);
}

/**
 * Listens to the battery, where the browser tells of it: low and not
 * charging, fewer frames - plugged in, or charged up again, every frame
 * there is.
 */
function watchBattery(self) {
  if (typeof navigator === "undefined" || !navigator.getBattery) return;

  navigator.getBattery().then(
    function (battery) {
      function check() {
        self.ask("battery", !battery.charging && battery.level <= LOW);
      }

      battery.addEventListener("levelchange", check);
      battery.addEventListener("chargingchange", check);
      check();
    },
    function () {
      //not to be had: as if plugged in
    },
  );
}

//the fewest frames a second there is a reason for, kept to
function set(self) {
  var fps = FULL,
    why = null;

  for (var reason in RATE)
    if (self.asked[reason] && RATE[reason] < fps) {
      fps = RATE[reason];
      why = reason;
    }

  self.game.fps = fps;
  self.why = why;
}

export default Pace;

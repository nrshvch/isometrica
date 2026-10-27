/**
 * How often the world is drawn: as often as the game draws it at most
 * (engine Game fps, 30 a second) while anything is going on, and fewer
 * times while less is - easier on a phone's battery. Whatever moves goes by
 * the time gone, not by the frames, so it moves as far in a second either
 * way, only less smoothly.
 *
 * What asks for fewer, each for its own reason (RATE), the fewest of them
 * kept to: a screen over the world, which is only seen dimmed and blurred
 * behind it.
 */

//how many frames a second the world is drawn at, at most: as a rule, and
//for each reason there is for fewer
var FULL = 30,
  RATE = {
    covered: 10,
  };

/**
 * @param game {engine.Game} the game whose frames it paces
 */
function Pace(game) {
  this.game = game;
  //which reasons for fewer frames there are just now, by name
  this.asked = {};
  //and the one kept to, or null
  this.why = null;
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

/**
 * The music under the game (shared/gen/music): the piece for where the eye
 * is and the time of day - "town/day", "city/night", ... - all three of its
 * weathers playing at once in time with each other, the weather there is
 * turning one up and the others down, so the music picks up into a storm
 * and goes lazy in the rain without missing a beat. A new place or time
 * fades over into its own piece once it is made - and only once it has
 * stayed that way a while, so a look over the edge of town does not change
 * the tune.
 */
import * as Music from "../../shared/gen/music.js";

//how long a new piece takes to fade in over the old one, and how long the
//weather takes to follow; how long a new place or time has to hold before
//its piece is played, s
var PIECE_FADE = 5,
  WEATHER_FOLLOW = 2.5,
  HOLD = 6;

/**
 * @param context {AudioContext}
 * @param maker {Maker} what makes it (client/audio/maker)
 * @param out {AudioNode} where it plays to
 */
export default function MusicPlayer(context, maker, out) {
  this.context = context;
  this.maker = maker;
  this.out = out;
  this.playing = null;
  this.wanted = null;
  this.since = 0;
  this.making = null;
  this.mix = [1, 0, 0];
}

/**
 * How much of each of the weathers the music is played in - clear, rain,
 * storm, adding up to 1 - for the weather there is (client/weather): a
 * storm the storm, rain or a grey sky the lazy one.
 */
MusicPlayer.mixOf = function (w) {
  var storm = Math.min(1, Math.max(0, (w.storm - 0.25) / 0.5)),
    grey = Math.min(
      1,
      Math.max(0, w.rain * 1.6, (w.cloud - 0.6) * 1.8, (w.fog - 0.3) * 1.4),
    ),
    rain = grey * (1 - storm);

  return [Math.max(0, 1 - storm - rain), rain, storm];
};

/**
 * Called every so often: the place there is to play for ("town", "city",
 * "outside"), the time ("day", "night"), and the weather.
 */
MusicPlayer.prototype.update = function (place, time, weather) {
  var key = place + "/" + time,
    now = this.context.currentTime;

  this.mix = MusicPlayer.mixOf(weather);

  if (key !== this.wanted) {
    this.wanted = key;
    this.since = now;
  }

  var current = this.playing && this.playing.key;

  if (
    key !== current &&
    this.making !== key &&
    (current === null || now - this.since >= HOLD)
  )
    this.make(key);

  if (this.playing) this.follow(WEATHER_FOLLOW);
};

MusicPlayer.prototype.make = function (key) {
  var self = this;

  this.making = key;

  Promise.all(
    Music.WEATHERS.map(function (w) {
      return self.maker.get("music", key + "/" + w);
    }),
  ).then(
    function (buffers) {
      if (self.making === key) self.making = null;
      if (self.wanted === key) self.play(key, buffers);
    },
    function () {
      if (self.making === key) self.making = null;
    },
  );
};

MusicPlayer.prototype.play = function (key, buffers) {
  var ctx = this.context,
    at = ctx.currentTime + 0.1,
    master = ctx.createGain(),
    old = this.playing,
    self = this;

  master.gain.setValueAtTime(0, at);
  master.gain.linearRampToValueAtTime(1, at + (old ? PIECE_FADE : 2));
  master.connect(this.out);

  this.playing = {
    key: key,
    master: master,
    gains: [],
    sources: [],
  };

  buffers.forEach(function (buf, i) {
    var source = ctx.createBufferSource(),
      gain = ctx.createGain();

    source.buffer = buf;
    source.loop = true;
    gain.gain.value = Math.sqrt(self.mix[i]);
    source.connect(gain);
    gain.connect(master);
    source.start(at);
    self.playing.sources.push(source);
    self.playing.gains.push(gain);
  });

  if (old) this.fadeOut(old, PIECE_FADE);
};

//the weathers turned up and down to how they are wanted, over about `t` s
MusicPlayer.prototype.follow = function (t) {
  var now = this.context.currentTime,
    mix = this.mix;

  this.playing.gains.forEach(function (g, i) {
    //equal power, so the music is as loud halfway between two of them
    g.gain.setTargetAtTime(Math.sqrt(mix[i]), now, t / 3);
  });
};

MusicPlayer.prototype.fadeOut = function (p, fade) {
  var now = this.context.currentTime;

  p.master.gain.cancelScheduledValues(now);
  p.master.gain.setValueAtTime(p.master.gain.value, now);
  p.master.gain.linearRampToValueAtTime(0, now + fade);
  p.sources.forEach(function (s) {
    s.stop(now + fade + 0.1);
  });
  setTimeout(
    function () {
      p.master.disconnect();
    },
    (fade + 0.5) * 1000,
  );
};

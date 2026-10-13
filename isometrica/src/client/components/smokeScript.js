import engine from "engine";

/**
 * A puff of smoke, from the moment it comes out to when it is gone: it grows
 * through the pictures painted for it (shared/gen/smoke), rises - slower and
 * slower as it cools - drifts off the way the wind blows, the higher the
 * more, and fades in as it comes out and away again as it thins.
 */
function SmokeScript() {
  engine.Component.call(this);
}

SmokeScript.prototype = Object.create(engine.Component.prototype);

//the pictures a puff grows through, one after another, by what it is
function frames(kind) {
  var out = [];

  for (var f = 0; f < 6; f++) out.push("gen/smoke/" + kind + f);

  return out;
}

/**
 * How a kind of smoke goes: its pictures, how long a puff lasts (ms), how
 * fast it rises as it comes out (world units a second), how far up its life
 * it is at its thickest, and how thick that is (0..1).
 */
//white, out of a chimney: lazy, slow, and see-through
SmokeScript.steam = {
  looks: frames("steam"),
  ttl: 6500,
  rise: 5.5,
  peak: 0.12,
  thick: 0.8,
};

//black, out of an engine on fire: quicker and thicker - greyer and thinner
//the higher it gets
SmokeScript.soot = {
  looks: frames("soot"),
  ttl: 3600,
  rise: 11,
  peak: 0.08,
  thick: 0.9,
};

//what it is
SmokeScript.prototype.kind = SmokeScript.steam;
SmokeScript.prototype.startedAt = 0;
SmokeScript.prototype.frame = -1;

/**
 * Which way the wind blows, the same for every puff there is - turning a
 * little now and then - and how hard: world units a second, along x and z.
 */
var WIND = 2.6;

function wind(now) {
  var a = 0.7 + Math.sin(now / 90000) * 0.5 + Math.sin(now / 23000) * 0.15;

  return [Math.cos(a) * WIND, Math.sin(a) * WIND];
}

//runs every time the puff is put back into the world out of the pool, and
//only the first time gives it something to be drawn with
SmokeScript.prototype.start = function () {
  var sprite = this.gameObject.spriteRenderer;

  if (sprite === undefined) {
    sprite = this.gameObject.addComponent(new engine.SpriteRenderer());
    sprite.layer = vkaria.layers.buildingsLayer;
    //see-through a pixel at a time, dithered the way the lamps' light is,
    //rather than blended over what is behind it (client/glview)
    sprite.dither = true;
  }

  this.frame = -1;
  this.startedAt = this.gameObject.world.logic.time.time;
  this.show(0);
};

//shows the picture for f of the way through its life, and as see-through
//as it is then
SmokeScript.prototype.show = function (t) {
  var kind = this.kind,
    sprite = this.gameObject.spriteRenderer,
    f = Math.min(kind.looks.length - 1, Math.floor(t * kind.looks.length));

  if (f !== this.frame) {
    var picture = vkaria.sprites.getSprite(kind.looks[f]);

    this.frame = f;
    sprite.setSprite(picture);
    //held by its middle
    sprite.setPivot(picture.width >> 1, picture.height >> 1);
  }

  //thickening as it comes out, thinning away to nothing after - slowly at
  //first, then faster as it spreads
  sprite.opacity =
    kind.thick *
    (t < kind.peak
      ? t / kind.peak
      : 1 - Math.pow((t - kind.peak) / (1 - kind.peak), 1.6));
};

SmokeScript.prototype.tick = function (time) {
  var kind = this.kind,
    now = this.gameObject.world.logic.time.time,
    t = (now - this.startedAt) / kind.ttl;

  if (t >= 1) {
    this.gameObject.destroy();
    return;
  }

  var d = time.dt / 1000,
    w = wind(now),
    //the higher, the slower it rises and the more the wind has it
    rise = kind.rise * (1 - 0.65 * t),
    blown = 0.3 + t;

  this.gameObject.transform.translate(
    w[0] * blown * d,
    rise * d,
    w[1] * blown * d,
    "world",
  );

  this.show(t);
};

export default SmokeScript;

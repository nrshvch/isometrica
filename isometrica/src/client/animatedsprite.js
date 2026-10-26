//A picture that moves by itself - the sea's waves: a few CachedSprites, the
//frames of a round, shown one after another by the clock, each for so long.
//Whatever draws it draws it as it would any picture (engine SpriteRenderer
//acquires it, client/cachedsprite glQuad), and is handed the frame of the
//moment - so nothing has to be told when the frame changes. The frames not
//showing are kept on their pages, or the round would paint them over and over.
//A frame not painted yet when its turn comes - the sea coming on the screen
//for the first time, the frames painted a few at a time - leaves the one
//shown last up till it is, rather than the water gone black.

/**
 * @param frames {CachedSprite[]} in the order they are shown, all one size
 * @param ms {number} how long each is shown
 */
function AnimatedSprite(frames, ms) {
  this.frames = frames;
  this.ms = ms;
  this.width = frames[0].width;
  this.height = frames[0].height;
  this.sourceImage = null;
  this.offsetX = 0;
  this.offsetY = 0;
  //the frame last drawn, shown on while the one of the moment is not there
  //to be drawn
  this.shown = null;
}

//the frame of the moment, the others kept where they are
function current(self) {
  var frames = self.frames,
    now = frames[Math.floor(performance.now() / self.ms) % frames.length];

  for (var i = 0; i < frames.length; i++)
    if (frames[i] !== now) frames[i].keep();

  return now;
}

AnimatedSprite.prototype.acquire = function () {
  var frame = current(this);

  if (frame.acquire()) this.shown = frame;
  //not there yet: the one shown last, rather than nothing
  else if (this.shown === null || !this.shown.acquire()) return false;
  else frame = this.shown;

  this.sourceImage = frame.sourceImage;
  this.offsetX = frame.offsetX;
  this.offsetY = frame.offsetY;

  return true;
};

AnimatedSprite.prototype.keep = function () {
  for (var i = 0; i < this.frames.length; i++) this.frames[i].keep();
};

AnimatedSprite.prototype.nightLights = function () {
  return (this.shown || current(this)).nightLights();
};

//as the frame shown last is (client/cachedsprite hitAt)
AnimatedSprite.prototype.hitAt = function (x, y, lit) {
  return (this.shown || this.frames[0]).hitAt(x, y, lit);
};

AnimatedSprite.prototype.glQuad = function (renderer, flat, lit, night, d, o) {
  var frame = current(this);

  if (frame.glQuad(renderer, flat, lit, night, d, o)) {
    this.shown = frame;
    return true;
  }

  //not there yet: the one shown last, rather than nothing
  return (
    this.shown !== null && this.shown.glQuad(renderer, flat, lit, night, d, o)
  );
};

export default AnimatedSprite;

//A picture that moves by itself - the sea's waves: a few CachedSprites, the
//frames of a round, shown one after another by the clock, each for so long.
//Whatever draws it draws it as it would any picture (engine SpriteRenderer
//acquires it, client/cachedsprite lightPass), and is handed the frame of the
//moment - so nothing has to be told when the frame changes. The frames not
//showing are kept on their pages, or the round would paint them over and over.

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

  if (!frame.acquire()) return false;

  this.sourceImage = frame.sourceImage;
  this.offsetX = frame.offsetX;
  this.offsetY = frame.offsetY;

  return true;
};

AnimatedSprite.prototype.keep = function () {
  for (var i = 0; i < this.frames.length; i++) this.frames[i].keep();
};

AnimatedSprite.prototype.lightPass = function (pass, flat, renderer) {
  return current(this).lightPass(pass, flat, renderer);
};

export default AnimatedSprite;

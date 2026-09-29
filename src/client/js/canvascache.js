//The pictures being drawn, kept on a few big canvases - pages - instead of
//each on a canvas of its own. A page lives on the GPU the way any canvas
//does, so the pages are the game's picture memory, and there is only so much
//of it: at most maxPages of pageSize by pageSize.
//
//Only what is being drawn is on the pages. Whatever draws a picture acquires
//it first (see CachedSprite): the picture is painted onto a free piece of a
//page - a slot - the first time, and from then on only marked as drawn this
//frame. A picture nobody has drawn for a while keeps its slot until the slot
//is wanted for something else; only then is it evicted, least recently drawn
//first. Evicting is flipping the slot's state - its pixels are cleared by
//whoever is painted there next, not before.
//
//The cache knows nothing of what it holds. Whatever it holds - an entry - has
//a width, a height and paint(ctx, x, y), which puts its picture on a page at
//x, y; the cache writes where it put it back onto it (slot, sourceImage,
//offsetX, offsetY), and sets slot to -1 when it takes the slot away again.
//
//A page is cut into shelves, rows of one height across the page, and a shelf
//into slots along it. Everything about them is kept in typed arrays, indexed
//by shelf and by slot, so that nothing is allocated on the way to a frame.

//nothing between two slots would let the edge of one bleed into the next
var GAP = 1;
//shelves are as high as this many pixels at a time, so that pictures of about
//the same height share them
var STEP = 8;

//what a slot record is: holding an entry, waiting for one, or not a slot at
//all any more - its shelf was cleared, and the record is kept to be reused
var FREE = 0,
  TAKEN = 1,
  GONE = 2;

/**
 * @param clock {{frame: number}} counts the frames drawn - engine Time
 * @param options {Object} canvas(w, h), makes a page; pageSize, 1024 unless
 *        given; maxPages, 4 unless given
 */
function CanvasCache(clock, options) {
  this.clock = clock;
  this.makeCanvas = options.canvas;
  this.pageSize = options.pageSize || 1024;
  this.maxPages = options.maxPages || 4;

  this.pages = [];
  this.contexts = [];
  //where the next shelf of each page starts
  this.pageTop = new Uint16Array(this.maxPages);

  this.shelfCount = 0;
  this.shelfPage = new Uint8Array(16);
  this.shelfY = new Uint16Array(16);
  this.shelfH = new Uint16Array(16);
  //where the next slot of the shelf starts
  this.shelfX = new Uint16Array(16);
  //from where along the shelf nothing was ever painted - left of it, a slot
  //cut out of the shelf again may still have old pixels in it
  this.shelfClean = new Uint16Array(16);

  this.slotCount = 0;
  this.slotShelf = new Uint16Array(64);
  this.slotX = new Uint16Array(64);
  this.slotW = new Uint16Array(64);
  //the frame the entry in it was last drawn in
  this.slotUsed = new Int32Array(64);
  this.slotState = new Uint8Array(64);
  //1 while there are pixels in it that whoever comes next has to clear
  this.slotDirty = new Uint8Array(64);
  //what is in each slot
  this.owners = [];
  //the records of slots that are GONE, to be used again
  this.spare = [];

  //scratch for reclaim, one per shelf
  this.newest = new Int32Array(16);

  //the frame an allocation found no room in, so that no other one looks
  //again before the next
  this.failedAt = -1;

  this.painted = 0;
  this.evicted = 0;
}

/**
 * Makes sure the entry is on a page, marked as drawn this frame.
 *
 * @returns {boolean} false when there was no room for it
 */
CanvasCache.prototype.acquire = function (entry) {
  var frame = this.clock.frame,
    slot = entry.slot;

  if (slot >= 0) {
    this.slotUsed[slot] = frame;
    return true;
  }

  if (this.failedAt === frame) return false;

  slot = allocate(this, entry.width, entry.height, frame);

  if (slot < 0) {
    this.failedAt = frame;
    return false;
  }

  var shelf = this.slotShelf[slot],
    page = this.shelfPage[shelf],
    ctx = this.contexts[page],
    x = this.slotX[slot],
    y = this.shelfY[shelf];

  if (this.slotDirty[slot] === 1)
    ctx.clearRect(x, y, this.slotW[slot], this.shelfH[shelf]);

  entry.paint(ctx, x, y);
  this.painted++;

  this.slotState[slot] = TAKEN;
  this.slotDirty[slot] = 1;
  this.slotUsed[slot] = frame;
  this.owners[slot] = entry;

  entry.slot = slot;
  entry.sourceImage = this.pages[page];
  entry.offsetX = x;
  entry.offsetY = y;

  return true;
};

/**
 * Marks an entry that is on a page as drawn this frame, without drawing it -
 * for the frames of an animation that are not showing just now, which should
 * not be evicted only to be painted again a moment later.
 */
CanvasCache.prototype.keep = function (entry) {
  if (entry.slot >= 0) this.slotUsed[entry.slot] = this.clock.frame;
};

/**
 * Gives an entry's slot up straight away, for whoever knows it will not be
 * drawn again. Nobody has to: an entry nobody draws is evicted when its slot
 * is needed.
 */
CanvasCache.prototype.release = function (entry) {
  if (entry.slot >= 0) free(this, entry.slot);
};

/**
 * How full the pages are, to look at.
 */
CanvasCache.prototype.stats = function () {
  var taken = 0,
    area = 0;

  for (var i = 0; i < this.slotCount; i++) {
    if (this.slotState[i] !== TAKEN) continue;

    taken++;
    area += this.slotW[i] * this.shelfH[this.slotShelf[i]];
  }

  return {
    pages: this.pages.length,
    maxPages: this.maxPages,
    pageSize: this.pageSize,
    entries: taken,
    used: area / (this.pageSize * this.pageSize * this.maxPages),
    painted: this.painted,
    evicted: this.evicted,
  };
};

/**
 * A slot for a picture of w by h, or -1. Taking one, in the order of what it
 * costs: a free slot of about that height; a new slot along a shelf of about
 * that height; a new shelf; a new page; the least recently drawn picture's
 * slot, if it is big enough and was not drawn this frame or the one before;
 * a whole shelf of such pictures, cleared.
 */
function allocate(self, w, h, frame) {
  var needW = w + GAP,
    needH = Math.ceil((h + GAP) / STEP) * STEP,
    size = self.pageSize,
    //a shelf taller than this wastes too much of itself on the picture
    maxH = needH + (needH >> 2) + STEP,
    stale = frame - 1,
    best = -1,
    bestCost = Infinity,
    i,
    s,
    sh;

  if (w <= 0 || h <= 0 || needW > size || needH > size) return -1;

  for (i = 0; i < self.slotCount; i++) {
    if (self.slotState[i] !== FREE || self.slotW[i] < needW) continue;

    sh = self.shelfH[self.slotShelf[i]];

    if (sh < needH || sh > maxH) continue;

    if (self.slotW[i] * sh < bestCost) {
      best = i;
      bestCost = self.slotW[i] * sh;
    }
  }

  if (best >= 0) return best;

  for (s = 0; s < self.shelfCount; s++) {
    sh = self.shelfH[s];

    if (sh >= needH && sh <= maxH && size - self.shelfX[s] >= needW)
      return carve(self, s, needW);
  }

  for (i = 0; i < self.pages.length; i++)
    if (self.pageTop[i] + needH <= size)
      return carve(self, addShelf(self, i, needH), needW);

  if (self.pages.length < self.maxPages)
    return carve(self, addShelf(self, addPage(self), needH), needW);

  //full: evict the least recently drawn picture whose slot it fits in
  for (i = 0; i < self.slotCount; i++) {
    if (
      self.slotState[i] !== TAKEN ||
      self.slotUsed[i] >= stale ||
      self.slotW[i] < needW ||
      self.shelfH[self.slotShelf[i]] < needH
    )
      continue;

    if (self.slotUsed[i] < bestCost) {
      best = i;
      bestCost = self.slotUsed[i];
    }
  }

  if (best >= 0) {
    free(self, best);
    return best;
  }

  //or whole shelves of them, one over the other, when no one slot is big
  //enough
  s = reclaim(self, needH, stale);

  return s >= 0 ? carve(self, s, needW) : -1;
}

function free(self, slot) {
  var owner = self.owners[slot];

  if (owner) {
    owner.slot = -1;
    self.evicted++;
  }

  self.owners[slot] = null;
  self.slotState[slot] = FREE;
}

function addPage(self) {
  var canvas = self.makeCanvas(self.pageSize, self.pageSize);

  self.pages.push(canvas);
  self.contexts.push(canvas.getContext("2d"));

  return self.pages.length - 1;
}

function addShelf(self, page, h) {
  if (self.shelfCount === self.shelfY.length) {
    var n = self.shelfCount * 2;

    self.shelfPage = grow(self.shelfPage, n);
    self.shelfY = grow(self.shelfY, n);
    self.shelfH = grow(self.shelfH, n);
    self.shelfX = grow(self.shelfX, n);
    self.shelfClean = grow(self.shelfClean, n);
  }

  var s = self.shelfCount++;

  self.shelfPage[s] = page;
  self.shelfY[s] = self.pageTop[page];
  self.shelfH[s] = h;
  self.shelfX[s] = 0;
  self.shelfClean[s] = 0;
  self.pageTop[page] += h;

  return s;
}

/**
 * A new slot at the end of the shelf.
 */
function carve(self, shelf, w) {
  var slot,
    x = self.shelfX[shelf];

  if (self.spare.length > 0) slot = self.spare.pop();
  else {
    if (self.slotCount === self.slotX.length) {
      var n = self.slotCount * 2;

      self.slotShelf = grow(self.slotShelf, n);
      self.slotX = grow(self.slotX, n);
      self.slotW = grow(self.slotW, n);
      self.slotUsed = grow(self.slotUsed, n);
      self.slotState = grow(self.slotState, n);
      self.slotDirty = grow(self.slotDirty, n);
    }

    slot = self.slotCount++;
  }

  self.shelfX[shelf] = x + w;

  self.slotShelf[slot] = shelf;
  self.slotX[slot] = x;
  self.slotW[slot] = w;
  self.slotUsed[slot] = -1;
  self.slotState[slot] = FREE;
  self.slotDirty[slot] = x < self.shelfClean[shelf] ? 1 : 0;
  self.owners[slot] = null;

  return slot;
}

/**
 * Clears the run of shelves, one right under the other on a page, that is at
 * least h high and whose pictures were all drawn longest ago - none of them
 * since stale - and makes one shelf of h out of it, and another out of what is
 * left over.
 *
 * @returns {number} the shelf of h, or -1 when there is no such run
 */
function reclaim(self, h, stale) {
  var n = self.shelfCount,
    newest,
    bestStart = -1,
    bestNewest = 0x7fffffff,
    bestLength = 0,
    s,
    i;

  if (self.newest.length < n) self.newest = new Int32Array(self.shelfY.length);

  //the frame each shelf was last drawn from, or MAX when that was too lately
  newest = self.newest.fill(-1, 0, n);

  for (i = 0; i < self.slotCount; i++) {
    if (self.slotState[i] !== TAKEN) continue;

    s = self.slotShelf[i];

    if (self.slotUsed[i] >= stale) newest[s] = 0x7fffffff;
    else if (self.slotUsed[i] > newest[s]) newest[s] = self.slotUsed[i];
  }

  for (s = 0; s < n; s++) {
    var total = 0,
      worst = -1,
      length = 0,
      at = s;

    //down the page from s, as long as the shelves are stale
    while (at >= 0 && self.shelfH[at] > 0 && newest[at] !== 0x7fffffff) {
      total += self.shelfH[at];
      worst = Math.max(worst, newest[at]);
      length++;

      if (total >= h) break;

      at = below(self, at);
    }

    if (total >= h && worst < bestNewest) {
      bestStart = s;
      bestNewest = worst;
      bestLength = length;
    }
  }

  if (bestStart < 0) return -1;

  var first = bestStart,
    y = self.shelfY[first],
    height = 0,
    run = first;

  for (i = 0; i < bestLength; i++) {
    clearShelf(self, run);
    height += self.shelfH[run];

    var next = below(self, run);

    //every shelf of the run but the first is gone
    if (run !== first) self.shelfH[run] = 0;
    run = next;
  }

  if (bestLength > 1) {
    //shelves put together have pixels anywhere along them
    self.shelfClean[first] = self.pageSize;
    self.shelfH[first] = h;

    //what is left over is a shelf again, in the record of the second one
    if (height > h) {
      var rest = below(self, first, y + h);

      rest = rest >= 0 ? rest : spareShelf(self, first);
      self.shelfPage[rest] = self.shelfPage[first];
      self.shelfY[rest] = y + h;
      self.shelfH[rest] = height - h;
      self.shelfX[rest] = 0;
      self.shelfClean[rest] = self.pageSize;
    }
  }

  return first;
}

/**
 * The shelf right under s, or -1 - or, given y, a gone shelf of the run that
 * started at s whose record can be used again, see reclaim.
 */
function below(self, s, y) {
  var page = self.shelfPage[s],
    at = y === undefined ? self.shelfY[s] + self.shelfH[s] : -1;

  for (var t = 0; t < self.shelfCount; t++) {
    if (t === s || self.shelfPage[t] !== page) continue;

    if (y === undefined) {
      if (self.shelfH[t] > 0 && self.shelfY[t] === at) return t;
    } else if (self.shelfH[t] === 0 && self.shelfY[t] > self.shelfY[s])
      return t;
  }

  return -1;
}

/**
 * A shelf record for the part of a reclaimed run that is left over, when the
 * run had only the one shelf.
 */
function spareShelf(self, s) {
  var top = self.pageTop[self.shelfPage[s]],
    t = addShelf(self, self.shelfPage[s], 0);

  self.pageTop[self.shelfPage[s]] = top;

  return t;
}

/**
 * Evicts everything on a shelf and starts it over from its left end. The
 * pixels stay until they are painted over.
 */
function clearShelf(self, s) {
  for (var i = 0; i < self.slotCount; i++) {
    if (self.slotShelf[i] !== s || self.slotState[i] === GONE) continue;

    free(self, i);
    self.slotState[i] = GONE;
    self.spare.push(i);
  }

  self.shelfClean[s] = Math.max(self.shelfClean[s], self.shelfX[s]);
  self.shelfX[s] = 0;
}

function grow(array, n) {
  var bigger = new array.constructor(n);

  bigger.set(array);

  return bigger;
}

export default CanvasCache;

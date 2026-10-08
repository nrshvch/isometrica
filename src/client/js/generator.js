//Gets the generated pictures - the ground, the cars, the stones - as they
//are wanted, and not before: the first time something is about to draw one
//of them (CachedSprite asks SpriteCache#loadSheet, which asks this).
//
//They are painted by the generator worker (generator.worker, generatorcore),
//so painting never holds up a frame; until a picture comes back whatever
//draws it draws nothing - its size is known all along, from the build (see
//shared/gen/catalog). Nothing is kept between visits: painting a picture
//again takes a few milliseconds, off the main thread.
//
//The pictures that came back are kept here too, as ImageBitmaps, but only so
//many of them: past limit the one used longest ago is closed, and asked for
//again if it is wanted again. Most are wanted only once anyway - once one is
//on the canvas cache's pages, it is drawn from there.
//
//Where there is no worker - or the worker fails - the same core paints on
//the main thread instead.

//pictures kept in memory at most
var LIMIT = 128;
//how long after a picture failed it may be asked for again, in ms
var RETRY = 3000;

/**
 * @param inputs {Object} every hand-drawn picture, by sprite name: {url, x, y,
 *        w, h} - for the generators that paint from them
 */
function Generator(inputs) {
  this.inputs = inputs;
  this.limit = LIMIT;
  this.port = null;
  //sheets asked for and not come back yet, by sprite name
  this.waiting = {};
  //sheets with their picture in memory, by sprite name, used longest ago
  //first
  this.memory = new Map();
  //how many pictures have come back
  this.painted = 0;
}

/**
 * Asks for a generated sheet's picture, unless it is on its way already.
 *
 * @param sheet {Object} a SpriteCache sheet with generated: {name, gen, key}
 * @returns {Promise} its picture
 */
Generator.prototype.load = function (sheet) {
  if (sheet.loading !== null) return sheet.loading;

  var g = sheet.generated;

  sheet.loading = new Promise(function (resolve, reject) {
    sheet.settle = { resolve: resolve, reject: reject };
  });
  //nobody has to wait for it
  sheet.loading.catch(function () {});

  this.waiting[g.name] = sheet;
  port(this).post({
    type: "paint",
    name: g.name,
    gen: g.gen,
    key: g.key,
    look: g.look,
  });

  return sheet.loading;
};

/**
 * Marks a sheet's picture as used just now, to be let go of last.
 */
Generator.prototype.use = function (sheet) {
  var name = sheet.generated.name;

  if (this.memory.delete(name)) this.memory.set(name, sheet);
};

function receive(self, message) {
  var sheet = self.waiting[message.name];

  if (sheet === undefined) {
    if (message.image) message.image.close();
    return;
  }

  delete self.waiting[message.name];

  var settle = sheet.settle;

  sheet.settle = null;

  if (message.type !== "picture") {
    console.warn("Not painted: " + message.name + ": " + message.error);
    settle.reject(new Error(message.error));

    //asked for again, a while later, the next time it is wanted
    setTimeout(function () {
      if (sheet.image === null) sheet.loading = null;
    }, RETRY);
    return;
  }

  sheet.image = message.image;
  sheet.sides = message.sides || 0;
  //and at night, the lights of what shines of it (generatorcore lightsOf)
  sheet.lights = message.lights || null;
  self.memory.set(message.name, sheet);
  self.painted++;

  while (self.memory.size > self.limit) {
    var oldest = self.memory.keys().next().value,
      gone = self.memory.get(oldest);

    self.memory.delete(oldest);
    gone.image.close();
    gone.image = null;
    gone.loading = null;
  }

  settle.resolve(sheet.image);
}

/**
 * Where requests go: the worker, started the first time one is sent.
 */
function port(self) {
  if (self.port !== null) return self.port;

  self.port = new Port();

  try {
    var worker = new Worker(new URL("./generator.worker.js", import.meta.url), {
      type: "module",
    });

    worker.onmessage = function (e) {
      receive(self, e.data);
    };
    worker.onerror = function (e) {
      e.preventDefault();
      worker.terminate();
      onMainThread(self, e.message);
    };
    self.port.connect(function (message) {
      worker.postMessage(message);
    });
    self.port.post({ type: "init", inputs: self.inputs });
  } catch (e) {
    onMainThread(self, e.message);
  }

  return self.port;
}

/**
 * Paints on the main thread from now on, and asks again for everything that
 * was asked of the worker and has not come back.
 */
function onMainThread(self, why) {
  console.warn("No generator worker (" + why + "), painting on the page");

  var port = (self.port = new Port());

  import("./generatorcore").then(function (module) {
    var core = new module.default(function (message) {
      receive(self, message);
    });

    port.connect(function (message) {
      if (message.type === "init") core.init(message);
      else core.paint(message);
    });
  });

  port.post({ type: "init", inputs: self.inputs });

  Object.keys(self.waiting).forEach(function (name) {
    var g = self.waiting[name].generated;

    port.post({
      type: "paint",
      name: g.name,
      gen: g.gen,
      key: g.key,
      look: g.look,
    });
  });
}

/**
 * Holds messages until there is somewhere to send them.
 */
function Port() {
  this.queue = [];
  this.target = null;
}

Port.prototype.post = function (message) {
  if (this.target !== null) this.target(message);
  else this.queue.push(message);
};

Port.prototype.connect = function (target) {
  this.target = target;
  this.queue.forEach(target);
  this.queue = [];
};

export default Generator;

/**
 * The core run headless, in node, with no browser: a generated town opened,
 * its clock moved on a frame at a time for some game hours, with commands
 * sent on the way (ground cleared, a building demolished, one put up, one
 * replaced) - twice, and the two saves the same to the byte; then over the
 * local server's protocol (core/server, mirror, serve), in this thread and
 * with the server on a worker thread, the copy's save the server's. Exits 1
 * if the core reaches for the client or a browser, does not go on, or comes
 * out different.
 *
 *   node tools/coretest.mjs [--size=town] [--seed=3] [--hours=36]
 *
 * See isometrica/.claude/skills/buildings/core.md.
 */
import { createHash } from "node:crypto";
import { Worker } from "node:worker_threads";
import { loader } from "./coreloader.mjs";

var flag = function (name, dflt) {
    var a = process.argv.find(function (x) {
      return x.indexOf("--" + name + "=") === 0;
    });

    return a ? a.split("=")[1] : dflt;
  },
  size = flag("size", "town"),
  seed = +flag("seed", 3),
  hours = +flag("hours", 36);

//a frame, ms of the world's clock; and the game time a tick is worth
var FRAME = 100,
  TICK = 300000;

var failures = 0;

function check(ok, what) {
  console.log((ok ? "ok   " : "FAIL ") + what);
  if (!ok) failures++;
}

//nothing of a browser: the core must not need one
["window", "document", "localStorage", "sessionStorage"].forEach(
  function (name) {
    if (name in globalThis) throw new Error(name + " is defined in node");
  },
);

var server = await loader();

//a Storage kept in memory, for the saves (core/persistence/citystore)
function memory() {
  var items = new Map();

  return {
    getItem: function (k) {
      return items.has(k) ? items.get(k) : null;
    },
    setItem: function (k, v) {
      items.set(k, String(v));
    },
    removeItem: function (k) {
      items.delete(k);
    },
    key: function (i) {
      return Array.from(items.keys())[i] ?? null;
    },
    get length() {
      return items.size;
    },
  };
}

/**
 * What is sent to a town, and when: picked from it as it stands - and the
 * money for it (a world's own, so done in each world that plays it).
 */
function planOf(world, Replacement, funded) {
  var city = world.cities.getCities()[0];

  if (!funded) city.resourcesModule.addResource("money", 10000000);

  //what is sent, and when: picked from the town as it stands
  var buildings = city.buildingService.getBuildings(),
    house = buildings.find(function (b) {
      return (
        b.data.sizeX * b.data.sizeY >= 2 &&
        Replacement.replaceable(b) &&
        b.getProgress() === 1
      );
    }),
    other = buildings.find(function (b) {
      return (
        b !== house &&
        Replacement.replaceable(b) &&
        b.getProgress() === 1 &&
        city.quoteReplace(
          b.tile,
          Replacement.kindOf(b.buildingCode),
          b.rotation,
        ).error === 0
      );
    }),
    middle = city.tile(),
    T = world.terrain.constructor,
    hx = T.extractX(middle),
    hy = T.extractY(middle),
    //a patch of open ground a way off the middle of the town
    ground = [];

  for (var r = 6; r < 40 && ground.length < 6; r++)
    for (var dx = -r; dx <= r && ground.length < 6; dx++) {
      var t = T.convertToIndex(hx + dx, hy - r);

      if (world.buildingService.get(t) === null) ground.push(t);
    }

  var plan = [
    { at: 20, type: "clear", tiles: ground.slice(0, 3) },
    { at: 30, type: "clear", tiles: [house.tile] },
    { at: 50, type: "build", code: house.buildingCode, tile: ground[3] },
    {
      at: 80,
      type: "replace",
      tile: other.tile,
      code: Replacement.kindOf(other.buildingCode),
      rotation: other.rotation,
    },
  ];

  return { plan: plan, house: house, ground: ground };
}

/**
 * The town opened in a world of its own, played for hours of game time a
 * frame at a time with the commands sent on the way: what it came to.
 */
function play(Logic, Replacement, save) {
  var real = Date.UTC(2026, 0, 1),
    world = new Logic({
      tick: TICK,
      saves: "coretest",
      storage: memory(),
      catchUp: true,
      initialCity: null,
      //the real clock, only for how long it was away: as the world's goes
      now: function () {
        return real + world.clock;
      },
    });

  world.driveBy();
  world.start();
  world.persistence.open("coretest0001", save);

  var city = world.cities.getCities()[0],
    frames = Math.round((hours * 3600000) / TICK) * (1000 / FRAME),
    sent = [],
    log = { done: {} },
    made = planOf(world, Replacement),
    plan = made.plan,
    house = made.house,
    ground = made.ground;

  var started = world.time.now,
    demolished = house.tile;

  for (var f = 0; f < frames; f++) {
    var second = (f * FRAME) / 1000;

    plan.forEach(function (c) {
      if (c.at === second) {
        var result = world.command(c);

        sent.push(
          c.type +
            (result && result.cleared && !result.error
              ? " (" + result.cleared.length + " tiles)"
              : result && result.error
                ? " (error " + result.error + ")"
                : ""),
        );
      }
    });
    world.advance(FRAME);
  }

  var b = world.buildingService.get(demolished);

  log.gameHours = (world.time.now - started) / 3600000;
  log.dozers = world.works.count();
  log.waiting = world.works.waitingCount();
  log.demolished = b === null || b.buildingCode !== house.buildingCode;
  log.going = world.buildings.underConstruction().length;
  log.built = world.buildingService.get(ground[3]) !== null;
  log.sent = sent;
  log.save = JSON.stringify(world.persistence.snapshot());
  log.named = world.named;
  log.buildings = city.buildingService.getBuildings().length;

  world.pause();
  world.persistence.halt();

  return log;
}

/**
 * A save opened again away ms after it was made, as the game does on
 * coming back: what it caught up, and the names of what stands, by tile.
 */
function reopen(Logic, save, away) {
  var data = JSON.parse(save),
    world = new Logic({
      tick: TICK,
      saves: "coretest",
      storage: memory(),
      catchUp: true,
      initialCity: null,
      now: function () {
        return data.savedAt + away;
      },
    });

  world.driveBy();
  world.start();
  world.persistence._store.write("coretest0001", data, data.city.name);
  world.persistence.open("coretest0001");

  var caught = world.persistence.caughtUp,
    names = {};

  world.cities
    .getCities()[0]
    .buildingService.getBuildings()
    .forEach(function (b) {
      names[b.tile] = b.id;
    });
  world.pause();
  world.persistence.halt();

  return { ticks: caught ? caught.ticks : 0, names: names, named: world.named };
}

//the save with the plan's money in it: for worlds that must come out the
//same from it, every one of them opened on it (served)
function funded(save) {
  var data = JSON.parse(JSON.stringify(save)),
    city = data.city !== undefined ? data.city : data;

  city.resources = Object.assign({}, city.resources);
  city.resources.money = (city.resources.money || 0) + 10000000;

  return data;
}

/**
 * The town played over the protocol (core/server, core/mirror): a server's
 * world moved on in its steps and sent the plan as JSON, and a copy opened
 * the same way playing its frames - with the server in this thread, or on a
 * thread of its own (worker_threads, core/serve, as the game has it on a
 * Web Worker). What came of it: the copy's save against the server's.
 */
async function served(mods, save, threaded) {
  var real = Date.UTC(2026, 0, 1),
    data = funded(save);

  function make() {
    var w = new mods.Logic({
      tick: TICK,
      saves: "coretest",
      storage: memory(),
      catchUp: true,
      initialCity: null,
      now: function () {
        return real + w.clock;
      },
    });

    w.driveBy();
    w.start();

    return w;
  }

  function saveOf(w) {
    var d = w.persistence.snapshot();

    delete d.savedAt;

    return JSON.stringify(d);
  }

  var copy = make();

  copy.persistence.open("coretest0001", data);

  var mirror = new mods.Mirror(copy, false),
    plan = planOf(copy, mods.Replacement, true).plan,
    frames = Math.round((hours * 3600000) / TICK) * (1000 / FRAME),
    stats = { frames: 0, bytes: 0, answered: 0 },
    ids = 0,
    send,
    run,
    finish;

  function played(bytes) {
    stats.frames++;
    stats.bytes += bytes.byteLength;
    mirror.apply(bytes);
  }

  if (!threaded) {
    var world = make();

    world.persistence.put(copy.persistence.opened);

    var server = new mods.Server(world),
      flush = function () {
        if (server.flush() !== null) played(server.writer.copy());
      };

    flush();
    send = function (c) {
      var id = ++ids;

      mirror.waiting.set(id, function () {
        stats.answered++;
      });
      server.receive(JSON.stringify(c), id);
      flush();
    };
    run = function (ms) {
      server.run(ms);
      flush();
    };
    finish = function () {
      return Promise.resolve(saveOf(world));
    };
  } else {
    var worker = new Worker(new URL("./coreworker.mjs", import.meta.url)),
      checked = null;

    await new Promise(function (resolve, reject) {
      worker.on("error", reject);
      worker.on("message", function (m) {
        if (m.type === "ready") resolve();
        else if (m.type === "frame") played(m.bytes);
        else if (m.type === "check") checked(m.save);
      });
    });
    worker.postMessage({
      type: "open",
      options: { tick: TICK, saves: "coretest", catchUp: true },
      opened: copy.persistence.opened,
    });
    send = function (c) {
      var id = ++ids;

      mirror.waiting.set(id, function () {
        stats.answered++;
      });
      worker.postMessage({ type: "command", id: id, text: JSON.stringify(c) });
    };
    run = function (ms) {
      worker.postMessage({ type: "run", ms: ms });
    };
    finish = function () {
      return new Promise(function (resolve) {
        checked = function (text) {
          worker.postMessage({ type: "quit" });
          resolve(JSON.parse(text) === null ? "" : text);
        };
        worker.postMessage({ type: "check", id: 0 });
      });
    };
  }

  var t0 = performance.now();

  for (var f = 0; f < frames; f++) {
    var second = (f * FRAME) / 1000;

    plan.forEach(function (c) {
      if (c.at === second) send(c);
    });
    run(FRAME);
  }

  var theirs = await finish(),
    ours = saveOf(copy);

  stats.ms = performance.now() - t0;
  stats.same = ours === theirs;
  stats.size = ours.length;
  stats.hash = createHash("sha256").update(ours).digest("hex").slice(0, 16);
  stats.diverged = mirror.diverged;
  stats.dropped = mirror.dropped;
  stats.sent = plan.length;

  return stats;
}

function reportServed(how, r) {
  check(
    r.same && r.diverged === 0 && r.dropped === 0 && r.answered === r.sent,
    "over the protocol, " +
      how +
      ": the copy's save the server's (" +
      r.hash +
      ", " +
      r.size +
      " bytes), " +
      r.answered +
      " of " +
      r.sent +
      " commands answered, " +
      r.frames +
      " frames, " +
      Math.round(r.bytes / 1024) +
      " KB, digests off " +
      r.diverged +
      ", " +
      Math.round(r.ms) +
      " ms",
  );
}

try {
  var Gen = await server.ssrLoadModule("/src/citygen/index.js"),
    Logic = (await server.ssrLoadModule("/src/core/logic.js")).default,
    Replacement = (await server.ssrLoadModule("/src/core/replacement.js"))
      .default,
    out = Gen.default({ size: size, seed: seed, near: [31979, 27187] });

  //the core and everything it takes in: nothing of the client
  var client = Array.from(server.moduleGraph.idToModuleMap.keys()).filter(
    function (id) {
      return /\/src\/client\//.test(id);
    },
  );
  check(
    client.length === 0,
    "the core loads nothing of the client" +
      (client.length ? ": " + client.join(", ") : ""),
  );

  var t0 = performance.now(),
    a = play(Logic, Replacement, JSON.parse(JSON.stringify(out.save))),
    took = performance.now() - t0,
    b = play(Logic, Replacement, JSON.parse(JSON.stringify(out.save))),
    hash = function (s) {
      return createHash("sha256").update(s).digest("hex").slice(0, 16);
    };

  console.log(
    size +
      " seed " +
      seed +
      ": " +
      a.buildings +
      " buildings, " +
      a.gameHours +
      " game hours in " +
      Math.round(took) +
      " ms; sent " +
      a.sent.join(", "),
  );
  check(a.gameHours >= hours, "the game's time went on " + a.gameHours + " h");
  check(
    a.demolished && a.dozers === 0 && a.waiting === 0,
    "the demolition and the clearing got done (bulldozers " +
      a.dozers +
      ", tiles waiting " +
      a.waiting +
      ")",
  );
  check(
    a.built && a.going === 0,
    "what was put up stands, and nothing is going up still (" +
      a.going +
      " going)",
  );
  check(
    ["window", "document", "localStorage"].every(function (n) {
      return !(n in globalThis);
    }),
    "no browser globals made on the way",
  );
  check(
    a.save === b.save,
    "the same twice: save " +
      hash(a.save) +
      " / " +
      hash(b.save) +
      " (" +
      a.save.length +
      " bytes)",
  );

  var again = reopen(Logic, a.save, 120000),
    saved = {},
    kept = 0,
    all = 0;

  JSON.parse(a.save).city.buildings.forEach(function (row) {
    saved[row.tile] = row.id;
  });
  for (var tile in saved) {
    all++;
    if (again.names[tile] === saved[tile]) kept++;
  }
  check(
    again.ticks === 120 && kept === all && again.named >= a.named,
    "opened again two minutes on: " +
      again.ticks +
      " ticks caught up, " +
      kept +
      " of " +
      all +
      " names kept, none given twice",
  );

  var mods = {
    Logic: Logic,
    Replacement: Replacement,
    Server: (await server.ssrLoadModule("/src/core/server.js")).default,
    Mirror: (await server.ssrLoadModule("/src/core/mirror.js")).default,
  };

  reportServed("in this thread", await served(mods, out.save, false));
  reportServed(
    "the server on a worker thread",
    await served(mods, out.save, true),
  );
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await server.close();
}

process.exit(failures > 0 ? 1 : 0);

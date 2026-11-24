/**
 * What saving costs: on a generated town, every write to localStorage
 * counted while the game plays - the city's saves (core/persistence) and the
 * traffic's (client/carman) - with the camera still for a minute, then
 * panning twenty chunks away and back over a minute: bytes and records a
 * save and a minute, how long a save holds up the main thread; how long the
 * city's save takes to read back, and a page reload; and whether what is in
 * storage is the world, to the byte (read back, beside a snapshot of the
 * world taken in the same moment). Works on a build before step 8 as well.
 * Skill buildings, saves.md; isometrica/docs/world.md, Measuring.
 *
 *   node tools/world/saves.mjs <url> [--city=town] [--for=60]
 *   node tools/world/saves.mjs <url> --dump=<file>     (a save mid-demolition)
 *   node tools/world/saves.mjs <url> --migrate=<file>  (that save opened)
 */
/* global vkaria, Isometrica */
import fs from "node:fs";
import { args, flag, launch, median, WIDTH, HEIGHT } from "./page.mjs";

var [url] = args(),
  size = flag("city", "town"),
  span = +flag("for", 60) * 1000,
  dump = flag("dump", null),
  migrate = flag("migrate", null);

if (!url) {
  console.log(
    "node tools/world/saves.mjs <url> [--city=town] [--for=60] [--dump=<file> | --migrate=<file>]",
  );
  process.exit(2);
}

var ID = "saves1";

//Math.random seeded (as page.mjs), and every write to localStorage counted
var SETUP = `(function () {
  var s = 0x9e3779b9;
  Math.random = function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  var set = Storage.prototype.setItem, drop = Storage.prototype.removeItem;
  window.__w = { n: 0, bytes: 0, removed: 0, kinds: {} };
  function kind(k) {
    var p = String(k).split(".");
    return p.length > 2 ? p[2] : p[p.length - 1];
  }
  Storage.prototype.setItem = function (k, v) {
    if (this === window.localStorage) {
      var w = window.__w, b = String(v).length, c = kind(k);
      w.n++;
      w.bytes += b;
      w.kinds[c] = (w.kinds[c] || 0) + b;
    }
    return set.call(this, k, v);
  };
  Storage.prototype.removeItem = function (k) {
    if (this === window.localStorage) window.__w.removed++;
    return drop.call(this, k);
  };
})();`;

async function drawn(page) {
  await page.waitForFunction(
    "window.vkaria && vkaria.terrain && vkaria.terrain.chunks && vkaria.terrain.chunks.length > 0 && vkaria.core && vkaria.core.persistence.cityId()",
    null,
    { timeout: 120000 },
  );
}

/**
 * The game on a fresh profile: on the generated town (asked for once, so a
 * reload opens the save), or on what is put into its storage first.
 */
async function open(browser, storage, shift) {
  var page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
  });

  page.on("pageerror", function (e) {
    console.log("[page error]", e.message);
  });
  if (shift)
    await page.addInitScript(
      "(function(){var now=Date.now,off=" +
        shift +
        ";Date.now=function(){return now()+off;};})();",
    );
  await page.addInitScript(SETUP);
  if (storage)
    await page.addInitScript(
      "if (!sessionStorage.getItem('__put')) { sessionStorage.setItem('__put', '1'); var d = " +
        JSON.stringify(storage) +
        "; for (var k in d) localStorage.setItem(k, d[k]); }",
    );
  else
    await page.addInitScript(
      "if (!sessionStorage.getItem('__gen')) { sessionStorage.setItem('__gen', '1'); sessionStorage.setItem('isometrica.generate', " +
        JSON.stringify(
          JSON.stringify({
            id: ID,
            size: size,
            seed: 7,
            near: [32768, 27000],
          }),
        ) +
        "); }",
    );
  await page.goto(
    url.replace(/\/?$/, "/") + (storage ? "" : ID) + "?debug=off",
  );
  await drawn(page);

  return page;
}

//every save timed and its writes counted, from now on
function watchSaves(page) {
  return page.evaluate(function () {
    window.__saves = [];

    function wrap(obj, name, what) {
      var f = obj[name];

      obj[name] = function () {
        var w = window.__w,
          n = w.n,
          b = w.bytes,
          t = performance.now(),
          r = f.apply(this, arguments);

        window.__saves.push({
          what: what,
          ms: performance.now() - t,
          n: w.n - n,
          bytes: w.bytes - b,
        });

        return r;
      };
    }

    wrap(vkaria.core.persistence, "save", "city");
    wrap(vkaria.carman, "save", "traffic");
  });
}

//the camera over (x, z) chunks from where it started
function go(page, dx, dz) {
  return page.evaluate(
    function (a) {
      var C = Isometrica.Client.Config,
        step = C.chunkSize * C.tileSize,
        cam = vkaria.camera.cameraScript;

      if (!window.__start)
        window.__start = vkaria.camera.transform.getPosition([]).slice();
      cam.lookAt(
        window.__start[0] + a[0] * step,
        window.__start[2] + a[1] * step,
      );
    },
    [dx, dz],
  );
}

function counted(page) {
  return page.evaluate(function () {
    var s = window.__saves;

    window.__saves = [];

    return { w: JSON.parse(JSON.stringify(window.__w)), saves: s };
  });
}

function sum(list, f) {
  return list.reduce(function (a, x) {
    return a + f(x);
  }, 0);
}

function report(name, a, b, ms) {
  var saves = b.saves,
    minute = 60000 / ms;

  console.log(name);
  console.log(
    "  written:",
    Math.round(((b.w.bytes - a.w.bytes) * minute) / 1024) + " KB a minute,",
    Math.round((b.w.n - a.w.n) * minute) + " rows a minute,",
    Math.round((b.w.removed - a.w.removed) * minute) + " removed;",
    "by kind (KB a minute):",
    Object.keys(b.w.kinds)
      .map(function (k) {
        return (
          k +
          " " +
          (((b.w.kinds[k] - (a.w.kinds[k] || 0)) * minute) / 1024).toFixed(1)
        );
      })
      .join(", "),
  );
  ["city", "traffic"].forEach(function (what) {
    var list = saves.filter(function (s) {
      return s.what === what;
    });

    if (list.length === 0) return;
    console.log(
      "  " + what + " saves:",
      list.length + ",",
      Math.round(sum(list, (s) => s.bytes) / list.length) + " bytes a save,",
      (sum(list, (s) => s.n) / list.length).toFixed(1) + " rows a save,",
      "main thread " +
        median(list.map((s) => s.ms)).toFixed(2) +
        " ms (middle), " +
        Math.max
          .apply(
            null,
            list.map((s) => s.ms),
          )
          .toFixed(2) +
        " most",
    );
  });
}

//the city's rows in storage, how many and how big; and the time to read
//the save back whole, ms (the middle of five)
function stored(page) {
  return page.evaluate(function () {
    var p = vkaria.core.persistence,
      id = p.cityId(),
      rows = 0,
      bytes = 0,
      times = [];

    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);

      if (k.indexOf(id) === -1) continue;
      rows++;
      bytes += localStorage.getItem(k).length;
    }
    for (var j = 0; j < 5; j++) {
      var t = performance.now();

      p.store().read(id);
      times.push(performance.now() - t);
    }
    times.sort(function (a, b) {
      return a - b;
    });

    return { rows: rows, bytes: bytes, read: times[2] };
  });
}

//saved, read back, and a snapshot of the world - all in one moment
function roundTrip(page) {
  return page.evaluate(function () {
    var p = vkaria.core.persistence;

    p.save();

    var a = p.store().read(p.cityId()),
      b = p.snapshot();

    delete a.savedAt;
    delete b.savedAt;

    var sa = JSON.stringify(a),
      sb = JSON.stringify(b);

    return {
      same: sa === sb,
      bytes: sa.length,
      buildings: b.city.buildings.length,
      at:
        sa === sb
          ? -1
          : (function () {
              for (var i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return i;
              return sa.length;
            })(),
    };
  });
}

//the world as a save has it: buildings by tile and their names, the
//bulldozers, the cars, a demolition's tiles down
function census(page, tile) {
  return page.evaluate(function (tile) {
    var core = vkaria.core,
      city = core.cities.getCities()[0],
      names = {},
      b = tile !== null ? core.buildingService.get(tile) : null;

    city.buildingService.getBuildings().forEach(function (x) {
      names[x.tile] = x.id;
    });

    return {
      id: core.persistence.cityId(),
      name: city.name(),
      buildings: city.buildingService.getBuildings().length,
      names: names,
      named: core.named,
      seed: core.seed,
      dozers: core.works.count(),
      waiting: core.works.waitingCount(),
      cars: vkaria.carman.agents.length,
      demolishing: b !== null && b.demolishing === true,
      down: b !== null && b.down ? b.down.length : -1,
    };
  }, tile);
}

var browser = await launch(),
  page,
  t0;

if (dump) {
  //a save made mid-demolition, the cars out: for a later build to open
  page = await open(browser);

  await page.waitForTimeout(15000);

  var tile = await page.evaluate(function () {
    var core = vkaria.core,
      tm = vkaria.tilesman,
      T = core.terrain.constructor,
      p = vkaria.camera.transform.getPosition([]),
      C = Isometrica.Client.Config,
      cx = p[0] / C.tileSize,
      cy = p[2] / C.tileSize,
      best = null,
      far = Infinity;

    for (var id in core.buildingService.buildings) {
      var b = core.buildingService.buildings[id],
        tiles = b.tiles(),
        d = Math.hypot(T.extractX(b.tile) - cx, T.extractY(b.tile) - cy);

      if (
        b.getState() !== 2 ||
        [3, 4, 5].indexOf(b.data.classCode) === -1 ||
        tiles.length < 4 ||
        tiles.length > 6 ||
        !tiles.every(function (t) {
          return tm.levelOf(tm.regionOf(T.extractX(t), T.extractY(t))) === 4;
        })
      )
        continue;
      if (d < far) {
        far = d;
        best = b.tile;
      }
    }
    core.cities.getCities()[0].resourcesModule.addResource("money", 1000000);
    vkaria.clearworks.clear({ type: "clear", tiles: [best] });

    return best;
  });

  await page.waitForTimeout(5000);

  var saved = await page.evaluate(function () {
    vkaria.core.persistence.save();
    vkaria.carman.save();

    var d = {};

    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);

      d[k] = localStorage.getItem(k);
    }

    return { storage: d, savedAt: Date.now() };
  });
  var c = await census(page, tile);

  fs.writeFileSync(
    dump,
    JSON.stringify({
      storage: saved.storage,
      savedAt: saved.savedAt,
      tile: tile,
      census: c,
    }),
  );
  console.log(
    "saved mid-demolition:",
    c.buildings,
    "buildings,",
    c.dozers,
    "bulldozers,",
    c.waiting,
    "tiles waiting,",
    c.down,
    "tiles of it down,",
    c.cars,
    "cars;",
    Object.keys(saved.storage).length,
    "rows,",
    Math.round(sum(Object.values(saved.storage), (v) => v.length) / 1024) +
      " KB",
  );
  await browser.close();
  process.exit(0);
}

if (migrate) {
  //the save of a build before opened, five seconds after it was made
  var before = JSON.parse(fs.readFileSync(migrate, "utf8")),
    shift = before.savedAt + 5000 - Date.now(),
    was = before.census;

  page = await open(browser, before.storage, shift);

  await page.waitForTimeout(3000);

  var now = await census(page, before.tile),
    kept = 0,
    all = 0;

  for (var t in was.names) {
    all++;
    if (now.names[t] === was.names[t]) kept++;
  }

  console.log(
    "opened:",
    now.id === was.id ? "the same city" : "ANOTHER CITY " + now.id,
    '"' +
      now.name +
      '"' +
      (now.name === was.name ? "" : " (was " + was.name + ")"),
    "seed",
    now.seed === was.seed ? "kept" : "CHANGED",
  );
  console.log(
    "  buildings",
    now.buildings,
    "(were " + was.buildings + "),",
    kept,
    "of",
    all,
    "names kept by tile, last name",
    now.named,
    "(was " + was.named + ")",
  );
  console.log(
    "  the demolition:",
    now.demolishing ? "going on," : "not standing,",
    now.down,
    "tiles down (were " + was.down + "),",
    now.dozers,
    "bulldozers (were " + was.dozers + "),",
    now.waiting,
    "tiles waiting (were " + was.waiting + ")",
  );
  console.log("  cars", now.cars, "(were " + was.cars + ")");

  var s = now;

  t0 = Date.now();

  while (Date.now() - t0 < 120000 && (s.demolishing || s.waiting > 0)) {
    await page.waitForTimeout(1000);
    s = await census(page, before.tile);
  }
  console.log(
    "  then:",
    s.demolishing || s.waiting > 0
      ? "NOT DONE in 120 s"
      : "done in " + Math.round((Date.now() - t0) / 1000) + " s",
  );

  var rows = await page.evaluate(function () {
    var r = {};

    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i).split(".");

      r[k[2]] = (r[k[2]] || 0) + 1;
    }

    return r;
  });

  console.log("  rows in storage now, by kind:", JSON.stringify(rows));

  //and over a reload, as it is saved now
  var at = await census(page, null);

  await page.evaluate(function () {
    vkaria.core.persistence.save();
    vkaria.carman.save();
  });
  await page.reload();
  await drawn(page);
  await page.waitForTimeout(3000);

  var again = await census(page, null);

  kept = all = 0;
  for (t in at.names) {
    all++;
    if (again.names[t] === at.names[t]) kept++;
  }
  console.log(
    "  reloaded:",
    again.buildings,
    "buildings (were " + at.buildings + "),",
    kept,
    "of",
    all,
    "names kept, cars",
    again.cars,
    "(were " + at.cars + ")",
  );
  await browser.close();
  process.exit(0);
}

page = await open(browser);

await page.waitForTimeout(15000);
await watchSaves(page);

var a = await counted(page);

await page.waitForTimeout(span);

var b = await counted(page);

report("the camera still, " + span / 1000 + " s:", a, b, span);

//twenty chunks away and back, a chunk at a time
var steps = 40;

t0 = Date.now();

a = await counted(page);
for (var i = 1; i <= steps; i++) {
  await go(page, i <= steps / 2 ? i : steps - i, 0);
  await page.waitForTimeout(span / steps);
}
b = await counted(page);
report(
  "panning 20 chunks away and back, " +
    Math.round((Date.now() - t0) / 1000) +
    " s:",
  a,
  b,
  Date.now() - t0,
);

var trip = await roundTrip(page),
  st = await stored(page);

console.log(
  "in storage:",
  st.rows,
  "rows,",
  Math.round(st.bytes / 1024),
  "KB; read back whole in",
  st.read.toFixed(2),
  "ms",
);
console.log(
  "round trip:",
  trip.same
    ? "what is stored is the world, to the byte"
    : "DIFFERENT from character " + trip.at,
  "(" + trip.bytes + " bytes, " + trip.buildings + " buildings)",
);

var r0 = Date.now();

await page.reload();
await drawn(page);
console.log("reloaded, the ground drawn in", Date.now() - r0, "ms");

var trip2 = await roundTrip(page);

console.log(
  "after the reload:",
  trip2.same ? "the same, to the byte" : "DIFFERENT from character " + trip2.at,
  "(" + trip2.buildings + " buildings)",
);

await browser.close();
process.exit(trip.same && trip2.same ? 0 : 1);

/**
 * Puts the hand-drawn pictures in assets/sprites where the game loads them
 * from, src/public/gfx, and writes the manifest the game finds them by.
 *
 * Only pictures somebody drew are shipped. Everything a program paints - the
 * ground, the cars, the stones - is painted in the browser when the game
 * starts (src/client/js/generated), mostly out of pictures from here.
 *
 * A sprite is named by its path under assets/sprites: "buildings/shop.png".
 * Every sprite is on a sheet, loaded the first time something draws one of
 * its sprites. Pictures that belong together - the slopes of one ground, the
 * frames of one puff of smoke, the pieces of one building - share one, a
 * request for all of them, laid out by shared/gen/pack with a pixel of
 * nothing between any two so that none bleeds into the next; SHEETS says
 * which go together. A picture that goes with nothing else is a sheet with
 * just itself on it.
 *
 * manifest.json has every sprite's size and where it is, so the game knows
 * how big a picture is before it has loaded - and every file's hash, which it
 * asks for the file by, so a browser never draws a stale one. Under
 * generated it has the same for every picture the game paints for itself,
 * and what else the painting works out, see shared/gen/catalog - painted
 * here once only to find that out; nothing painted is written.
 *
 * Usage:
 *   node tools/packsprites.js
 *
 * Runs before `npm run dev`, `start` and `build`. What it writes is not
 * committed; files an earlier run wrote and this one did not are removed.
 */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var PNG = require("pngjs").PNG;
var layout = require("../src/shared/gen/pack.js").layout;
var catalog = require("../src/shared/gen/catalog.js");

var ROOT = path.resolve(__dirname, "..");
var SOURCE = path.join(ROOT, "assets/sprites");
var OUT = path.join(ROOT, "src/public/gfx");
var MANIFEST = "manifest.json";

//a sprite whose whole name matches goes on the sheet the match names; one
//that matches nothing is a sheet of its own, sheets/<its name>
var SHEETS = [
  //the slopes of the ground, the shore and the water the generator is
  //given, all needed at once
  [/^terrain\/(grass|shore|water)\/.*$/, "sheets/terrain/$1.png"],
  //the painted stones the generator cuts the ground out of
  [/^scenery\/stones\/.*$/, "sheets/scenery/stones.png"],
  //the frames of a puff of smoke
  [/^smoke\/([a-z]+)\d+\.png$/, "sheets/smoke/$1.png"],
  //every piece of the road
  [/^road\/.*$/, "sheets/road.png"],
  [/^trees\/.*$/, "sheets/trees.png"],
  //the pieces of one building: house2-1, house2-2; apartments-0-1. Its
  //pictures turned round carry an r after its name, house2r-1, and go on its
  //sheet as well - see withTurned
  [/^(buildings\/)?([a-z]+\d*r?)(-[\d-]+)?\.png$/, "sheets/$1$2.png"],
];

function main() {
  var names = list(SOURCE, ""),
    groups = {},
    manifest = { sheets: {}, sprites: {} },
    written = [];

  names.forEach(function (name) {
    var sheet = sheetOf(name);

    (groups[sheet] = groups[sheet] || []).push(name);
  });

  withTurned(groups);

  Object.keys(groups)
    .sort()
    .forEach(function (sheet) {
      var members = groups[sheet],
        packed = pack(members),
        bytes = PNG.sync.write(packed.image);

      members.forEach(function (name) {
        var at = packed.frames[name];

        manifest.sprites[name] = frame(sheet, at.x, at.y, at.image);
      });
      manifest.sheets[sheet] = describe(packed.image, bytes);

      save(sheet, bytes);
      written.push(sheet);
    });

  manifest.generated = generated(names, written);

  var previous = readManifest();

  fs.writeFileSync(path.join(OUT, MANIFEST), JSON.stringify(manifest) + "\n");
  removeStale(previous, written);

  console.log(
    "packed " +
      names.length +
      " sprites into " +
      written.length +
      " files in " +
      path.relative(ROOT, OUT),
  );
}

/**
 * What the game paints for itself, one file for each generator:
 * generated/<generator>.json, what shared/gen/catalog describes it will
 * paint - every picture by name with its size - and what else its painting
 * works out. Nothing is painted here.
 *
 * @returns {Object} generator -> {file, hash}, for the manifest
 */
function generated(names, written) {
  var out = {};

  catalog.GENERATORS.forEach(function (gen) {
    var pixels = {};

    catalog.INPUTS[gen].forEach(function (prefix) {
      names.forEach(function (name) {
        if (name.indexOf(prefix) === 0 && pixels[name] === undefined)
          pixels[name] = read(name);
      });
    });

    var described = catalog.describe(gen, pixels),
      file = "generated/" + gen + ".json",
      bytes = Buffer.from(
        JSON.stringify({
          generator: gen,
          //whether its pictures can be painted as their faces side by side
          //for the light to be worked out as they are drawn (catalog FACED)
          faced: catalog.FACED[gen] === true,
          sprites: described.sprites,
          data: described.data,
        }) + "\n",
      );

    save(file, bytes);
    written.push(file);
    out[gen] = { file: file, hash: digest(bytes) };
  });

  return out;
}

/**
 * Every png under dir, as paths relative to SOURCE, sorted so that two runs
 * lay the sheets out the same.
 */
function list(dir, prefix) {
  var out = [];

  fs.readdirSync(path.join(dir, prefix))
    .sort()
    .forEach(function (entry) {
      var rel = prefix ? prefix + "/" + entry : entry,
        stat = fs.statSync(path.join(dir, rel));

      if (stat.isDirectory()) out.push.apply(out, list(dir, rel));
      else if (/\.png$/.test(entry)) out.push(rel);
    });

  return out;
}

function sheetOf(name) {
  for (var i = 0; i < SHEETS.length; i++)
    if (SHEETS[i][0].test(name))
      return name.replace(SHEETS[i][0], SHEETS[i][1]);

  return "sheets/" + name;
}

/**
 * Puts the pictures of a building turned round on the sheet of the building,
 * cliffr with cliff. The r is only taken for that where there is a building
 * without it, so the office stays the office.
 */
function withTurned(groups) {
  Object.keys(groups).forEach(function (sheet) {
    var own = sheet.replace(/r\.png$/, ".png");

    if (own === sheet || groups[own] === undefined) return;

    groups[own] = groups[own].concat(groups[sheet]).sort();
    delete groups[sheet];
  });
}

function read(name) {
  return PNG.sync.read(fs.readFileSync(path.join(SOURCE, name)));
}

function frame(file, x, y, image) {
  return { sheet: file, x: x, y: y, w: image.width, h: image.height };
}

function describe(image, bytes) {
  return { width: image.width, height: image.height, hash: digest(bytes) };
}

function digest(bytes) {
  return crypto.createHash("sha1").update(bytes).digest("hex").slice(0, 10);
}

function pack(names) {
  var images = {},
    at;

  names.forEach(function (name) {
    images[name] = read(name);
  });

  at = layout(
    names.map(function (name) {
      return {
        name: name,
        width: images[name].width,
        height: images[name].height,
      };
    }),
  );

  var sheet = new PNG({ width: at.width, height: at.height }),
    frames = {};

  names.forEach(function (name) {
    var image = images[name],
      f = at.frames[name];

    PNG.bitblt(image, sheet, 0, 0, image.width, image.height, f.x, f.y);
    frames[name] = { x: f.x, y: f.y, image: image };
  });

  return { image: sheet, frames: frames };
}

function save(file, bytes) {
  var abs = path.join(OUT, file);

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, bytes);
}

function readManifest() {
  var file = path.join(OUT, MANIFEST);

  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

/**
 * Takes away the files the last run wrote and this one did not, and the
 * directories that leaves empty - nothing else under OUT is touched.
 */
function removeStale(previous, written) {
  var keep = {};

  written.forEach(function (file) {
    keep[file] = true;
  });

  var files = Object.keys(previous.sheets || {});

  Object.keys(previous.generated || {}).forEach(function (gen) {
    files.push(previous.generated[gen].file);
  });

  files.forEach(function (file) {
    var abs = path.join(OUT, file);

    if (keep[file] || !fs.existsSync(abs)) return;

    fs.unlinkSync(abs);

    for (
      var dir = path.dirname(abs);
      dir !== OUT && fs.readdirSync(dir).length === 0;
      dir = path.dirname(dir)
    )
      fs.rmdirSync(dir);
  });
}

main();

/**
 * Writes what the game finds its pictures by to dist/gfx (served to a game by
 * isometrica/vite.mjs): manifest.json, and for every generator the pictures
 * it will paint.
 *
 * Nothing is drawn by hand any more: everything there is to see - the
 * ground, the buildings, the roads, the cars, the trees, the stones, the
 * smoke - the game paints for itself in the browser, a picture at a time as
 * it is first drawn (client/generator). What a generator will paint - every
 * picture by name with its size - and what else its painting works out is
 * worked out here, by shared/gen/catalog, without painting anything, and
 * written as generated/<generator>.json; the manifest has every one of those
 * files' hashes, which the game asks for them by, so a browser never reads a
 * stale one.
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
var catalog = require("../src/shared/gen/catalog.js");

var ROOT = path.resolve(__dirname, "..");
var OUT = path.join(ROOT, "dist/gfx");
var MANIFEST = "manifest.json";

function main() {
  var written = [],
    //no sheets drawn by hand, and no sprites on them
    manifest = { sheets: {}, sprites: {} };

  manifest.generated = generated(written);

  var previous = readManifest();

  fs.writeFileSync(path.join(OUT, MANIFEST), JSON.stringify(manifest) + "\n");
  removeStale(previous, written);

  console.log(
    "described " +
      written.length +
      " generators in " +
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
function generated(written) {
  var out = {};

  catalog.GENERATORS.forEach(function (gen) {
    var described = catalog.describe(gen, {}),
      file = "generated/" + gen + ".json",
      bytes = Buffer.from(
        JSON.stringify({
          generator: gen,
          //whether its pictures can be painted as their faces side by side
          //for the light to be worked out as they are drawn (catalog FACED)
          faced: catalog.FACED[gen] === true,
          sprites: described.sprites,
          data: described.data,
          //how big every picture of it seen from straight above is, and
          //where on the ground it is drawn from - for the map (catalog
          //describe top); none for what is not seen from above
          top: described.top,
        }) + "\n",
      );

    save(file, bytes);
    written.push(file);
    out[gen] = { file: file, hash: digest(bytes) };
  });

  return out;
}

function digest(bytes) {
  return crypto.createHash("sha1").update(bytes).digest("hex").slice(0, 10);
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
 * Takes away the files the last run wrote and this one did not - the sheets
 * of pictures drawn by hand it once wrote among them - and the directories
 * that leaves empty; nothing else under OUT is touched.
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

fs.mkdirSync(OUT, { recursive: true });
main();

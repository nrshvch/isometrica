/**
 * Writes out every terrain tileset src/shared/gen/terrain.js paints - the
 * base tiles, the diffuse tiles and the shores of all of them, far more than
 * the game paints for itself as it starts - to look at, and to try a change to
 * the painting on before the game gets it.
 *
 * Usage:
 *   node tools/genterrain.js [outDir] [--seed s] [--variants n]
 *                            [--diffuse-variants n] [--preview]
 *
 * outDir is assets/terrain/terraingen unless given. Writes there:
 *   <tileset>/base/<slope>_<variant>.png
 *   <tileset>/diffuse/<slope>_<direction>_<variant>.png
 *   <tileset>/shore/<slope>.png          water tilesets only
 *   manifest.json                        everything above, and how it fits
 *   preview-tiles.png, preview-map.png   with --preview
 * Files an earlier run listed in manifest.json and this one did not write are
 * removed.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;
var terrain = require("../src/shared/gen/terrain.js");

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "assets/terrain/terraingen");

function options(argv) {
  var o = {
    out: DEFAULT_OUT,
    seed: "isometrica",
    variants: 2,
    diffuseVariants: 2,
    preview: false,
  };

  for (var i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--seed":
        o.seed = String(argv[++i]);
        break;
      case "--variants":
        o.variants = Math.max(1, parseInt(argv[++i], 10));
        break;
      case "--diffuse-variants":
        o.diffuseVariants = Math.max(1, parseInt(argv[++i], 10));
        break;
      case "--preview":
        o.preview = true;
        break;
      case "--out":
        o.out = path.resolve(argv[++i]);
        break;
      default:
        if (argv[i].indexOf("--") === 0)
          throw new Error("unknown option " + argv[i]);
        o.out = path.resolve(argv[i]);
    }
  }

  if (isNaN(o.variants) || isNaN(o.diffuseVariants))
    throw new Error("--variants and --diffuse-variants take a number");

  return o;
}

function main() {
  var o = options(process.argv.slice(2)),
    painted = terrain.generate(null, o),
    manifest = painted.manifest,
    written = Object.keys(painted.images);

  written.forEach(function (rel) {
    var image = painted.images[rel],
      png = new PNG({ width: image.width, height: image.height }),
      file = path.join(o.out, rel);

    png.data = Buffer.from(
      image.data.buffer,
      image.data.byteOffset,
      image.data.length,
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
  });

  var manifestFile = path.join(o.out, "manifest.json"),
    previous = fs.existsSync(manifestFile)
      ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
      : {};

  fs.mkdirSync(o.out, { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  removeStale(o.out, previous, written);

  console.log(
    "Wrote " +
      written.length +
      " tiles and manifest.json to " +
      path.relative(process.cwd(), o.out),
  );

  if (o.preview) require("./genterrain-preview").preview(o.out, manifest);
}

/**
 * Every file a manifest lists.
 */
function listed(manifest) {
  var files = [];

  Object.keys(manifest.tilesets || {}).forEach(function (id) {
    var set = manifest.tilesets[id];

    Object.keys(set.base || {}).forEach(function (slope) {
      files.push.apply(files, set.base[slope]);
    });
    Object.keys(set.diffuse || {}).forEach(function (slope) {
      Object.keys(set.diffuse[slope]).forEach(function (dir) {
        files.push.apply(files, set.diffuse[slope][dir]);
      });
    });
    Object.keys(set.shore || {}).forEach(function (slope) {
      files.push(set.shore[slope]);
    });
  });

  return files;
}

/**
 * Takes away what the last run listed in its manifest and this one did not
 * write - nothing else in the directory is touched.
 */
function removeStale(out, previous, written) {
  var keep = {};

  written.forEach(function (rel) {
    keep[rel] = true;
  });

  listed(previous).forEach(function (rel) {
    var abs = path.resolve(out, rel);

    if (keep[rel] || abs.indexOf(out + path.sep) !== 0 || !fs.existsSync(abs))
      return;

    fs.unlinkSync(abs);

    //and the directories that leaves empty, up to out
    for (
      var dir = path.dirname(abs);
      dir !== out && fs.readdirSync(dir).length === 0;
      dir = path.dirname(dir)
    )
      fs.rmdirSync(dir);
  });
}

main();

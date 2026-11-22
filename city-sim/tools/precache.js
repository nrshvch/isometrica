/**
 * What the Service Worker (public/sw.js) keeps of the game as it is put in
 * - everything the game is, of the build it comes with - written into it as
 * the build ends (vite.config.js), so that the game opens and plays offline
 * from the first time it was opened online, not only from the second:
 *
 * - the page, as / - whatever address it is opened at, it is the same page
 * - every file of the build but the Service Worker itself: the scripts,
 *   their workers, the styles, the fonts, the icons, the manifest
 * - isometrica's pictures, gfx/ - gfx/manifest.json, and every file it
 *   names at the address the game asks for it by: by its hash,
 *   generated/houses.json?v=<hash> (isometrica client/spritecache)
 *
 * and the script the page starts with, for the Service Worker to see that
 * the page it kept is the one these files are of.
 *
 * sw.js has `var BUILT = null;` for it, to be put in; the build fails
 * without it.
 */
import fs from "node:fs";
import path from "node:path";

var SW = "sw.js",
  MARK = "var BUILT = null;",
  GFX = "gfx/",
  GFX_MANIFEST = GFX + "manifest.json";

//every file under dir, by its path from there, with / between
function files(dir, under) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function (e) {
    var name = (under ? under + "/" : "") + e.name;

    return e.isDirectory()
      ? files(path.join(dir, e.name), name)
      : e.isFile()
        ? [name]
        : [];
  });
}

//the addresses isometrica's pictures are asked for by
function gfx(outDir, base) {
  var manifest = JSON.parse(
      fs.readFileSync(path.join(outDir, GFX_MANIFEST), "utf8"),
    ),
    out = [base + GFX_MANIFEST];

  Object.keys(manifest.sheets).forEach(function (file) {
    out.push(base + GFX + file + "?v=" + manifest.sheets[file].hash);
  });
  Object.keys(manifest.generated).forEach(function (gen) {
    var g = manifest.generated[gen];

    out.push(base + GFX + g.file + "?v=" + g.hash);
  });

  return out;
}

//the script index.html starts the game with
function entry(outDir) {
  var html = fs.readFileSync(path.join(outDir, "index.html"), "utf8"),
    found = /<script[^>]*\bsrc="([^"]+)"/.exec(html);

  if (!found) throw new Error("precache: no script in index.html");

  return found[1];
}

export default function precache() {
  var outDir = null,
    base = "/";

  return {
    name: "precache",
    apply: "build",

    configResolved: function (config) {
      outDir = path.resolve(config.root, config.build.outDir);
      base = config.base;
    },

    //after every other plugin's - isometrica's copies gfx/ in
    closeBundle: {
      order: "post",
      sequential: true,
      handler: function () {
        var sw = path.join(outDir, SW),
          source = fs.readFileSync(sw, "utf8"),
          list = [base].concat(
            files(outDir)
              .filter(function (file) {
                return (
                  file !== SW &&
                  file !== "index.html" &&
                  file.indexOf(GFX) !== 0
                );
              })
              .sort()
              .map(function (file) {
                return base + file;
              }),
            gfx(outDir, base),
          ),
          built = { entry: entry(outDir), files: list };

        if (source.indexOf(MARK) === -1)
          throw new Error("precache: no `" + MARK + "` in " + SW);

        fs.writeFileSync(
          sw,
          source.replace(
            MARK,
            "var BUILT = " + JSON.stringify(built, null, 2) + ";",
          ),
        );
        console.log("precache: " + list.length + " files written into " + SW);
      },
    },
  };
}

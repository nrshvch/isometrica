/**
 * Writes the game's icons out of their drawings (tools/icons.js): an SVG
 * each, src/ui/icons/svg/<name>.svg - to be used anywhere icons are - and
 * src/ui/icons/index.js, every icon by name, for the game's screens to show
 * them by (ui/kit Icon). What was written before goes; run it again after
 * changing a drawing.
 *
 * Usage:
 *   npm run generate:icons       (in city-sim/)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ICONS, svg } from "./icons.js";

var here = path.dirname(fileURLToPath(import.meta.url)),
  OUT = path.join(here, "../src/ui/icons"),
  SVG = path.join(OUT, "svg");

function main() {
  var names = Object.keys(ICONS).sort();

  fs.rmSync(SVG, { recursive: true, force: true });
  fs.mkdirSync(SVG, { recursive: true });

  names.forEach(function (name) {
    fs.writeFileSync(path.join(SVG, name + ".svg"), svg(ICONS[name]) + "\n");
  });

  fs.writeFileSync(
    path.join(OUT, "index.js"),
    [
      "//written by tools/genicons.js out of tools/icons.js - change that, and",
      "//run it again: every icon of the game by name - its grid, how wide its",
      "//lines are on it, and what is drawn on it, SVG",
      "export default {",
    ]
      .concat(
        names.map(function (name) {
          var icon = ICONS[name];

          return (
            "  " +
            JSON.stringify(name) +
            ": { w: " +
            icon.w +
            ", h: " +
            icon.h +
            ", stroke: " +
            Math.round(icon.stroke * 1000) / 1000 +
            ", body: " +
            JSON.stringify(icon.body.join("")) +
            " },"
          );
        }),
      )
      .concat(["};", ""])
      .join("\n"),
  );

  console.log(
    names.length + " icons written to " + path.relative(process.cwd(), OUT),
  );
}

main();

/**
 * Writes out the icon kit (src/shared/icons/kit.js) for the games to use
 * without drawing it: src/shared/icons/svg/<name>.svg, an SVG to an icon -
 * the set, to be used as any icon set is - and src/shared/icons/index.js,
 * every icon's paths for a game's own Icon (city-sim ui/kit). What it
 * writes is checked in, and goes into a game's build as it is; run it again
 * after changing an icon. The lab shows the kit as it is drawn (lab/icons).
 *
 * Usage:
 *   npm run generate:icons       (in isometrica/)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { N, NAMES, SHADE, draw, svg } from "../src/shared/icons/kit.js";

var OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/shared/icons",
);

var all = {},
  dir = path.join(OUT, "svg");

fs.mkdirSync(dir, { recursive: true });
fs.readdirSync(dir).forEach(function (f) {
  if (f.endsWith(".svg")) fs.unlinkSync(path.join(dir, f));
});

NAMES.forEach(function (name) {
  var icon = draw(name);

  all[name] = { solid: icon.solid, shade: icon.shade };
  fs.writeFileSync(path.join(dir, name + ".svg"), svg(all[name]));
});

fs.writeFileSync(
  path.join(OUT, "index.js"),
  "//written by tools/genicons.mjs out of kit.js - change that, and run it\n" +
    "//again: every icon of the kit, its solid and its shaded pixels as SVG\n" +
    "//paths, and how big the grid and how strong the shade\n" +
    "export var SIZE = " +
    N +
    ";\n\nexport var SHADE = " +
    SHADE +
    ";\n\nexport default " +
    JSON.stringify(all, null, 2) +
    ";\n",
);

console.log(NAMES.length + " icons -> " + path.relative(process.cwd(), OUT));

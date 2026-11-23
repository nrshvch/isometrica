/**
 * What a game's Vite needs of isometrica: dist/gfx served at /gfx in
 * development and copied into the build. isometrica's build runs first.
 * See isometrica/.claude/skills/generators/SKILL.md (Pipeline).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

var GFX = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist/gfx");

var TYPES = {
  ".json": "application/json",
  ".png": "image/png",
};

export default function isometrica() {
  var outDir = null;

  return {
    name: "isometrica",

    configResolved: function (config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },

    configureServer: function (server) {
      server.middlewares.use("/gfx", function (req, res, next) {
        var file = path.join(GFX, decodeURIComponent(req.url.split("?")[0]));

        if (
          !file.startsWith(GFX + path.sep) ||
          !fs.existsSync(file) ||
          !fs.statSync(file).isFile()
        )
          return next();

        res.setHeader(
          "Content-Type",
          TYPES[path.extname(file)] || "application/octet-stream",
        );
        fs.createReadStream(file).pipe(res);
      });
    },

    closeBundle: function () {
      if (outDir === null) return;

      if (!fs.existsSync(GFX))
        throw new Error(
          "isometrica is not built: no " +
            GFX +
            " - npm run build in isometrica/",
        );

      fs.cpSync(GFX, path.join(outDir, "gfx"), { recursive: true });
    },
  };
}

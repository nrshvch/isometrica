/**
 * Keeps the games apart (src/games): what every game shares - the world, the
 * client, the ui, the generators - never imports anything of a game's, and a
 * game never imports another's. Otherwise building one game alone
 * (`npm run build:delivery`) would carry the other along with it.
 *
 * Reads every import of every .js and .less under src/ - by the aliases
 * vite.config.js has, or relative - and fails, naming each one that reaches
 * where it may not.
 */
var fs = require("fs");
var path = require("path");

var SRC = path.resolve(__dirname, "../src"),
  GAMES = path.join(SRC, "games");

//vite.config.js's aliases
var ALIASES = {
  "core/": "core/",
  "data/": "data/",
  "client/": "client/js/",
  "ui/": "ui/",
  "shared/": "shared/",
  "games/": "games/",
};

var IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|@import\s+(?:\([a-z, ]+\)\s*)?)(["'])([^"']+)\1/g;

function files(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === "node_modules" || e.name === "public") return;

    var p = path.join(dir, e.name);

    if (e.isDirectory()) files(p, out);
    else if (/\.(js|less)$/.test(e.name)) out.push(p);
  });

  return out;
}

//where an import leads, in src - or null for a package
function target(file, spec) {
  spec = spec.split("?")[0];

  if (spec.startsWith(".")) return path.resolve(path.dirname(file), spec);

  for (var alias in ALIASES)
    if (spec.startsWith(alias))
      return path.join(SRC, ALIASES[alias], spec.slice(alias.length));

  return null;
}

//which game a path is a part of, or null for what they share
function gameOf(p) {
  var rel = path.relative(GAMES, p);

  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;

  return rel.split(path.sep)[0];
}

var wrong = [];

files(SRC, []).forEach(function (file) {
  var text = fs.readFileSync(file, "utf8"),
    from = gameOf(file),
    m;

  IMPORT.lastIndex = 0;

  while ((m = IMPORT.exec(text)) !== null) {
    var to = target(file, m[2]);

    if (to === null) continue;

    var game = gameOf(to);

    if (game !== null && game !== from)
      wrong.push(
        path.relative(SRC, file) +
          " imports " +
          m[2] +
          (from === null
            ? " - shared code, of the " + game + " game's"
            : " - the " + from + " game, of the " + game + " game's"),
      );
  }
});

if (wrong.length > 0) {
  console.error("Games reaching where they may not:\n  " + wrong.join("\n  "));
  process.exit(1);
}

console.log("games kept apart");

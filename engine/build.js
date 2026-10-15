/**
 * Builds the project's own dependencies.
 *
 * Every directory under engine/ is one package: its sources sit at the top
 * of the package directory with main.js as the entry point, and r.js compiles
 * them into a single file in that package's own dist/ directory. The dists
 * are not committed: `npm run build` here - which isometrica's build runs
 * first - rebuilds them, so they never drift from the sources.
 *
 * Because engine/ is the r.js baseUrl, each package's module ids fall out of
 * the directory layout by themselves (engine/events/event.js -> events/event),
 * so a target needs nothing but its package name.
 *
 * Each artifact is a self-contained ES module: almond (a minimal AMD loader)
 * plus the package's modules, ending in `export default require("<name>/main")`.
 * Consumers import the dist directly (each package's package.json points at
 * it), no loader shim needed. A package depending on another one lists it in
 * `external`: r.js leaves it out ("empty:"), and the artifact imports that
 * package's own dist instead and registers it with almond under the same id.
 * Packages never reach into isometrica or the games.
 *
 * Usage: node engine/build.js (npm run build in engine/)
 */

var path = require("path");
var requirejs = require("requirejs");

//engine/: every directory in it is a package
var ROOT = __dirname;

// Each external is imported from its own built package (or npm) at the top of
// the artifact and handed to almond under the id the sources require it by.
// `star` marks packages without a default export.
var EXTERNALS = {
    "events": {},
    "namespace": {},
    "gl-matrix": {star: true}
};

var PACKAGES = [
    {name: "namespace"},
    {name: "events"},
    {name: "reactive-property"},
    {name: "engine", external: ["events", "gl-matrix", "namespace"]}
];

function varName(id) {
    return "__ext_" + id.replace(/[^a-z0-9]/gi, "_");
}

function wrapFor(pkg) {
    var ext = pkg.external || [];

    var imports = ext.map(function (id) {
        return (EXTERNALS[id].star ? "import * as " : "import ") + varName(id) + ' from "' + id + '";';
    });

    var defines = ext.map(function (id) {
        return 'define("' + id + '", [], function () { return ' + varName(id) + "; });";
    });

    return {
        start: "// Built by engine/build.js - do not edit.\n" + imports.join("\n") + "\n",
        end: "\n" + defines.join("\n") + '\nexport default require("' + pkg.name + '/main");\n'
    };
}

function configFor(pkg) {
    var paths = {almond: require.resolve("almond/almond.js").replace(/\.js$/, "")};

    (pkg.external || []).forEach(function (id) {
        paths[id] = "empty:";
    });

    return {
        baseUrl: ROOT,
        name: "almond",
        include: [pkg.name + "/main"],
        out: path.join(ROOT, pkg.name, "dist", pkg.name + ".js"),
        paths: paths,
        wrap: wrapFor(pkg),
        // Keep artifacts readable for debugging. The src build (npm run build) minifies afterwards.
        optimize: "none",
        preserveLicenseComments: true,
        logLevel: 2
    };
}

function build(i) {
    if (i === PACKAGES.length) {
        console.log("\n" + PACKAGES.length + " own dependencies built");
        return;
    }

    var pkg = PACKAGES[i];

    requirejs.optimize(configFor(pkg), function () {
        console.log("  " + pkg.name + "  ->  engine/" + pkg.name + "/dist/" + pkg.name + ".js");
        build(i + 1);
    }, function (err) {
        console.error("FAILED building " + pkg.name + "\n" + err);
        process.exit(1);
    });
}

console.log("building the engine's packages in engine/ ...");
build(0);

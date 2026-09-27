/**
 * Builds the project's own dependencies.
 *
 * Every directory under vendor/ is one package: its sources sit at the top
 * of the package directory with main.js as the entry point, and r.js compiles
 * them into a single file in that package's own dist/ directory. The dists
 * are not committed: `npm run dev`/`start`/`build` rebuild them first (their
 * pre* scripts), so they never drift from the sources.
 *
 * Because vendor/ is the r.js baseUrl, each package's module ids fall out of
 * the directory layout by themselves (vendor/events/event.js -> events/event),
 * so a target needs nothing but its package name.
 *
 * Each artifact is a self-contained ES module: almond (a minimal AMD loader)
 * plus the package's modules, ending in `export default require("<name>/main")`.
 * Consumers import the dist directly (each package's package.json points at
 * it), no loader shim needed. A package depending on another one lists it in
 * `external`: r.js leaves it out ("empty:"), and the artifact imports that
 * package's own dist instead and registers it with almond under the same id.
 * Packages never reach into the app's src.
 *
 * Usage: node vendor/build.js
 */

var path = require("path");
var requirejs = require("requirejs");

var ROOT = path.join(__dirname, "..");

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
        start: "// Built by vendor/build.js - do not edit.\n" + imports.join("\n") + "\n",
        end: "\n" + defines.join("\n") + '\nexport default require("' + pkg.name + '/main");\n'
    };
}

function configFor(pkg) {
    var paths = {almond: path.join(ROOT, "node_modules/almond/almond")};

    (pkg.external || []).forEach(function (id) {
        paths[id] = "empty:";
    });

    return {
        baseUrl: path.join(ROOT, "vendor"),
        name: "almond",
        include: [pkg.name + "/main"],
        out: path.join(ROOT, "vendor", pkg.name, "dist", pkg.name + ".js"),
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
        console.log("  " + pkg.name + "  ->  vendor/" + pkg.name + "/dist/" + pkg.name + ".js");
        build(i + 1);
    }, function (err) {
        console.error("FAILED building " + pkg.name + "\n" + err);
        process.exit(1);
    });
}

console.log("building own dependencies from vendor/ ...");
build(0);

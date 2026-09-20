/**
 * Builds the project's own dependencies.
 *
 * Every directory under vendor/ is one package: its sources sit at the top
 * of the package directory with main.js as the entry point, and r.js compiles
 * them into a single committed file in that package's own dist/ directory.
 * These libraries are frozen -- they are not expected to change -- so the build
 * is run by hand (`npm run build:vendor`) rather than on every src build.
 *
 * Because vendor/ is the r.js baseUrl, each package's module ids fall out of
 * the directory layout by themselves (vendor/events/event.js -> events/event),
 * so a target needs nothing but its package name. Anything a package resolves at
 * runtime (npm libraries, the src's own `events` alias) is listed in `external`
 * and stubbed with "empty:" so r.js leaves the dependency in place rather than
 * inlining it.
 *
 * Usage: node vendor/build.js
 */

var path = require("path");
var requirejs = require("requirejs");

var ROOT = path.join(__dirname, "..");

// `flat: true` publishes the package under its bare name (`namespace`) instead
// of `namespace/main`. Only single-module packages can do that: a bare id has no
// directory, so a package with relative internal requires has to keep the
// `<name>/main` form for `./sibling` to resolve. Bare ids are preferable where
// possible because they need no alias in the src's requirejs config.
var PACKAGES = [
    {name: "engine", external: ["events", "gl-matrix", "namespace"]},
    {name: "events"},
    {name: "reactive-property"}
];

function configFor(pkg) {
    var paths = {};

    (pkg.external || []).forEach(function (id) {
        paths[id] = "empty:";
    });

    if (pkg.flat) {
        paths[pkg.name] = pkg.name + "/main";
    }

    return {
        baseUrl: path.join(ROOT, "vendor"),
        name: pkg.flat ? pkg.name : pkg.name + "/main",
        out: path.join(ROOT, "vendor", pkg.name, "dist", pkg.name + ".js"),
        paths: paths,
        // Artifacts are committed and read by humans when debugging, so keep
        // them readable. The src build (npm run build) minifies afterwards.
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
        console.log("  " + (pkg.flat ? pkg.name : pkg.name + "/main") + "  ->  vendor/" + pkg.name + "/dist/" + pkg.name + ".js");
        build(i + 1);
    }, function (err) {
        console.error("FAILED building " + pkg.name + "\n" + err);
        process.exit(1);
    });
}

console.log("building own dependencies from vendor/ ...");
build(0);

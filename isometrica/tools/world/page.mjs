/**
 * What the world tools share: Playwright, found wherever it is installed, and
 * the game opened on a world that comes out the same every run - a fresh
 * profile, Math.random seeded. See isometrica/docs/world.md, Measuring.
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";

var require = createRequire(import.meta.url);

//the screen every tool looks at the world through
export var WIDTH = 1280,
  HEIGHT = 800;

/**
 * Playwright: the repository's, if it has one, or the one installed for the
 * machine (cloud sessions come with it) - not a dependency of the repository,
 * for its browsers are a download of their own.
 */
export function playwright() {
  try {
    return require("playwright");
  } catch {
    var root = execSync("npm root -g").toString().trim();

    return require(path.join(root, "playwright"));
  }
}

//Math.random as mulberry32 from a fixed seed, before anything of the page
//runs: a fresh profile founds the same city in the same place every time
var SEED = `(function () {
  var s = 0x9e3779b9;
  Math.random = function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

/**
 * A headless Chromium drawing in WebGL on the CPU (SwiftShader): slow, but
 * the same on every machine.
 */
export function launch(extraArgs) {
  return playwright().chromium.launch({
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ].concat(extraArgs || []),
  });
}

/**
 * The game at url (a city-sim build, served - vite preview), on a fresh
 * profile, once its ground is drawn and settle ms more have gone by.
 * Errors the page throws are printed.
 */
export async function openWorld(browser, url, settle) {
  var page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
  });

  page.on("pageerror", function (e) {
    console.log("[page error]", e.message);
  });
  await page.addInitScript(SEED);
  await page.goto(url.replace(/\/?$/, "/") + "?debug=off");
  await page.waitForFunction(
    "window.vkaria && vkaria.terrain && vkaria.terrain.chunks && vkaria.terrain.chunks.length > 0",
    null,
    { timeout: 90000 },
  );
  if (settle) await page.waitForTimeout(settle);

  return page;
}

//the middle one of a list of numbers
export function median(list) {
  var sorted = list.slice().sort(function (a, b) {
    return a - b;
  });

  return sorted[sorted.length >> 1];
}

//the arguments that are not --flags, and the value of a --name=value flag
export function args() {
  return process.argv.slice(2).filter(function (a) {
    return a.indexOf("--") !== 0;
  });
}

export function flag(name, dflt) {
  var a = process.argv.find(function (x) {
    return x.indexOf("--" + name + "=") === 0;
  });

  return a ? a.slice(name.length + 3) : dflt;
}

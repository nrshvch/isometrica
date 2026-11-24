// ESLint for the whole repository: the recommended rules everywhere, and the
// way the packages may depend on each other - checked on every push (CI):
//
//   shared      <- imports from none of the others
//   engine      <- shared
//   isometrica  <- engine, shared
//   city-sim    <- isometrica, engine, shared   (never food-rider)
//   food-rider  <- isometrica, engine, shared   (never city-sim)

import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";

// What each package may not import, by name or by a relative path into it.
// The engine's packages are imported by their own names as well.
var ENGINE =
    "^(engine|events|namespace|reactive-property)(/|$)|(^|/)engine(/|$)",
  ISOMETRICA = "(^|/)isometrica(/|$)",
  CITY_SIM = "(^|/)city-sim(/|$)",
  FOOD_RIDER = "(^|/)food-rider(/|$)";

var ORDER =
  "Dependencies go shared <- engine <- isometrica <- the games, and never game to game (see CLAUDE.md, Code).";

// no-restricted-imports for import and export ... from; no-restricted-syntax
// for require() - the engine's AMD - and import()
function boundary(files, forbidden, who) {
  var regex = forbidden.join("|"),
    message = who + " may not import this. " + ORDER;

  return {
    files: files,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: regex, message: message }] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='require'] > Literal.arguments:first-child[value=/" +
            regex.replace(/\//g, "\\u002F") +
            "/]",
          message: message,
        },
        {
          selector:
            "ImportExpression > Literal.source[value=/" +
            regex.replace(/\//g, "\\u002F") +
            "/]",
          message: message,
        },
      ],
    },
  };
}

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.wrangler/**",
      "isometrica/assets/**",
      // written by city-sim/tools/genicons.js
      "city-sim/src/ui/icons/**",
    ],
  },

  js.configs.recommended,

  // everything runs in the browser unless said otherwise below
  {
    files: ["**/*.{js,mjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
  },

  // JSX: names used only in markup count as used
  {
    files: ["**/*.jsx"],
    plugins: { react: react },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { "react/jsx-uses-vars": "error" },
  },

  // web workers, the Service Worker, the Cloudflare Worker
  {
    files: ["**/*.worker.js", "isometrica/lab/*/worker.js"],
    languageOptions: { globals: { ...globals.worker } },
  },
  {
    files: ["city-sim/public/sw.js"],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ["city-sim/worker/**/*.js"],
    languageOptions: { globals: { ...globals.serviceworker } },
  },

  // node: tools, build configs, tests and benchmarks
  {
    files: [
      "**/tools/**/*.{js,mjs}",
      "**/vite.config.js",
      "isometrica/vite.mjs",
      "eslint.config.mjs",
      "shared/**/*.{test,bench}.js",
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["engine/build.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },

  // the engine's sources are AMD, built by r.js; main.js shims
  // requestAnimFrame onto window
  {
    files: ["engine/*/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.amd,
        requestAnimFrame: "readonly",
      },
    },
  },

  // globals the code really has: the client puts itself on window.vkaria
  // (client/vkaria.js), and the engine's namespace() makes window.Isometrica
  {
    files: ["isometrica/src/**/*.js"],
    languageOptions: {
      globals: { vkaria: "readonly", Isometrica: "readonly" },
    },
  },
  {
    files: ["food-rider/src/**/*.js"],
    languageOptions: {
      // SHOW_SPLASH may be defined before the game loads, to skip the splash
      globals: { Isometrica: "readonly", SHOW_SPLASH: "readonly" },
    },
  },
  {
    // put in by Vite's define (city-sim/vite.config.js)
    files: ["city-sim/src/**/*.{js,jsx}"],
    languageOptions: { globals: { __VERSION__: "readonly" } },
  },

  boundary(["shared/**"], [ENGINE, ISOMETRICA, CITY_SIM, FOOD_RIDER], "shared"),
  boundary(["engine/**"], [ISOMETRICA, CITY_SIM, FOOD_RIDER], "engine"),
  boundary(["isometrica/**"], [CITY_SIM, FOOD_RIDER], "isometrica"),
  boundary(["city-sim/**"], [FOOD_RIDER], "city-sim"),
  boundary(["food-rider/**"], [CITY_SIM], "food-rider"),
];

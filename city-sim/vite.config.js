import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import isometrica from "isometrica/vite";

//the commit built, short: the one GitHub Actions builds, or the one checked
//out here
function commit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);

  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch (e) {
    return "";
  }
}

//what the splash says the game is: a release its version, from the tag it
//is deployed from (city-sim/vX.Y.Z - .github/workflows/city-sim.yml,
//release.yml); anything else - the dev Worker, a branch's Preview, a build
//here - "dev" and the commit
function version() {
  var tag = /^refs\/tags\/city-sim\/(v\d+\.\d+\.\d+)$/.exec(
      process.env.GITHUB_REF || "",
    ),
    sha = tag ? "" : commit();

  return tag ? tag[1] : "dev" + (sha ? " " + sha : "");
}

//the game's page is index.html, its sources in src/ and what is served as it
//is in public/ - and isometrica's pictures, served and copied in by its plugin
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  define: {
    __VERSION__: JSON.stringify(version()),
  },
  plugins: [isometrica()],
});

/**
 * The lab built to be put up (npm run build:lab): every page into lab/dist.
 * Deployed by .github/workflows/isometrica.yml (wrangler.jsonc).
 * See isometrica/.claude/skills/lab/SKILL.md (Build and deploy).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import isometrica from "../vite.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

var here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  //relative, so the pages work wherever they are put up
  base: "./",
  plugins: [react(), tailwindcss(), isometrica()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.join(here, "index.html"),
        sprites: path.join(here, "sprites.html"),
        sounds: path.join(here, "sounds.html"),
        music: path.join(here, "music.html"),
        lighting: path.join(here, "lighting.html"),
        traffic: path.join(here, "traffic.html"),
        woods: path.join(here, "woods.html"),
        buildings: path.join(here, "buildings.html"),
        demolition: path.join(here, "demolition.html"),
        replace: path.join(here, "replace.html"),
        explosion: path.join(here, "explosion.html"),
        fire: path.join(here, "fire.html"),
        climate: path.join(here, "climate.html"),
        cities: path.join(here, "cities.html"),
      },
    },
  },
  //the workers import the generators as modules
  worker: {
    format: "es",
  },
});

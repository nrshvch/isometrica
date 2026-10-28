/**
 * The lab, built to be put up somewhere (npm run build:lab here): every page
 * of it, into lab/dist - nothing but the pages and what they import, all of
 * it painted and played in the page. Deployed by
 * .github/workflows/isometrica.yml (wrangler.jsonc).
 *
 * Each page is an HTML file of its own, its UI in React, styled with
 * Tailwind (ui/lab.css). One runs the game's own client (demolition.html),
 * which finds the pictures it paints listed in gfx/ - served and copied in
 * as a game's build does (isometrica/vite.mjs), after npm run build here.
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
        demolition: path.join(here, "demolition.html"),
      },
    },
  },
  //the workers import the generators as modules
  worker: {
    format: "es",
  },
});

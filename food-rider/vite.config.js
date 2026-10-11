import { defineConfig } from "vite";
import isometrica from "isometrica/vite";

//the game's page is index.html, its sources in src/ and what is served as it
//is in public/ - and isometrica's pictures, served and copied in by its plugin
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [isometrica()],
});

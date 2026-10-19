/**
 * The city builder's Worker. The game itself is static assets (dist/), served
 * without coming through here; only /api/* does (wrangler.jsonc
 * assets.run_worker_first) - the saves, kept one city to a Durable Object
 * (./saves).
 */
import { CitySaves, handleSaves } from "./saves.js";

export { CitySaves };

export default {
  async fetch(request, env) {
    var url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) return handleSaves(request, env, url);

    return env.ASSETS.fetch(request);
  },
};

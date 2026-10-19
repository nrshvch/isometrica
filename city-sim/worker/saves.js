/**
 * Where cities are saved: a Durable Object for every city, named by its id -
 * the one in the address bar, which is all it takes to load the city and to
 * save over it.
 *
 *   GET /api/cities/<id>   200 the save, as it was put; Save-Rev, Saved-At
 *                          404 nothing under that id
 *   PUT /api/cities/<id>   the save, gzipped JSON (application/gzip) or JSON
 *                          as it is (application/json), with Save-Base-Rev:
 *                          the revision it was made on top of, or "none" for
 *                          a city the server has not seen yet
 *                          200 {rev, savedAt}
 *                          409 {rev} - it was made on top of anything but
 *                          the latest: the city was saved from somewhere
 *                          else since (rev null - there is nothing there)
 *
 * The server does not look into a save: it is the player's device that plays
 * the city and knows what is in it. What it keeps is the order the saves came
 * in, so that no device saves over what another saved without knowing it -
 * and the last few of them, to go back to should one turn out broken.
 *
 * Every answer carries Saves-Api, so that the game can tell the server from a
 * page that merely answered (a dev server with no API behind it).
 */
import { DurableObject } from "cloudflare:workers";

var ID = /^[0-9A-Za-z]{6}(?:[0-9A-Za-z]{6})?$/;
var PATH = /^\/api\/cities\/([^/]+)$/;

//the most a save may be, bytes - under the two a Durable Object keeps in a
//row. A city is tens of kilobytes gzipped
var MAX_BYTES = 1900000;

//how many saves of a city are kept, the latest and those before it
var KEEP = 10;

var TYPES = ["application/gzip", "application/json"];

function reply(status, body, headers) {
  var h = new Headers(headers || {});

  h.set("Saves-Api", "1");
  h.set("Cache-Control", "no-store");

  if (body === undefined || body === null)
    return new Response(null, { status, headers: h });

  if (!(body instanceof ArrayBuffer)) {
    h.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  return new Response(body, { status, headers: h });
}

/**
 * Whoever asks too often is turned away - per address, a minute at a time
 * (wrangler.jsonc ratelimits). Without the binding everyone is let through.
 */
async function limited(request, env) {
  if (!env.SAVES_LIMIT) return false;

  var ip = request.headers.get("CF-Connecting-IP") || "unknown",
    outcome = await env.SAVES_LIMIT.limit({ key: ip });

  return !outcome.success;
}

/**
 * @param request {Request}
 * @param env {Object} CITY_SAVES, the Durable Objects; SAVES_LIMIT
 * @param url {URL}
 * @returns {Promise<Response>}
 */
export async function handleSaves(request, env, url) {
  var match = PATH.exec(url.pathname);

  if (match === null) return reply(404, { error: "no such thing" });

  var id = match[1];

  if (!ID.test(id)) return reply(400, { error: "not a city id" });

  if (request.method !== "GET" && request.method !== "PUT")
    return reply(405, { error: "GET or PUT" }, { Allow: "GET, PUT" });

  if (await limited(request, env)) return reply(429, { error: "too many" });

  var city = env.CITY_SAVES.get(env.CITY_SAVES.idFromName(id));

  if (request.method === "GET") {
    var save = await city.load();

    if (save === null) return reply(404, { error: "no such city" });

    return reply(200, save.data, {
      "Content-Type": save.type,
      "Save-Rev": String(save.rev),
      "Saved-At": String(save.savedAt),
    });
  }

  var type = (request.headers.get("Content-Type") || "").split(";")[0].trim(),
    base = request.headers.get("Save-Base-Rev");

  if (TYPES.indexOf(type) === -1)
    return reply(415, { error: "application/gzip or application/json" });

  if (base === null || !/^(none|[1-9][0-9]*)$/.test(base))
    return reply(428, { error: "Save-Base-Rev: a revision, or none" });

  var length = +(request.headers.get("Content-Length") || 0);

  if (length > MAX_BYTES) return reply(413, { error: "too big" });

  var data = await request.arrayBuffer();

  if (data.byteLength === 0) return reply(400, { error: "empty" });
  if (data.byteLength > MAX_BYTES) return reply(413, { error: "too big" });
  if (!looksLike(type, data)) return reply(400, { error: "not " + type });

  var saved = await city.save(base === "none" ? null : +base, type, data);

  if (!saved.ok) return reply(409, { rev: saved.rev });

  return reply(200, { rev: saved.rev, savedAt: saved.savedAt });
}

//a quick look that the body is what it says it is: gzip starts 1f 8b, and
//JSON a save is an object
function looksLike(type, data) {
  var bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 64));

  if (type === "application/gzip")
    return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

  for (var i = 0; i < bytes.length; i++) {
    var c = bytes[i];
    //whitespace before it
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) continue;
    return c === 0x7b;
  }

  return false;
}

/**
 * One city's saves, newest last. Everything it does is one step on its own
 * SQLite - nothing can come between reading the latest revision and writing
 * the next, so two devices saving at once cannot both win.
 */
export class CitySaves extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);

    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS saves (" +
        "rev INTEGER PRIMARY KEY, " +
        "saved_at INTEGER NOT NULL, " +
        "type TEXT NOT NULL, " +
        "data BLOB NOT NULL)",
    );
  }

  /**
   * @returns {{rev: number, savedAt: number, type: string, data: ArrayBuffer}|null}
   *          the latest save
   */
  load() {
    var rows = this.sql
      .exec(
        "SELECT rev, saved_at, type, data FROM saves ORDER BY rev DESC LIMIT 1",
      )
      .toArray();

    if (rows.length === 0) return null;

    return {
      rev: rows[0].rev,
      savedAt: rows[0].saved_at,
      type: rows[0].type,
      data: rows[0].data,
    };
  }

  head() {
    var rows = this.sql.exec("SELECT MAX(rev) AS rev FROM saves").toArray();

    return rows[0].rev === null ? null : rows[0].rev;
  }

  /**
   * @param base {number|null} the revision the save was made on top of -
   *        null for a city that has none yet
   * @param type {string}
   * @param data {ArrayBuffer}
   * @returns {{ok: boolean, rev: number|null, savedAt?: number}} the new
   *          revision, or - not ok - the latest one there is
   */
  save(base, type, data) {
    var head = this.head();

    if (head !== base) return { ok: false, rev: head };

    var rev = (head || 0) + 1,
      savedAt = Date.now();

    this.sql.exec(
      "INSERT INTO saves (rev, saved_at, type, data) VALUES (?, ?, ?, ?)",
      rev,
      savedAt,
      type,
      data,
    );
    this.sql.exec("DELETE FROM saves WHERE rev <= ?", rev - KEEP);

    return { ok: true, rev: rev, savedAt: savedAt };
  }
}

# Offline play, releases, saves

## Service Worker (`public/sw.js`)

- As it is put in, it keeps everything of one build (BUILT, written in by
  `tools/precache.js` as the build ends, `vite.config.js`): the page as `/`,
  every file of the build but itself (scripts, workers, styles, fonts, icons,
  the manifest), isometrica's `gfx/` - `gfx/manifest.json` and every file it
  names at the address the game asks for it by
  (`generated/houses.json?v=<hash>`) - the page's start script, and the
  version.
- Serving: the page and `gfx/manifest.json` from the network first (a new
  release is never held back), the kept ones when offline, whatever address;
  everything else as kept, else the network - asked for by hash, so never
  stale. What the network brings is never kept. `/api` never.
- Every release is a Service Worker of its own. The browser puts a new one in
  beside the one at work and it waits: for a page of its own release, opened
  from the network, it takes over straight away; otherwise once the player
  says so, or every page of the old one is closed. It throws away what the
  old one kept as it takes over.

## Releases (`src/ui/updates.js`)

The page looks for a new release when it comes back in sight (if it has not
for ten minutes) and every hour it stays in sight. One of this page's release
takes over silently; a newer one sets the store's `update`, and the world says
"Peepsland has been updated" (`world/UpdateReady.jsx`) - reload on it, or not
now. One taking over from another window leaves this page on what it no
longer keeps - said too.

## Home screen (`src/ui/install.js`, `public/manifest.webmanifest`)

store `install`: "prompt" (Chrome, Edge, Samsung Internet -
beforeinstallprompt, kept for the menu), "ios" (by hand from Share), "mac"
(by hand from Safari's File menu), null (opened as an app already, or no
way). Name, navy, standalone; icons from the logo; `viewport-fit=cover`, the
HUD keeping clear of the notch and home bar by `env(safe-area-inset-*)`.

## Saves

- Played from localStorage (isometrica `core/persistence`, see its buildings
  skill, city.md Saves), kept on the server too: half a minute after a
  change, when the page is put away, and when back online. A save made on top
  of anything but the server's latest means it was saved elsewhere: the
  player chooses which to keep; the same when opened. The address `/<id>`
  opens a city anywhere (an old `/#/<id>` is taken as `/<id>`); the id is 12
  characters made up by the browser - anyone with it can open and save over
  the city. `npm run dev` has no Worker and saves in the browser only.
- `worker/saves.js`: a Durable Object per city, keeping its last ten saves,
  gzipped.
  - `GET /api/cities/<id>` → 200 the save (Save-Rev, Saved-At), 404 none.
  - `PUT /api/cities/<id>` - gzipped JSON (`application/gzip`) or JSON, with
    `Save-Base-Rev` (the revision it was made on, or `none`) → 200
    `{rev, savedAt}`, or 409 `{rev}` (not on the latest; rev null: nothing
    there).
  - Every answer carries `Saves-Api`, to tell the server from a page that
    merely answered. The server never looks into a save.
- Catching up: opened again or back in sight, the world plays out what it
  missed, up to a game day (`src/game.js` catchUp, isometrica `Logic`), by
  the shorter of the browser's and server's clocks.

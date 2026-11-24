# The screens

## Layout

The world is drawn under everything, as high as the window (`kit.jsx`
LayeredLayout); over it, kept to the middle of a wide screen (Container), the
top and the bottom bars. A screen (catalogue, city screen) is a card over the
world dimmed behind it, as high as the HUD leaves; its contents scroll under
its title. Cards: sky white by day, night blue once the world is drawn at
night, corners all but square, colour kept for meaning.

## Top (`world/Hud.jsx`)

The city's money (opens and closes the city screen) and what comes in a
tick; under it the city's name and population (back to the city); the time
and the weather; the view from above; zoom in and out; the menu - sounds, the
day and night going by, the grid over the ground (kept off if switched off),
the city's address at https://peeps.land shared or copied, the game put on
the home screen where the browser can (`install.js`), a new city (on empty
land; Peepsville, `initialcity.js`; Peepstown, `peepstown.js`; or generated
afresh: "New random town", "New random city", "New Peepsopolis" -
isometrica's citygen, `session.js` startGenerated, see
`docs/cities.md#generated-cities`), each under an id of its own, and the five
cities played most lately. On a phone the money and the time take the top,
the name and the buttons the line under it. W goes round the kinds of
weather, and back to the game's own.

## Bottom (`world/WorldHud.jsx`)

Where a thumb is: the bar of the world's buttons - the city, the catalogue, a
road, the ground, or those of the action going on, its tick faded while it
cannot be pressed - and over it a card of what to do, and over that a new
release ready (`UpdateReady.jsx`). A building tapped (nothing else going on):
the bar has only Replace, Demolish, Blow up and Fire up, and the card says
what it is and what it is worth (isometrica `client/worth.js` describe) -
how far along it is, what it makes a tick, who lives or works in it, what it
goes without, its health - kept up to date; a tap anywhere else puts it away.

## Tools

- Roads: gravel (the default), cobbles or asphalt toggled along the bottom
  while laying, the preview changing with it; toggled again, one way only,
  again the other way, again both ways (icons `-two`, `-one`, `-back`); the
  next road starts the way the last was laid, till the page is left. Laid
  over a lesser road it upgrades it, over one of the same or more it is
  turned down.
- Ground (`src/client/terrainman.js`): tiles picked straight away, cleared,
  raised or lowered as toggled, priced over them as picked, done with the
  tick, starting on what was toggled last; it starts on the building that was
  looked at, if any, and a building tapped picks its tiles.
- Placing a building: the dice next to turning it picks another of the same
  kind for every footprint of the selection.
- Founding: with no city yet the bar's button opens the catalogue on
  everything; the first thing put down founds it, Done asks for its name
  (`Prompt.jsx`), $100,000 to start; the dice takes the camera to another
  spot for a town.

## The border (`src/client/cityborder.js`, `cityarea.js`)

One dashed line round the city's area along the tiles' edges (isometrica
`core/city/cityroads` AREA). While something is being put down
(`#placing`), the border as it would be with it (`CityRoads#plan`) - in amber
what would stand apart - and every area standing apart, faintly; while
something standing apart is looked at (`#inspecting`), all that hangs
together with it. Drawn again as what hangs together or the ground changes;
put away with the words over the world, but while placing. Where a road
crosses the border, town limit signs by it on the last tile inside
(`#townSignsOn`), drawn by the road and staying up.

## Catalogue (`catalogue/Catalogue.jsx`)

A card each: picture, cost, who lives and works there, what it needs and
gives. Order: what a game starts with (needing neither road nor water:
village houses, the old town, the water tower, the pump station, then
parks), then everything else, houses then shops, a tier at a time, cheaper
first. A card picked is built - back in the world, the selection up. Replace
(`/<id>/replace/<tile>`): only what covers the building's ground, turned one way
or another (isometrica `core/replacement`), each at what it would come to
with clearing included, its own kind among them for another look.

## Other screens

- `Splash.jsx`: "Denis Narushevich's Peepsland" - the maker small over the
  name, the name in Chakra Petch - on the night's blue, a bar of how far
  along (isometrica `SpriteCache#progress`: the pictures on screen from the
  camera's side painted and on the pages), the release or "dev" and the
  commit along the bottom (`vite.config.js`). Fades once painted and a couple
  of frames run, or after half a minute.
- `Welcome.jsx`: after a minute or more away, how long and what the city made
  meanwhile, under OK; what it made floats up over it once the splash goes.
- `city/CityScreen.jsx`: budget, people, services.
- `DebugPanel.jsx`: frames a second and what a frame costs (the world, each
  part of drawing, each ticker; the tick, picks, the HUD), draw calls,
  pictures, lamps, lines, pictures painted, the heap - from the engine's
  Stats a few times a second. Lines stay put, a dash when nothing counted;
  green easy on a phone, red too much against 33 ms (LIMITS). Switches draw
  without shadows, lamps or overlays, or as often as the screen can, or
  without saving the battery (`src/client/pace.js`).
- `WorldMap.jsx` (the HUD's map button, debugging): the world from above,
  north up, as far as asked (65536 tiles down to a few hundred), coarse on
  purpose (a pixel is a tile or two's height, coloured by the climate zone),
  a few rows a frame; tile coordinates, the camera and cities marked; drag,
  wheel, Go to; a click puts the camera there.
- `src/client/pace.js`: at most 30 frames a second while anything goes on,
  fewer (RATE) behind a screen, when left alone a while (never while a finger
  or button is held), and on a low battery not charging.

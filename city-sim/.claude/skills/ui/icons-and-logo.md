# Icons and logo

Both are made by scripts; what they write is checked in and goes into the
build as it is. Change the script, run it again.

## Icons

```
npm run generate:icons   # tools/icons.js, by tools/genicons.js →
                         # src/ui/icons/svg/<name>.svg, src/ui/icons/index.js
```

- `tools/icons.js` draws every icon the game shows (HUD, the bar, road
  materials and ways, the ground's tools, the menu, the screens). Each is
  `{w, h, stroke, body}`: its grid, its line width, SVG.
- Lines in one colour, `currentColor`, on a 24 grid within 2 of its edge,
  1.5 wide, square ends, mitred joins - to go with the world's pixels.
  What is of the world (a plot, a road) is a flat tile, twice as wide as
  high. A road is drawn on a grid 18 high, shown a third wider and in finer
  lines (ROAD_LINE): asphalt, gravel or cobbles, `-two`, `-one`, `-back`.
- `genicons.js` writes an SVG each and `index.js` (every icon by name),
  removing what it wrote before. Shown by `<Icon name="asphalt" size={22} />`
  (`src/ui/kit.jsx`); isometrica's client asks for its road toggles by these
  names too.

## Logo

```
npm run generate:logo    # tools/genlogo.js [out.png] → public/logo.png, public/icons/
```

A little town out of the game's own pieces - a slab of ground, a house, a
tree, a water tower - painted by isometrica's generators, in a ring, the
tower too tall for it and breaking out through the top: SIZE (128) pixels
square, transparent round the ring, the page's icon. What is in it is SCENE.
From it, the home-screen icons: icon-192, icon-512, maskable-192/512 (on
navy, inside the round a phone cuts), apple-touch-icon (180).

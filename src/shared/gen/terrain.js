/**
 * Paints terrain tilesets for more kinds of ground than the one grass there
 * is, in the same fashion as that grass - the same nineteen slopes, the same
 * size and outline, lit the same way - together with the pieces a tile is
 * overlaid with where it borders another kind of ground, and writes a manifest
 * listing all of it.
 *
 * Every tileset has, for each slope it comes in:
 *
 *  - base tiles: the ground as it is, in a few variants so that a field of it
 *    shows no pattern;
 *  - diffuse tiles: that ground spilling over one edge (ne, se, sw, nw) or one
 *    corner (n, e, s, w) of a tile of the same slope, see-through everywhere
 *    else. Laid over another tileset's base tile of the same slope they make
 *    the border between the two. However a diffuse wanders in between, it
 *    reaches exactly edge.depth into the tile at the corners of the edge it
 *    comes over (a corner one: edge.depth along both edges next to its
 *    corner), so any two pieces of the same tileset meet wherever they are put
 *    next to each other, over any slopes, and a border runs on unbroken for as
 *    long as it goes.
 *
 * Which of two tilesets spills over the other is settled once, here, by
 * PRECEDENCE: the later one always goes over the earlier one. The manifest
 * spells the pairs out, so a renderer never has to decide it.
 *
 * Water meets the ground differently: not across an edge but where the ground
 * sinks under it - a shore tile. So a water tileset has a shore tile for each
 * slope instead, laid over whatever ground the tile has: the water comes up
 * the lowest part of it, a little higher than the water level, into wet
 * sand, sand, and the sand thins out into the ground above in a dither, as
 * wide as the tile is, and ragged. It goes by how high the ground is, which
 * runs on from tile to tile, so a shore runs on unbroken over any slopes. The
 * shallows' shore has the shallows in it; deep water its own water, for where
 * the land drops straight into it, and ice its ice with frost for a beach.
 *
 * All of it is painted here, the grass and the water the game has too -
 * nothing is taken from a picture. The outline of every slope is its corners
 * joined up, and the light on every face is the sun's on the buildings
 * (shared/gen/isobox), so that the ground and what stands on it are lit
 * alike.
 *
 * It paints into plain pictures, {width, height, data} with the pixels as
 * RGBA, so that the same painting runs in the game as it starts (client/
 * generated), for the tilesets it draws, and in tools/genterrain.js, which
 * writes every tileset out as files to look at.
 */
import SimplexNoise from "simplex-noise";

var WIDTH = 64;
var HEIGHT = 47;
//how far up a corner is drawn for every step of height
var HEIGHT_STEP = 8;
var FLAT = "2222";
//every slope there is a tile of: the corners' heights clockwise from the W
//one, each 2 for the W corner's own (see heights)
var SLOPES = [
  "2101",
  "2111",
  "2112",
  "2121",
  "2122",
  "2123",
  "2211",
  "2212",
  "2221",
  "2222",
  "2223",
  "2232",
  "2233",
  "2321",
  "2322",
  "2323",
  "2332",
  "2333",
  "2343",
];

//a tile's own coordinates at its corners: u runs from the S corner to the E
//one, v from S to W - along the grid's x and y
var CORNERS = { s: [0, 0], e: [1, 0], n: [1, 1], w: [0, 1] };

//where a diffuse comes in from, and which tile, relative to the one it lies
//on, is on that side
var DIRECTIONS = {
  ne: { kind: "edge", neighbour: [1, 0] },
  se: { kind: "edge", neighbour: [0, -1] },
  sw: { kind: "edge", neighbour: [-1, 0] },
  nw: { kind: "edge", neighbour: [0, 1] },
  n: { kind: "corner", neighbour: [1, 1], edges: ["ne", "nw"] },
  e: { kind: "corner", neighbour: [1, -1], edges: ["ne", "se"] },
  s: { kind: "corner", neighbour: [-1, -1], edges: ["se", "sw"] },
  w: { kind: "corner", neighbour: [-1, 1], edges: ["sw", "nw"] },
};

//how far a point is from an edge, and where along it
var EDGES = {
  ne: function (u, v) {
    return [1 - u, v];
  },
  se: function (u, v) {
    return [v, u];
  },
  sw: function (u, v) {
    return [u, 1 - v];
  },
  nw: function (u, v) {
    return [1 - v, 1 - u];
  },
};

//lowest first: each one spills over every one before it. Every biome's rock
//is under all the grass and sand, which grows and drifts over its edges; snow
//covers everything; water draws its shore over any ground, deep water darkens
//the shallows at its edge, and ice closes over open water of either depth
var PRECEDENCE = [
  "rock_basalt",
  "rock_granite",
  "rock_dolomite",
  "rock_limestone",
  "rock_kopje",
  "rock_sandstone",
  "grass_tropical",
  "grass_boreal",
  "grass",
  "grass_south",
  "savannah",
  "sand_dunes",
  "snow",
  "water_shallow",
  "water_deep",
  "ice",
];

//how close to a tile's edge its texture is the same whatever the variant, so
//that any two variants meet without a seam
var PIN = 0.16;
//decorations are kept this far off the edges, so none is cut in half
var DECORATION_MARGIN = 0.1;

/**
 * The rock of one biome's mountains, which shows between the grass and the
 * snow: slabs cracked apart, smaller cracks through them, layers where it is
 * laid down in them, lichen or moss here and there, and scree.
 *
 * @param o {Object} name and description; palette, dark to light; crack, the
 *        colour in the cracks; strata, how much it is layered; growth, two
 *        colours of what grows on it, from where the noise is over growthAt;
 *        scree, the colours of the stones lying on it
 */
function rock(o) {
  return {
    name: o.name,
    description: o.description,
    kind: "land",
    waterBody: "water_shallow",
    look: { lit: 1, dark: 1.05, shadow: [1.05, 1, 0.9], rim: 1 },
    edge: {
      depth: 0.4,
      amp: 0.14,
      waves: 5,
      soft: 0.13,
      grain: 0.45,
      clump: 12,
      specks: 0.35,
      reach: 0.22,
      lip: 0.85,
    },
    albedo: function (s) {
      var strata = Math.sin(
          2 * Math.PI * (s.u + 3 * s.v) + 3 * s.noise("warp", 2, 1),
        ),
        slab = s.cells("slabs", 3, 0.09),
        chip = s.cells("chips", 7, 0.05),
        c = ramp(
          o.palette,
          0.5 +
            0.3 * s.noise("field", 3, 2) +
            o.strata * strata +
            0.3 * (slab.tone - 0.5),
        ),
        growth = s.noise("lichen", 9, 1);

      //the cracks between slabs are not all the way open, and smaller
      //ones run through the slabs here and there
      if (slab.f2 - slab.f1 < 0.035 && s.noise("open", 5, 1) > -0.4)
        c = mix(c, o.crack, 0.7);
      else if (chip.f2 - chip.f1 < 0.03 && s.noise("chipped", 6, 1) > 0.2)
        c = mix(c, o.crack, 0.35);
      else if (growth > o.growthAt && s.random(7) < 0.55)
        c = mix(c, o.growth[s.random(8) < 0.5 ? 0 : 1], 0.55);

      return grain(c, s, 0.09, 3);
    },
    decorations: [{ density: 0.02, cells: pebble(o.scree) }],
  };
}

/**
 * The tilesets. For a painted one:
 *
 *  - albedo(s) gives the colour of the ground at a pixel of a flat tile; s
 *    has the pixel's u and v, noise(name, scale, octaves) in -1..1, tileable
 *    and the same in every variant near the edges, cells(name, n) for slabs,
 *    and random(salt) in 0..1, different for every pixel;
 *  - decorations are stamped over that here and there, a few pixels each, as
 *    colours or as a darkening of what is under them;
 *  - look says how the light on the slopes takes to it: lit and dark scale
 *    how much lighter and darker the faces get than they do on the grass,
 *    shadow how much each channel darkens, rim how dark the outline is;
 *  - edge is how it spills over a neighbour: depth into the tile at the
 *    corners, amp how far it wanders from that, waves how often, soft how wide
 *    the ragged fringe is, grain how much of the fringe is loose pixels rather
 *    than clumps of clump size, specks how many loose bits lie out to reach
 *    beyond it, lip how dark its edge is on the side away from the light.
 *
 * All distances are in the tile's own u, v.
 */
var TILESETS = {
  rock_basalt: rock({
    name: "Basalt",
    description:
      "Dark volcanic rock of tropical mountains, overgrown with moss.",
    palette: [
      [0, [52, 50, 50]],
      [0.5, [76, 72, 68]],
      [1, [104, 98, 90]],
    ],
    crack: [30, 28, 28],
    strata: 0.02,
    growth: [
      [58, 96, 40],
      [80, 120, 50],
    ],
    growthAt: 0.1,
    scree: [
      [96, 92, 86],
      [70, 66, 62],
    ],
  }),
  rock_granite: rock({
    name: "Granite",
    description:
      "Dark, cold granite of the northern forests' fells, grey-green with lichen.",
    palette: [
      [0, [74, 78, 84]],
      [0.5, [104, 108, 112]],
      [1, [138, 140, 140]],
    ],
    crack: [44, 46, 50],
    strata: 0,
    growth: [
      [84, 106, 70],
      [150, 156, 120],
    ],
    growthAt: 0.15,
    scree: [
      [140, 142, 144],
      [112, 114, 118],
    ],
  }),
  rock_dolomite: rock({
    name: "Dolomite",
    description:
      "Grey limestone of the Alps and the Dolomites - cracked slabs, scree and lichen.",
    palette: [
      [0, [98, 98, 100]],
      [0.5, [132, 130, 126]],
      [1, [166, 163, 156]],
    ],
    crack: [58, 58, 62],
    strata: 0.06,
    growth: [
      [128, 136, 86],
      [158, 150, 98],
    ],
    growthAt: 0.35,
    scree: [
      [176, 174, 166],
      [150, 148, 142],
      [120, 116, 110],
    ],
  }),
  rock_limestone: rock({
    name: "Limestone",
    description:
      "Warm, pale limestone of the mountains of Spain and Italy, sun-bleached.",
    palette: [
      [0, [150, 138, 116]],
      [0.5, [186, 174, 148]],
      [1, [214, 204, 180]],
    ],
    crack: [110, 98, 80],
    strata: 0.08,
    growth: [
      [168, 160, 110],
      [196, 178, 120],
    ],
    growthAt: 0.5,
    scree: [
      [222, 212, 190],
      [190, 178, 152],
    ],
  }),
  rock_kopje: rock({
    name: "Kopje granite",
    description: "Reddish-brown granite of the savannah's rocky hills.",
    palette: [
      [0, [112, 82, 66]],
      [0.5, [146, 110, 88]],
      [1, [178, 142, 114]],
    ],
    crack: [76, 54, 44],
    strata: 0,
    growth: [
      [150, 140, 96],
      [120, 110, 70],
    ],
    growthAt: 0.45,
    scree: [
      [176, 140, 112],
      [140, 104, 84],
    ],
  }),
  rock_sandstone: rock({
    name: "Red sandstone",
    description: "Layered red rock of the Atlas and the desert mountains.",
    palette: [
      [0, [140, 70, 44]],
      [0.5, [176, 98, 62]],
      [1, [206, 134, 90]],
    ],
    crack: [96, 46, 30],
    strata: 0.14,
    growth: [
      [190, 150, 100],
      [160, 110, 76],
    ],
    growthAt: 0.6,
    scree: [
      [196, 126, 86],
      [150, 84, 56],
    ],
  }),
  grass_tropical: {
    name: "Tropical grassland",
    description: "Deep, dark green growth of the tropics, lush and clumped.",
    kind: "land",
    waterBody: "water_shallow",
    look: { lit: 1, dark: 1, shadow: [1, 1, 1], rim: 1 },
    edge: {
      depth: 0.42,
      amp: 0.15,
      waves: 3,
      soft: 0.14,
      grain: 0.45,
      clump: 9,
      specks: 0.3,
      reach: 0.22,
      lip: 0.88,
    },
    albedo: function (s) {
      var c = ramp(TROPICAL, 0.5 + 0.45 * s.noise("field", 3, 2)),
        clump = s.noise("clump", 9, 2);

      if (clump > 0.15)
        c = mix(c, [8, 40, 16], Math.min(1, (clump - 0.15) * 2.5) * 0.6);
      else if (clump < -0.3)
        c = mix(c, [52, 108, 34], Math.min(1, (-0.3 - clump) * 3) * 0.5);

      return grain(c, s, 0.1, 5);
    },
    decorations: [{ density: 0.02, cells: tuft([56, 112, 36], [10, 44, 18]) }],
  },
  grass_boreal: {
    name: "Pine forest floor",
    description:
      "Moss and needles under the northern pine forests - dark, muted green.",
    kind: "land",
    waterBody: "water_shallow",
    look: { lit: 0.9, dark: 1, shadow: [1, 1, 1], rim: 1 },
    edge: {
      depth: 0.42,
      amp: 0.14,
      waves: 3,
      soft: 0.13,
      grain: 0.45,
      clump: 8,
      specks: 0.3,
      reach: 0.22,
      lip: 0.88,
    },
    albedo: function (s) {
      var c = ramp(BOREAL, 0.5 + 0.4 * s.noise("field", 3, 2)),
        moss = s.noise("moss", 7, 2),
        litter = s.noise("litter", 11, 1);

      //cushions of brighter moss, and needles gone brown between them
      if (moss > 0.25)
        c = mix(c, [96, 118, 58], Math.min(1, (moss - 0.25) * 2.5) * 0.55);
      else if (litter > 0.3)
        c = mix(c, [88, 72, 48], Math.min(1, (litter - 0.3) * 2) * 0.5);

      return grain(c, s, 0.08, 4);
    },
    decorations: [
      {
        density: 0.012,
        cells: dot([
          [92, 72, 46],
          [110, 86, 56],
        ]),
      },
      {
        density: 0.003,
        cells: dot([
          [118, 126, 100],
          [132, 136, 112],
        ]),
      },
    ],
  },
  grass: {
    name: "European grassland",
    description:
      "Meadow grass of temperate Europe: lusher clumps and drier patches, blades catching the light, now and then a daisy or a buttercup.",
    kind: "land",
    waterBody: "water_shallow",
    variants: 4,
    look: { lit: 1, dark: 1, shadow: [1, 1, 1], rim: 1 },
    albedo: function (s) {
      var c = ramp(GRASS, 0.5 + 0.35 * s.noise("field", 3, 2)),
        lush = s.noise("lush", 7, 2),
        dry = s.noise("dry", 5, 2);

      //clumps of lusher, darker grass, and drier patches between
      if (lush > 0.25)
        c = mix(c, [34, 84, 26], Math.min(1, (lush - 0.25) * 2.5) * 0.6);
      else if (dry > 0.35)
        c = mix(c, [100, 128, 52], Math.min(1, (dry - 0.35) * 2.5) * 0.45);

      return grain(c, s, 0.05, 3);
    },
    decorations: [
      //blades: a lit tip over its own shadow
      { density: 0.07, cells: tuft([84, 138, 52], [32, 76, 22]) },
      { density: 0.03, cells: tuft([70, 124, 42], [40, 86, 26]) },
      //clover, darker and a little blue
      {
        density: 0.012,
        cells: dot([
          [38, 92, 44],
          [44, 100, 52],
        ]),
      },
      //daisies and buttercups
      {
        density: 0.0025,
        cells: dot([
          [236, 236, 222],
          [240, 206, 64],
        ]),
      },
    ],
    edge: {
      depth: 0.42,
      amp: 0.14,
      waves: 4,
      soft: 0.14,
      grain: 0.55,
      clump: 11,
      specks: 0.3,
      reach: 0.22,
      lip: 0.92,
    },
  },
  grass_south: {
    name: "Southern European grassland",
    description:
      "Sun-burnt grass of Spain and Italy - olive and straw, green only in the hollows.",
    kind: "land",
    waterBody: "water_shallow",
    look: { lit: 0.9, dark: 1, shadow: [0.97, 1, 1.05], rim: 1 },
    edge: {
      depth: 0.42,
      amp: 0.14,
      waves: 4,
      soft: 0.14,
      grain: 0.6,
      clump: 10,
      specks: 0.32,
      reach: 0.22,
      lip: 0.92,
    },
    albedo: function (s) {
      var c = ramp(SOUTH, 0.5 + 0.4 * s.noise("field", 3, 2)),
        green = s.noise("green", 6, 2),
        straw = s.noise("straw", 8, 1);

      if (green > 0.3)
        c = mix(c, [96, 116, 54], Math.min(1, (green - 0.3) * 2.5) * 0.55);
      else if (straw > 0.25)
        c = mix(c, [200, 180, 112], Math.min(1, (straw - 0.25) * 2.5) * 0.45);

      return grain(c, s, 0.08, 5);
    },
    decorations: [
      { density: 0.006, cells: shrub([92, 98, 50], [66, 70, 38]) },
      {
        density: 0.006,
        cells: pebble([
          [208, 198, 172],
          [180, 168, 140],
        ]),
      },
    ],
  },
  savannah: {
    name: "Savannah",
    description:
      "Golden dry grass of the savannah, with red earth showing through.",
    kind: "land",
    waterBody: "water_shallow",
    look: { lit: 0.85, dark: 1, shadow: [0.96, 1, 1.08], rim: 0.9 },
    edge: {
      depth: 0.42,
      amp: 0.14,
      waves: 3,
      soft: 0.15,
      grain: 0.65,
      clump: 9,
      specks: 0.35,
      reach: 0.24,
      lip: 0,
    },
    albedo: function (s) {
      var c = ramp(SAVANNAH, 0.5 + 0.4 * s.noise("field", 3, 2)),
        earth = s.noise("earth", 6, 2),
        tall = s.noise("tall", 10, 1);

      if (earth > 0.35)
        c = mix(c, [168, 104, 66], Math.min(1, (earth - 0.35) * 2.5) * 0.6);
      else if (tall > 0.3)
        c = mix(c, [150, 124, 60], Math.min(1, (tall - 0.3) * 2.5) * 0.45);

      return grain(c, s, 0.07, 5);
    },
    decorations: [
      { density: 0.02, cells: tuft([214, 184, 104], [128, 104, 52]) },
      { density: 0.004, cells: shrub([96, 104, 52], [66, 72, 36]) },
    ],
  },
  sand_dunes: {
    name: "Desert sand",
    description:
      "Golden wind-rippled dune sand of the Sahara - Egypt, Algeria, Morocco.",
    kind: "land",
    waterBody: "water_shallow",
    look: { lit: 0.8, dark: 1, shadow: [0.95, 1, 1.12], rim: 0.55 },
    edge: {
      depth: 0.42,
      amp: 0.12,
      waves: 3,
      soft: 0.16,
      grain: 0.85,
      clump: 9,
      specks: 0.45,
      reach: 0.26,
      lip: 0,
    },
    albedo: function (s) {
      var ripple = Math.sin(
        2 * Math.PI * (4 * s.u + 2 * s.v) + 2.2 * s.noise("warp", 2, 1),
      );

      return grain(
        ramp(DUNES, 0.5 + 0.3 * s.noise("field", 2.5, 2) + 0.12 * ripple),
        s,
        0.04,
        3,
      );
    },
    decorations: [{ density: 0.003, cells: pebble([[168, 132, 88]]) }],
  },
  snow: {
    name: "Snow",
    description:
      "Deep, clean snow of the mountain tops and the frozen edge of the world, blue in the shade.",
    kind: "land",
    waterBody: "ice",
    look: { lit: 0.8, dark: 0.85, shadow: [1.2, 1.05, 0.72], rim: 0.4 },
    edge: {
      depth: 0.42,
      amp: 0.15,
      waves: 2.5,
      soft: 0.12,
      grain: 0.35,
      clump: 5,
      specks: 0.28,
      reach: 0.22,
      lip: 0.92,
    },
    albedo: function (s) {
      var crust = Math.sin(
        2 * Math.PI * (2 * s.u - 3 * s.v) + 2 * s.noise("warp", 2, 1),
      );

      return grain(
        ramp(SNOW, 0.55 + 0.3 * s.noise("drift", 2.5, 2) + 0.06 * crust),
        s,
        0.02,
        2.5,
      );
    },
    decorations: [{ density: 0.006, cells: dot([[255, 255, 255]]) }],
  },
  water_shallow: {
    name: "Shallow water",
    description:
      "The shallows along the land: blue with a gentle swell, the light caught in short lines along the ripples.",
    kind: "water",
    slopes: [FLAT],
    variants: 3,
    look: { lit: 1, dark: 1, shadow: [1, 1, 1], rim: 0.35 },
    albedo: function (s) {
      return ripples(s, WATER, [96, 168, 222], [0, 50, 112]);
    },
    edge: {
      depth: 0.3,
      amp: 0.06,
      waves: 2,
      soft: 0.04,
      grain: 0.2,
      clump: 6,
      specks: 0,
      reach: 0,
      lip: 0,
    },
  },
  water_deep: {
    name: "Deep water",
    description:
      "Open water too deep to see the bottom of, off shore: the shallows' swell and ripples, in darker blues.",
    kind: "water",
    slopes: [FLAT],
    variants: 3,
    look: { lit: 1, dark: 1, shadow: [1, 1, 1], rim: 0.35 },
    edge: {
      depth: 0.34,
      amp: 0.13,
      waves: 2.5,
      soft: 0.15,
      grain: 0.8,
      clump: 6,
      specks: 0.25,
      reach: 0.12,
      lip: 0,
    },
    //the shallows' swell and ripples, in darker blues
    albedo: function (s) {
      return ripples(s, DEEP, [60, 128, 194], [0, 34, 88]);
    },
  },
  ice: {
    name: "Ice",
    description:
      "Frozen-over water of the cold edge of the world, cracked and dusted with snow.",
    kind: "water",
    slopes: [FLAT],
    look: { lit: 0.8, dark: 0.9, shadow: [1.2, 1.05, 0.72], rim: 0.5 },
    edge: {
      depth: 0.3,
      amp: 0.1,
      waves: 4,
      soft: 0.03,
      grain: 0.1,
      clump: 7,
      specks: 0.04,
      reach: 0.06,
      lip: 0.85,
    },
    //a frozen shore's beach is under frost
    beach: function (relative) {
      return ramp(FROST, 0.75 + (relative - 1) * 0.8);
    },
    albedo: function (s) {
      var c = ramp(ICE, 0.5 + 0.35 * s.noise("field", 2.5, 2)),
        floe = s.cells("floes", 3, 0.08),
        dust = s.noise("dust", 4, 2);

      if (floe.f2 - floe.f1 < 0.03 && s.noise("open", 4, 1) > -0.3)
        c = mix(c, [230, 241, 248], 0.5);
      if (dust > 0.2)
        c = mix(c, [234, 241, 248], Math.min(1, (dust - 0.2) * 2) * 0.7);

      return grain(c, s, 0.025, 2);
    },
  },
};

//the colours each ground is painted from, dark to light
var GRASS = [
  [0, [40, 88, 26]],
  [0.5, [58, 110, 36]],
  [1, [80, 132, 50]],
];
var WATER = [
  [0, [0, 66, 138]],
  [0.5, [2, 82, 162]],
  [1, [14, 100, 182]],
];
//a beach: wet sand at the water, dry above it
var SAND = [
  [0, [196, 172, 120]],
  [0.5, [214, 192, 140]],
  [1, [230, 212, 164]],
];
var WET_SAND = [150, 130, 92];
var TROPICAL = [
  [0, [12, 52, 20]],
  [0.5, [22, 72, 26]],
  [1, [38, 92, 32]],
];
var BOREAL = [
  [0, [46, 62, 40]],
  [0.5, [64, 80, 50]],
  [1, [84, 100, 60]],
];
var SOUTH = [
  [0, [118, 114, 58]],
  [0.5, [150, 142, 76]],
  [1, [180, 166, 96]],
];
var SAVANNAH = [
  [0, [170, 136, 70]],
  [0.5, [196, 162, 88]],
  [1, [216, 186, 112]],
];
var DUNES = [
  [0, [194, 150, 90]],
  [0.5, [220, 182, 116]],
  [1, [238, 206, 144]],
];
var SNOW = [
  [0, [212, 222, 236]],
  [0.5, [229, 236, 246]],
  [1, [243, 247, 252]],
];
var ICE = [
  [0, [160, 194, 216]],
  [0.5, [184, 212, 228]],
  [1, [208, 229, 239]],
];
var DEEP = [
  [0, [0, 51, 118]],
  [0.5, [1, 63, 136]],
  [1, [6, 75, 154]],
];

//the colours the beach of a frozen shore takes, dark to light
var FROST = [
  [0, [190, 202, 218]],
  [1, [238, 243, 249]],
];

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t));

  for (var i = 1; i < stops.length; i++)
    if (t <= stops[i][0])
      return mix(
        stops[i - 1][1],
        stops[i][1],
        (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
      );

  return stops[stops.length - 1][1].slice();
}

function smoothstep(a, b, x) {
  var t = Math.max(0, Math.min(1, (x - a) / (b - a)));

  return t * t * (3 - 2 * t);
}

//water: palette's blues under a gentle swell, ripples running level across
//the screen - along u + v - broken up into short lines of light, and the
//odd trough of shade
function ripples(s, palette, light, dark) {
  var c = ramp(palette, 0.5 + 0.28 * s.noise("field", 2.5, 2)),
    ripple = Math.sin(
      2 * Math.PI * 3 * (s.u + s.v) + 1.6 * s.noise("warp", 2, 1),
    ),
    dash = s.noise("dash", 9, 1);

  if (ripple > 0.9 && dash > 0.15) c = mix(c, light, 0.55);
  else if (ripple < -0.93 && dash < -0.25) c = mix(c, dark, 0.5);

  return grain(c, s, 0.03, 2);
}

//brightness and every channel a little off, pixel by pixel, the way the grass is
function grain(c, s, brightness, channel) {
  var b = 1 + brightness * (2 * s.random(1) - 1);

  return [
    c[0] * b + channel * (2 * s.random(2) - 1),
    c[1] * b + channel * (2 * s.random(3) - 1),
    c[2] * b + channel * (2 * s.random(4) - 1),
  ];
}

//decoration shapes: a list of [dx, dy, colour or darkening] around the pixel
//it is put at. The light comes from the right, so shadows fall to the left
function dot(colours) {
  return function (pick) {
    return [[0, 0, pick(colours)]];
  };
}

function pebble(colours) {
  return function (pick) {
    return [
      [0, 0, pick(colours)],
      [-1, 0, 0.7],
    ];
  };
}

function tuft(light, dark) {
  return function () {
    return [
      [0, 0, light],
      [0, 1, dark],
    ];
  };
}

function shrub(colour, dark) {
  return function () {
    return [
      [0, 0, colour],
      [1, 0, colour],
      [0, -1, mix(colour, [255, 255, 255], 0.15)],
      [0, 1, dark],
      [-1, 0, 0.6],
      [-1, 1, 0.7],
    ];
  };
}

/* --- Randomness ------------------------------------------------------- */

function hashString(s) {
  var h = 2166136261;

  for (var i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);

  return h >>> 0;
}

//0..1, the same for the same numbers
function hash() {
  var h = 0x9e3779b9;

  for (var i = 0; i < arguments.length; i++) {
    h = Math.imul(h ^ (arguments[i] | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }

  return (h >>> 0) / 4294967296;
}

var simplexes = {};

function simplex(key) {
  return simplexes[key] || (simplexes[key] = new SimplexNoise(key));
}

/**
 * Simplex noise over a tile that wraps round: the same at u = 0 as at u = 1,
 * and at v = 0 as at v = 1, so that it runs on across every edge into the
 * next tile. It goes round a torus in four dimensions; scale is about how many
 * blobs there are across the tile.
 */
function periodic(noise, u, v, scale, octaves) {
  var a = 2 * Math.PI * u,
    b = 2 * Math.PI * v,
    sum = 0,
    amp = 1,
    norm = 0;

  for (var o = 0; o < (octaves || 1); o++) {
    var r = (scale * (1 << o)) / (2 * Math.PI);

    sum +=
      amp *
      noise.noise4D(
        r * Math.cos(a),
        r * Math.sin(a),
        r * Math.cos(b),
        r * Math.sin(b),
      );
    norm += amp;
    amp /= 2;
  }

  //simplex seldom goes past 0.7 either way
  return Math.max(-1, Math.min(1, (sum / norm) * 1.4));
}

var cellsets = {};

/**
 * n x n points, one in every cell of a grid over the tile, wrapping round like
 * periodic() does.
 */
function cellset(key, n) {
  var k = key + "#" + n,
    points = cellsets[k];

  if (points === undefined) {
    points = cellsets[k] = new Float64Array(n * n * 3);

    for (var i = 0; i < n * n; i++) {
      points[i * 3] = ((i % n) + hash(hashString(k), i, 0)) / n;
      points[i * 3 + 1] = (((i / n) | 0) + hash(hashString(k), i, 1)) / n;
      points[i * 3 + 2] = hash(hashString(k), i, 2);
    }
  }

  return points;
}

/**
 * Distances to the nearest point and to the one after it - the two are the
 * same along the cracks between slabs - and the tone of the slab the point is
 * in.
 */
function worley(points, n, u, v) {
  var ci = Math.floor(u * n),
    cj = Math.floor(v * n),
    f1 = Infinity,
    f2 = Infinity,
    tone = 0;

  for (var dj = -1; dj <= 1; dj++) {
    for (var di = -1; di <= 1; di++) {
      var a = ci + di,
        b = cj + dj,
        wa = ((a % n) + n) % n,
        wb = ((b % n) + n) % n,
        k = (wb * n + wa) * 3,
        du = points[k] + (a - wa) / n - u,
        dv = points[k + 1] + (b - wb) / n - v,
        d = Math.sqrt(du * du + dv * dv);

      if (d < f1) {
        f2 = f1;
        f1 = d;
        tone = points[k + 2];
      } else if (d < f2) f2 = d;
    }
  }

  return { f1: f1, f2: f2, tone: tone };
}

/* --- Geometry --------------------------------------------------------- */

//heights of the corners, relative to the W one, from a slope code
function heights(slope) {
  return { w: 0, n: +slope[1] - 2, e: +slope[2] - 2, s: +slope[3] - 2 };
}

/**
 * Where on the picture the corners are: the W corner is always half way down
 * row 23 at its left edge, a flat tile is 64 across and 32 down, and every
 * step of height lifts a corner HEIGHT_STEP pixels.
 */
function screenCorners(z) {
  return {
    w: [0, 23.5],
    n: [32, 7.5 - HEIGHT_STEP * z.n],
    e: [64, 23.5 - HEIGHT_STEP * z.e],
    s: [32, 39.5 - HEIGHT_STEP * z.s],
  };
}

/**
 * The diagonal a tile that is not flat folds along, as the grass pictures
 * are painted: the one whose ends are at the same height - of a saddle, where
 * both are, the lower pair. null for a tile that is a plane.
 */
function fold(z) {
  var ns = z.n === z.s,
    we = z.w === z.e;

  if (z.n + z.s === z.w + z.e) return null;
  if (ns && we) return z.n < z.w ? "ns" : "we";

  return ns ? "ns" : "we";
}

function barycentric(p, a, b, c) {
  var d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]),
    l1 = ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / d,
    l2 = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / d;

  return [l1, l2, 1 - l1 - l2];
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Every pixel of a slope's picture that is ground, with the point of the tile
 * it shows (u, v), how high the ground is there (h, in steps over the W
 * corner), the quarter of the tile it is in (for the light on it), and
 * whether it is on the outline. The outline is the corners joined up: a pixel
 * is ground where its middle is on the face it would show, edges included -
 * so two tiles side by side meet without a gap.
 */
function surface(slope) {
  var z = heights(slope),
    p = screenCorners(z),
    f = fold(z) || "ns",
    index = new Int32Array(WIDTH * HEIGHT).fill(-1),
    pixels = [],
    x,
    y;

  function faceAt(x, y) {
    var q = [x + 0.5, y + 0.5],
      north = q[1] < p.w[1] + ((p.e[1] - p.w[1]) * q[0]) / WIDTH,
      west = q[0] < WIDTH / 2,
      tri =
        f === "we"
          ? north
            ? ["w", "n", "e"]
            : ["w", "e", "s"]
          : west
            ? ["w", "n", "s"]
            : ["n", "e", "s"],
      l = barycentric(q, p[tri[0]], p[tri[1]], p[tri[2]]),
      e = -1e-9;

    if (l[0] < e || l[1] < e || l[2] < e) return null;

    return { q: q, tri: tri, l: l, north: north, west: west };
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && faceAt(x, y) !== null;
  }

  for (y = 0; y < HEIGHT; y++) {
    for (x = 0; x < WIDTH; x++) {
      var a = x >= 0 && y >= 0 ? faceAt(x, y) : null;

      if (a === null) continue;

      var tri = a.tri,
        l = a.l,
        u =
          l[0] * CORNERS[tri[0]][0] +
          l[1] * CORNERS[tri[1]][0] +
          l[2] * CORNERS[tri[2]][0],
        v =
          l[0] * CORNERS[tri[0]][1] +
          l[1] * CORNERS[tri[1]][1] +
          l[2] * CORNERS[tri[2]][1];

      index[y * WIDTH + x] = pixels.length;
      pixels.push({
        i: y * WIDTH + x,
        x: x,
        y: y,
        u: clamp01(u),
        v: clamp01(v),
        h: l[0] * z[tri[0]] + l[1] * z[tri[1]] + l[2] * z[tri[2]],
        quad: (a.north ? "n" : "s") + (a.west ? "w" : "e"),
        rim:
          !inside(x - 1, y) ||
          !inside(x + 1, y) ||
          !inside(x, y - 1) ||
          !inside(x, y + 1),
      });
    }
  }

  return { slope: slope, fold: fold(z), pixels: pixels, index: index };
}

/* --- Light ------------------------------------------------------------ */

//the sun the buildings are lit by (shared/gen/isobox SUN), in the tile's own
//u, v and up - the same way round as the boxes' x, y and z
var SUN = (function () {
  var l = [-0.45, 0.35, 1],
    n = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]);

  return [l[0] / n, l[1] / n, l[2] / n];
})();
//how high a step is, in tiles: 8 units up to the 32 a tile is across, as the
//boxes have it
var STEP_HEIGHT = 8 / 32;
//how much more a slope is lit or shaded than the boxes would be at that
//angle - the ground's steps are gentle, and a hill should still read as one
var CONTRAST = 1.8;
//how dark the outline of a tile is, painted into it: not at all - the grid
//is laid over the tiles on its own (paintGrid)
var RIM = 1;
//how see-through black the grid is, along every edge of every tile - so
//where two tiles meet, a line two pixels wide, as the tiles drawn by hand
//had it
var GRID_ALPHA = 0.14;

/**
 * How light a face looking along n is, the way isobox lit() has it: as a box's
 * top where it looks straight up, its left side looking towards -x, its right
 * side towards -y - a fraction to lighten by, or under 0 to darken by.
 */
function boxLight(n) {
  var l = n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2],
    up = SUN[2],
    left = -SUN[0],
    right = -SUN[1];

  if (l >= left) return -0.1 + ((l - left) / (up - left)) * 0.32;

  return -0.3 + ((l - right) / (left - right)) * 0.2;
}

/**
 * The light on each face of every slope: how much lighter than flat ground it
 * is, or under 0 how much darker, by the quarter of the tile; and how dark the
 * outline is.
 */
function computeLight() {
  var flat = boxLight([0, 0, 1]),
    faces = {};

  function normal(z, tri) {
    var a = tri.map(function (k) {
        return [CORNERS[k][0], CORNERS[k][1], z[k] * STEP_HEIGHT];
      }),
      d1 = [a[1][0] - a[0][0], a[1][1] - a[0][1], a[1][2] - a[0][2]],
      d2 = [a[2][0] - a[0][0], a[2][1] - a[0][1], a[2][2] - a[0][2]],
      n = [
        d1[1] * d2[2] - d1[2] * d2[1],
        d1[2] * d2[0] - d1[0] * d2[2],
        d1[0] * d2[1] - d1[1] * d2[0],
      ],
      len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]),
      up = n[2] < 0 ? -1 : 1;

    return [(n[0] / len) * up, (n[1] / len) * up, (n[2] / len) * up];
  }

  SLOPES.forEach(function (slope) {
    var z = heights(slope),
      f = fold(z),
      //each face, and the quarters of the tile it takes
      split =
        f === null || f === "ns"
          ? [
              [
                ["w", "n", "s"],
                ["nw", "sw"],
              ],
              [
                ["n", "e", "s"],
                ["ne", "se"],
              ],
            ]
          : [
              [
                ["w", "n", "e"],
                ["nw", "ne"],
              ],
              [
                ["w", "e", "s"],
                ["sw", "se"],
              ],
            ];

    faces[slope] = {};
    split.forEach(function (face) {
      var l = (boxLight(normal(z, face[0])) - flat) * CONTRAST;

      face[1].forEach(function (q) {
        faces[slope][q] = l;
      });
    });
  });

  return { faces: faces, rim: RIM };
}

function shade(c, light, look) {
  if (light >= 0) {
    var k = light * look.lit;

    return [
      c[0] + (255 - c[0]) * k,
      c[1] + (255 - c[1]) * k,
      c[2] + (255 - c[2]) * k,
    ];
  }

  return [
    c[0] * (1 + light * look.dark * look.shadow[0]),
    c[1] * (1 + light * look.dark * look.shadow[1]),
    c[2] * (1 + light * look.dark * look.shadow[2]),
  ];
}

/* --- Painting --------------------------------------------------------- */

function blank() {
  return {
    width: WIDTH,
    height: HEIGHT,
    data: new Uint8ClampedArray(WIDTH * HEIGHT * 4),
  };
}

function put(image, i, c, alpha) {
  image.data[i * 4] = Math.max(0, Math.min(255, Math.round(c[0])));
  image.data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(c[1])));
  image.data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(c[2])));
  image.data[i * 4 + 3] = alpha === undefined ? 255 : alpha;
}

/**
 * What a tileset's albedo() gets for a pixel.
 */
function Sampler(key, variant, slope) {
  this.key = key;
  this.variant = variant;
  this.salt = hashString(key + "/" + slope + "/" + variant);
}

Sampler.prototype.at = function (p) {
  this.u = p.u;
  this.v = p.v;
  this.x = p.x;
  this.y = p.y;
  //1 in the middle, 0 at the edges
  this.pin = smoothstep(0, PIN, Math.min(p.u, 1 - p.u, p.v, 1 - p.v));

  return this;
};

Sampler.prototype.noise = function (name, scale, octaves) {
  var shared = periodic(
    simplex(this.key + "/" + name),
    this.u,
    this.v,
    scale,
    octaves,
  );

  if (this.pin === 0) return shared;

  return (
    shared +
    (periodic(
      simplex(this.key + "/" + name + "/" + this.variant),
      this.u,
      this.v,
      scale,
      octaves,
    ) -
      shared) *
      this.pin
  );
};

/**
 * @param [warp] {number} how far the cells are pushed about, so they are not
 *        so evenly round
 */
Sampler.prototype.cells = function (name, n, warp) {
  var u = this.u,
    v = this.v;

  if (warp) {
    u += warp * this.noise(name + "/warp-u", 3, 2);
    v += warp * this.noise(name + "/warp-v", 3, 2);
  }

  var shared = worley(cellset(this.key + "/" + name, n), n, u, v);

  if (this.pin === 0) return shared;

  var own = worley(
    cellset(this.key + "/" + name + "/" + this.variant, n),
    n,
    u,
    v,
  );

  return {
    f1: shared.f1 + (own.f1 - shared.f1) * this.pin,
    f2: shared.f2 + (own.f2 - shared.f2) * this.pin,
    tone: this.pin < 0.5 ? shared.tone : own.tone,
  };
};

Sampler.prototype.random = function (salt) {
  return hash(this.salt, this.x, this.y, salt);
};

/**
 * A base tile of a painted tileset: its ground at every pixel, decorations
 * stamped over it, lit as the grass is on that slope.
 */
function paintBase(set, slope, variant, surf, light, seed) {
  var sampler = new Sampler(seed + "/" + set.id, variant, slope),
    albedo = new Float32Array(WIDTH * HEIGHT * 3),
    image = blank();

  surf.pixels.forEach(function (p) {
    var c = set.albedo(sampler.at(p));

    albedo[p.i * 3] = c[0];
    albedo[p.i * 3 + 1] = c[1];
    albedo[p.i * 3 + 2] = c[2];
  });

  (set.decorations || []).forEach(function (decoration, d) {
    surf.pixels.forEach(function (p) {
      if (
        Math.min(p.u, 1 - p.u, p.v, 1 - p.v) < DECORATION_MARGIN ||
        hash(sampler.salt, p.x, p.y, 100 + d) >= decoration.density
      )
        return;

      var cells = decoration.cells(function (list) {
        return list[
          Math.floor(hash(sampler.salt, p.x, p.y, 200 + d) * list.length)
        ];
      });

      cells.forEach(function (cell) {
        var x = p.x + cell[0],
          y = p.y + cell[1];

        if (
          x < 0 ||
          y < 0 ||
          x >= WIDTH ||
          y >= HEIGHT ||
          surf.index[y * WIDTH + x] < 0
        )
          return;

        var i = (y * WIDTH + x) * 3;

        for (var c = 0; c < 3; c++)
          albedo[i + c] =
            typeof cell[2] === "number" ? albedo[i + c] * cell[2] : cell[2][c];
      });
    });
  });

  surf.pixels.forEach(function (p) {
    var c = shade(
      [albedo[p.i * 3], albedo[p.i * 3 + 1], albedo[p.i * 3 + 2]],
      light.faces[slope][p.quad],
      set.look,
    );

    if (p.rim) {
      var r = 1 - (1 - light.rim) * set.look.rim;

      c = [c[0] * r, c[1] * r, c[2] * r];
    }

    put(image, p.i, c);
  });

  return image;
}

/**
 * A diffuse tile: the tileset's base tile of that slope where its ground
 * spills over the edge or the corner, see-through everywhere else.
 */
function paintDiffuse(set, base, slope, dir, variant, surf, seed) {
  var e = set.edge,
    key = seed + "/" + set.id,
    wander = simplex(key + "/border/" + dir + "/" + variant),
    clump = simplex(key + "/clump"),
    salt = hashString(key + "/" + slope + "/" + dir + "/" + variant),
    corner = DIRECTIONS[dir].kind === "corner" ? CORNERS[dir] : null,
    //the border is as long as an edge, or as the arc round a corner
    length = corner ? (Math.PI / 2) * e.depth : 1,
    covered = new Uint8Array(WIDTH * HEIGHT),
    image = blank();

  surf.pixels.forEach(function (p) {
    var d, t;

    if (corner) {
      var du = Math.abs(p.u - corner[0]),
        dv = Math.abs(p.v - corner[1]);

      d = Math.sqrt(du * du + dv * dv);
      t = Math.atan2(dv, du) / (Math.PI / 2);
    } else {
      var dt = EDGES[dir](p.u, p.v);

      d = dt[0];
      t = dt[1];
    }

    //wanders in the middle, and comes to exactly depth at the ends
    var w =
        wander.noise2D(t * length * e.waves, 0) * 0.7 +
        wander.noise2D(t * length * e.waves * 2.3, 7.1) * 0.3,
      border =
        e.depth +
        e.amp * w * smoothstep(0, 0.25, t) * smoothstep(0, 0.25, 1 - t),
      beyond = d - border,
      fringe =
        e.grain * (2 * hash(salt, p.x, p.y, 1) - 1) +
        (1 - e.grain) * periodic(clump, p.u, p.v, e.clump, 2);

    if (beyond / e.soft < fringe) covered[p.i] = 1;
    else if (
      e.specks > 0 &&
      beyond < e.reach &&
      hash(salt, p.x, p.y, 2) < e.specks * Math.pow(1 - beyond / e.reach, 2)
    )
      covered[p.i] = 1;
  });

  surf.pixels.forEach(function (p) {
    if (!covered[p.i]) return;

    var c = [
        base.data[p.i * 4],
        base.data[p.i * 4 + 1],
        base.data[p.i * 4 + 2],
      ],
      left = surf.index[p.i - 1];

    //the edge of it facing away from the light is a little in shade
    if (e.lip > 0 && p.x > 0 && left >= 0 && !covered[p.i - 1])
      c = [c[0] * e.lip, c[1] * e.lip, c[2] * e.lip];

    put(image, p.i, c);
  });

  return image;
}

function mean(image) {
  var sum = [0, 0, 0],
    n = 0;

  for (var k = 0; k < image.data.length; k += 4) {
    if (image.data[k + 3] === 0) continue;

    sum[0] += image.data[k];
    sum[1] += image.data[k + 1];
    sum[2] += image.data[k + 2];
    n++;
  }

  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

//a 4 by 4 ordered dither, 0..1. Every tile is put down a multiple of 4
//pixels from the next, so it runs on across them unbroken
var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function bayer(x, y) {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

//how far up a shore, in steps over its lowest corner, the water comes, the
//wet sand, and the sand before it has thinned out into the ground - and how
//wide each one's dither is
var SHORE = {
  water: 0.3,
  waterDither: 0.12,
  wet: 0.42,
  wetDither: 0.14,
  sand: 0.74,
  sandDither: 0.42,
  //how far the noise pushes all of it up and down the slope
  ragged: 0.12,
  //over this, a step below the ground that is no shore, there is no sand
  top: 0.9,
};

/**
 * A shore tile of water tileset set on that slope: see-through except where
 * the water comes up it, and the beach above the water - by how high the
 * ground is, which runs on from tile to tile, ragged by noise that wraps
 * round every tile the same, and dithered from one into the next. The water
 * is flat, the water of the set's own tiles; the beach is lit as the ground
 * under it is.
 */
function paintShore(set, slope, surf, light, seed) {
  var image = blank(),
    sampler = new Sampler(seed + "/" + set.id, 0, slope),
    z = heights(slope),
    low = Math.min(z.w, z.n, z.e, z.s),
    key = seed + "/shore",
    big = simplex(key + "/big"),
    small = simplex(key + "/small"),
    tone = simplex(key + "/tone"),
    salt = hashString(key + "/" + slope);

  surf.pixels.forEach(function (p) {
    var n =
        0.65 * periodic(big, p.u, p.v, 3, 2) +
        0.35 * periodic(small, p.u, p.v, 9, 1),
      t = p.h - low + SHORE.ragged * n,
      d = bayer(p.x, p.y) - 0.5,
      r = hash(salt, p.x, p.y) - 0.5,
      c;

    if (t + d * SHORE.waterDither + r * 0.03 < SHORE.water) {
      c = set.albedo(sampler.at(p));
      //the water at the very edge of it is shallower, and lighter
      if (t > SHORE.water * 0.6) c = mix(c, [120, 176, 196], 0.3);
      if (p.rim) {
        var w = 1 - (1 - light.rim) * set.look.rim;

        c = [c[0] * w, c[1] * w, c[2] * w];
      }
      put(image, p.i, c);
      return;
    }

    if (t + d * SHORE.wetDither + r * 0.04 < SHORE.wet)
      c = set.beach ? set.beach(0.85) : WET_SAND;
    else if (
      t + d * SHORE.sandDither + r * 0.1 < SHORE.sand &&
      //none at the top of the tile: the ground above it has no sand
      p.h - low < SHORE.top
    )
      c = set.beach
        ? set.beach(1 + 0.15 * periodic(tone, p.u, p.v, 5, 1))
        : ramp(SAND, 0.5 + 0.4 * periodic(tone, p.u, p.v, 5, 1) + r * 0.3);
    else return;

    c = shade(c, light.faces[slope][p.quad], {
      lit: 1,
      dark: 1,
      shadow: [1, 1, 1],
    });
    if (p.rim) c = [c[0] * light.rim, c[1] * light.rim, c[2] * light.rim];

    put(image, p.i, c);
  });

  return image;
}

/**
 * The grid over a tile of that slope: see-through black along its outline,
 * all round - nothing else.
 */
function paintGrid(surf) {
  var image = blank();

  surf.pixels.forEach(function (p) {
    if (p.rim) put(image, p.i, [0, 0, 0], Math.round(GRID_ALPHA * 255));
  });

  return image;
}

/* --- Output ----------------------------------------------------------- */

function hex(c) {
  return (
    "#" +
    c
      .map(function (x) {
        return ("0" + Math.round(x).toString(16)).slice(-2);
      })
      .join("")
  );
}

var DEFAULTS = {
  seed: "isometrica",
  variants: 2,
  diffuseVariants: 2,
  diffuse: true,
  tilesets: null,
};

/**
 * Paints one tile at a time, as it is asked for - and only what that tile
 * takes: a base another tile is painted from is painted once and kept.
 *
 * @param [sources] {Object} nothing: the terrain is painted from nothing.
 *        Kept so that callers handing it what they used to need not change
 * @param [o] {Object} seed, "isometrica" unless given; variants, of every
 *        base tile of a tileset that does not say how many it has, 2;
 *        diffuseVariants, 2
 */
export function createPainter(sources, o) {
  o = Object.assign({}, DEFAULTS, o);

  var slopes = SLOPES.slice(),
    surfaces = {},
    light = null,
    bases = {};

  function surfaceOf(slope) {
    return surfaces[slope] || (surfaces[slope] = surface(slope));
  }

  function lightOf() {
    return light || (light = computeLight());
  }

  function variantsOf(id) {
    return TILESETS[id].variants || o.variants;
  }

  /**
   * A tileset's ground as it is on that slope, variant v.
   */
  function base(id, slope, v) {
    var key = id + "/" + slope + "/" + v;

    if (bases[key] === undefined)
      bases[key] = paintBase(
        TILESETS[id],
        slope,
        v,
        surfaceOf(slope),
        lightOf(),
        o.seed,
      );

    return bases[key];
  }

  function diffuse(id, slope, dir, v) {
    return paintDiffuse(
      TILESETS[id],
      base(id, slope, v % variantsOf(id)),
      slope,
      dir,
      v,
      surfaceOf(slope),
      o.seed,
    );
  }

  function hasShore(slope) {
    return slope !== FLAT;
  }

  function shore(id, slope) {
    if (!hasShore(slope)) return null;

    return paintShore(TILESETS[id], slope, surfaceOf(slope), lightOf(), o.seed);
  }

  return {
    slopes: slopes,
    variantsOf: variantsOf,
    base: base,
    diffuse: diffuse,
    shore: shore,
    hasShore: hasShore,
    grid: function (slope) {
      return paintGrid(surfaceOf(slope));
    },

    /**
     * One tile, by where the manifest says it is - "grass/base/2222_0.png",
     * "grass/diffuse/2222_ne_1.png" or "water_deep/shore/2101.png".
     */
    paint: function (rel) {
      var g = /^grid\/(\d{4})\.png$/.exec(rel);

      if (g !== null) return paintGrid(surfaceOf(g[1]));

      var m =
        /^([a-z_]+)\/(base|diffuse|shore)\/(\d{4})(?:_([a-z]+))?(?:_(\d+))?\.png$/.exec(
          rel,
        );

      if (m === null || TILESETS[m[1]] === undefined)
        throw new Error("no such tile: " + rel);

      if (m[2] === "base") return base(m[1], m[3], +m[5]);
      if (m[2] === "diffuse") return diffuse(m[1], m[3], m[4], +m[5]);

      var picture = shore(m[1], m[3]);

      if (picture === null) throw new Error("no such tile: " + rel);

      return picture;
    },
  };
}

/**
 * What generate paints, without painting it: the manifest of the tilesets -
 * every tile of them, where it goes and how they fit together - and every
 * tile's size.
 *
 * @param sources {Object} as createPainter takes them
 * @param [o] {Object} as createPainter takes it; and diffuse, false for no
 *        diffuse tiles at all; tilesets, the ids to paint, every one unless
 *        given - with any water, the shallows its shore is painted from come
 *        as well
 * @returns {{manifest: Object, sizes: Object}} sizes, {w, h} of every tile
 *          by where the manifest says it is, "grass/base/2222_0.png"
 */
export function describe(sources, o) {
  o = Object.assign({}, DEFAULTS, o);

  var painter = createPainter(sources, o),
    slopes = painter.slopes,
    sizes = {},
    ids = PRECEDENCE.filter(function (id) {
      return (
        o.tilesets === null ||
        o.tilesets.indexOf(id) !== -1 ||
        (id === "water_shallow" &&
          o.tilesets.some(function (other) {
            return TILESETS[other].kind === "water";
          }))
      );
    }),
    manifest = {
      generator: "src/shared/gen/terrain.js",
      seed: o.seed,
      tile: {
        width: WIDTH,
        height: HEIGHT,
        pivot: [0, 23],
        heightStep: HEIGHT_STEP,
      },
      slopes: slopes,
      slopeCode:
        "2000 + (N - W + 2) * 100 + (E - W + 2) * 10 + (S - W + 2): corner heights clockwise from the left one; " +
        "grid (x, y) has S at (x, y), E at (x + 1, y), N at (x + 1, y + 1), W at (x, y + 1)",
      directions: DIRECTIONS,
      precedence: PRECEDENCE,
      compose: [
        "Draw the tile's base, variant picked by position.",
        'For every direction whose neighbour\'s tileset is in transitions[own][neighbour] as "diffuse", draw the neighbour ' +
          "tileset's diffuse[slope][direction], in precedence order, lowest first. Skip a corner when either of its edges " +
          "already gets the same tileset.",
        "If the tile is a shore (some corner, not all, at or below the water), draw shore[slope] of its water body " +
          "(the tileset's waterBody hint, unless the world says otherwise) last - water is above all ground.",
      ],
      tilesets: {},
      transitions: {},
    };

  function tile(rel) {
    sizes[rel] = { w: WIDTH, h: HEIGHT };

    return rel;
  }

  ids.forEach(function (id) {
    var set = TILESETS[id],
      own = set.slopes || slopes,
      entry = {
        name: set.name,
        description: set.description,
        kind: set.kind,
        precedence: PRECEDENCE.indexOf(id),
        source: "generated",
        slopes: own,
        base: {},
        diffuse: {},
      };

    if (set.waterBody) entry.waterBody = set.waterBody;

    own.forEach(function (slope) {
      entry.base[slope] = [];

      for (var v = 0; v < painter.variantsOf(id); v++)
        entry.base[slope].push(tile(id + "/base/" + slope + "_" + v + ".png"));

      if (!o.diffuse) return;

      entry.diffuse[slope] = {};
      Object.keys(DIRECTIONS).forEach(function (dir) {
        entry.diffuse[slope][dir] = [];

        for (var v = 0; v < o.diffuseVariants; v++)
          entry.diffuse[slope][dir].push(
            tile(id + "/diffuse/" + slope + "_" + dir + "_" + v + ".png"),
          );
      });
    });

    manifest.tilesets[id] = entry;
  });

  //shores: every water has one for every slope with a lowest corner
  var waters = ids.filter(function (id) {
    return TILESETS[id].kind === "water";
  });

  waters.forEach(function (id) {
    manifest.tilesets[id].shore = {};
  });
  slopes.forEach(function (slope) {
    if (!painter.hasShore(slope)) return;

    waters.forEach(function (id) {
      manifest.tilesets[id].shore[slope] = tile(
        id + "/shore/" + slope + ".png",
      );
    });
  });

  //transitions[under][over]: what over draws on a tile of under
  ids.forEach(function (under, i) {
    manifest.transitions[under] = {};

    ids.slice(i + 1).forEach(function (over) {
      manifest.transitions[under][over] =
        TILESETS[over].kind === "water" && TILESETS[under].kind === "land"
          ? "shore"
          : "diffuse";
    });
  });

  return { manifest: manifest, sizes: sizes };
}

/**
 * Paints the tilesets, every tile describe lists - and the colour of each,
 * the mean of its flat ground.
 *
 * @param sources {Object} as createPainter takes them
 * @param [o] {Object} as describe takes it
 * @returns {{manifest: Object, images: Object}} every picture by where the
 *          manifest says it is, "grass/base/2222_0.png"
 */
export function generate(sources, o) {
  var described = describe(sources, o),
    painter = createPainter(sources, o),
    images = {};

  Object.keys(described.sizes).forEach(function (rel) {
    images[rel] = painter.paint(rel);
  });

  Object.keys(described.manifest.tilesets).forEach(function (id) {
    described.manifest.tilesets[id].color = hex(
      mean(painter.base(id, FLAT, 0)),
    );
  });

  return { manifest: described.manifest, images: images };
}

//a tileset knows its own id, which its painting is seeded with
Object.keys(TILESETS).forEach(function (id) {
  TILESETS[id].id = id;
});

export { WIDTH, HEIGHT, FLAT, PRECEDENCE, SHORE };

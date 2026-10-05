/**
 * The old town: the walled heart of a town as it was before the town grew
 * round it, painted out of boxes the way the houses are (shared/gen/houses)
 * - every one painted whole, each of its tiles what the whole shows on that
 * tile (onTile). It is what a village trades in from the start, next to its
 * cottages, and what the town keeps of its past later on: a medina.
 *
 * Narrow houses of three storeys and two, half-timbered or rendered in ochre,
 * rose, sky blue, sage or stone, their steep gables to the lanes; on their
 * ground floors the craftsmen's shops - the smith with his anvil, the baker,
 * the cooper with his barrels, the potter, the weaver - each with its sign
 * hanging out over the lane. A market square with stalls round a well or a
 * fountain; a church with its tower and spire in a churchyard; a guild hall
 * with an arcade. Cobbles everywhere, and narrow lanes between it all.
 *
 *   - 1x2, 1x3: a lane of craftsmen's houses, or a row of them along a
 *     yard with a smithy and a well;
 *   - 2x2: a market square with its stalls and houses round it, or a church
 *     with houses beside it;
 *   - 2x3: a square before a church, or a street of craftsmen with a well;
 *   - 3x3: all of it at once - the square and its fountain, the church, the
 *     guild hall and the craftsmen's lanes.
 *
 * Each comes either way round (side), in a scheme of colours and under
 * tiles or slates. Nothing tall stands within a margin of its edges: that
 * is lane, cobbled, and where an old town ends the wall goes along it (see
 * wall below) - so two of them side by side make one town, a lane between
 * them, and the wall goes round the both of them.
 *
 * The town wall is put together by whoever draws the old town
 * (client/compoundbuilding walled), tile by tile, by which of a tile's edges
 * have old town beyond them and which do not: stone with battlements along
 * those that do not, a tower where two of them meet, a gatehouse where a
 * road comes up to it and in the middle of the front.
 */
import * as iso from "./isobox.js";
import {
  box,
  darker,
  lighter,
  TILE,
  STOREY,
  GRASS,
  WOOD,
  CONCRETE,
  GLASSY,
  LIT,
  made,
  madeOf,
  random,
  namesOf,
  tree,
  bench,
  turnPoint,
  measureOnTile,
  TURNS,
} from "./blocks.js";
import {
  face,
  windowOn,
  windowsOn,
  doorOn,
  walls,
  cypress,
  well,
  woodpile,
  fountain,
  site,
  SH,
} from "./houses.js";
import { stall, farmTrailer, COBBLES, GOODS, CANOPIES } from "./shops.js";

var GLASS = [92, 126, 160],
  STAINED = [70, 92, 150],
  IRON = [46, 46, 54],
  GOLD = [214, 178, 64],
  STONE = madeOf([186, 178, 162], "stone"),
  WALL_STONE = madeOf([172, 164, 146], "stone"),
  CHURCH_STONE = madeOf([206, 196, 176], "stone"),
  CHURCHYARD = madeOf([116, 160, 84], "grass"),
  SLABS = madeOf([190, 182, 166], "slabs");

//how far in from the edges of an old town nothing tall stands: the lane
//round it, and the wall where it ends
var M = 5;

//how steep the roofs are: a unit up for one across - steeper than a town
//house's, and as clean an edge, level one way and a step up for each step
//across the other
var STEEP = 1;

/* --- Colours ---------------------------------------------------------- */

//the houses' walls - beams over whitewash, render in a colour, stone with
//quoins - their trim, doors and shutters
var HOUSES = {
  timber: {
    wall: [240, 234, 216],
    trim: [86, 58, 40],
    door: [96, 62, 40],
    shutter: [124, 44, 38],
    texture: "beams",
  },
  ochre: {
    wall: [230, 186, 106],
    trim: [248, 242, 228],
    door: [112, 62, 40],
    shutter: [54, 98, 72],
  },
  rose: {
    wall: [226, 164, 152],
    trim: [250, 244, 234],
    door: [70, 82, 112],
    shutter: [62, 102, 92],
  },
  sky: {
    wall: [168, 198, 216],
    trim: [250, 248, 242],
    door: [132, 52, 42],
    shutter: [182, 142, 62],
  },
  sage: {
    wall: [178, 198, 158],
    trim: [250, 248, 238],
    door: [122, 60, 42],
    shutter: [150, 70, 50],
  },
  stone: {
    wall: [180, 170, 154],
    made: "stone",
    trim: [238, 232, 218],
    door: [82, 60, 44],
    shutter: [70, 96, 120],
    texture: "quoins",
  },
};

Object.keys(HOUSES).forEach(function (k) {
  if (HOUSES[k].made) madeOf(HOUSES[k].wall, HOUSES[k].made);
});

//which houses a town of each scheme is built of, each as likely
var SCHEMES = {
  timber: ["timber", "timber", "ochre", "stone"],
  warm: ["ochre", "rose", "timber", "stone"],
  pastel: ["rose", "sky", "sage", "ochre"],
};

//the roofs: old red tiles in a few shades, or slate
var ROOFS = {
  tiles: [
    [176, 76, 52],
    [160, 70, 50],
    [190, 96, 60],
  ],
  slate: [
    [96, 100, 112],
    [84, 88, 102],
    [108, 108, 116],
  ],
};

/* --- Roofs -------------------------------------------------------------- */

/**
 * A gable roof over r at z, its ridge along `axis`, as steep as g - each
 * slope a plane (iso cut) a unit thick, lit by which way it looks - and the
 * gable ends under it in the walls' colour. Its eaves stand out `over`.
 *
 * @returns {number} how high its ridge is over z
 */
function gable(b, r, z, axis, g, over, color, wall, finish) {
  var X0 = r.x0 - over,
    X1 = r.x1 + over,
    Y0 = r.y0 - over,
    Y1 = r.y1 + over,
    alongX = axis === "x",
    lo = alongX ? Y0 : X0,
    hi = alongX ? Y1 : X1,
    rise = (g * (hi - lo)) / 2,
    fin = finish || made(isGrey(color) ? "slate" : "tiles");

  //z + 1 over the eaves at lo, rising g along the slope; and the same down
  //from the other side
  function top(sign, at, down) {
    var n = alongX ? [0, -sign * g, 1] : [-sign * g, 0, 1];

    return iso.plane(n[0], n[1], n[2], z + 1 - sign * g * at - down);
  }

  function under(sign, at) {
    var n = alongX ? [0, sign * g, -1] : [sign * g, 0, -1];

    return iso.plane(n[0], n[1], n[2], -(z + 1 - sign * g * at - 1));
  }

  var tops = [top(1, lo, 0), top(-1, hi, 0)];

  [
    [1, lo],
    [-1, hi],
  ].forEach(function (q) {
    b.push(
      iso.cut(
        box(X0, X1, Y0, Y1, z, z + rise + 1.5, color, fin),
        tops.concat([under(q[0], q[1])]),
      ),
    );
  });

  b.push(
    iso.cut(
      box(r.x0, r.x1, r.y0, r.y1, z, z + rise + 1, wall, finishOf(wall)),
      [top(1, lo, 1), top(-1, hi, 1)],
    ),
  );

  return rise + 1;
}

/**
 * A pyramid over x0..x1, y0..y1 from z, each face as steep as g - a spire,
 * or a tower's cap.
 */
function pyramid(b, x0, x1, y0, y1, z, g, color, finish) {
  var w = Math.min(x1 - x0, y1 - y0) / 2,
    h = g * w,
    fin = finish || made(isGrey(color) ? "slate" : "tiles");

  b.push(
    iso.cut(box(x0, x1, y0, y1, z, z + h, color, fin), [
      iso.plane(0, -g, 1, z - g * y0),
      iso.plane(0, g, 1, z + g * y1),
      iso.plane(-g, 0, 1, z - g * x0),
      iso.plane(g, 0, 1, z + g * x1),
    ]),
  );

  return h;
}

function isGrey(c) {
  return Math.max.apply(null, c) - Math.min.apply(null, c) < 30;
}

//what a colour's walls are made of, if anything, else render
function finishOf(color) {
  return made(
    color === HOUSES.stone.wall ||
      color === STONE ||
      color === CHURCH_STONE ||
      color === WALL_STONE
      ? "stone"
      : "render",
  );
}

/* --- Smoke -------------------------------------------------------------- */

//the tops of the chimneys painted, while a town is painted for its smoke
var smoking = null;

//a chimney at x, y from z0 inside the roof up to z1 over it
function chimney(b, x, y, z0, z1, color) {
  if (smoking !== null) smoking.push([x + 1, y + 1, z1 + 0.6]);

  b.push(box(x, x + 2, y, y + 2, z0, z1, color, made("brick")));
  b.push(
    box(x - 0.3, x + 2.3, y - 0.3, y + 2.3, z1, z1 + 0.6, darker(color, 0.3)),
  );
}

/* --- The craftsmen ------------------------------------------------------ */

//where along a face is from where to where, and the way out of it
var OUT = { "-y": [0, -1], "+y": [0, 1], "-x": [-1, 0], "+x": [1, 0] };

function span(r, f) {
  return f === "-y" || f === "+y" ? [r.x0, r.x1] : [r.y0, r.y1];
}

//a spot `d` out of the face f at a along it, on the ground
function outside(r, f, a, d) {
  if (f === "-y") return [a, r.y0 - d];
  if (f === "+y") return [a, r.y1 + d];
  if (f === "-x") return [r.x0 - d, a];

  return [r.x1 + d, a];
}

//a box a0..a1 along the face f, out from it d0..d1
function outBox(r, f, a0, a1, d0, d1, z0, z1, color, finish) {
  return face(r, f, a0, a1, z0, z1, d0, d1, color, finish);
}

//the craftsmen and what hangs on their signs: the board's colour and the
//thing on it
var CRAFTS = {
  smith: { board: [60, 62, 70], mark: [230, 120, 40] },
  baker: { board: [120, 74, 44], mark: GOLD },
  cooper: { board: [150, 104, 68], mark: [96, 64, 44] },
  potter: { board: [236, 226, 204], mark: [196, 98, 60] },
  weaver: { board: [64, 96, 150], mark: [236, 200, 90] },
  inn: { board: [40, 90, 60], mark: GOLD },
};

var CRAFT_NAMES = Object.keys(CRAFTS);

//a barrel standing at x, y: staves and two hoops
function barrel(b, x, y) {
  b.push(box(x - 1, x + 1, y - 1, y + 1, 1, 4, [146, 98, 60]));
  b.push(box(x - 1.1, x + 1.1, y - 1.1, y + 1.1, 1.6, 2, IRON));
  b.push(box(x - 1.1, x + 1.1, y - 1.1, y + 1.1, 3, 3.4, IRON));
}

/**
 * What a craftsman has out in the lane in front of his shop, around the spot
 * x, y: the smith's anvil and his quenching tub, the baker's bench of loaves,
 * the cooper's barrels, the potter's pots, the weaver's bolts of cloth on
 * their rack, the inn's table and benches.
 */
function wares(b, craft, x, y, rnd) {
  if (craft === "smith") {
    b.push(box(x - 1.2, x + 1.2, y - 0.6, y + 0.6, 1, 2.6, [70, 50, 40]));
    b.push(box(x - 1.6, x + 1.8, y - 0.8, y + 0.8, 2.6, 3.6, [64, 66, 72]));
    b.push(box(x + 2.5, x + 4.5, y - 1, y + 1, 1, 2.6, WOOD));
    b.push(box(x + 2.8, x + 4.2, y - 0.7, y + 0.7, 2.4, 2.62, [64, 120, 170]));
  } else if (craft === "baker") {
    b.push(box(x - 2.5, x + 2.5, y - 0.8, y + 0.8, 2.4, 3, WOOD));
    [x - 2.3, x - 0.9, x + 0.5, x + 1.9].forEach(function (a) {
      b.push(box(a, a + 1.1, y - 0.6, y + 0.6, 3, 3.7, [212, 160, 90]));
    });
    [x - 2.2, x + 2].forEach(function (a) {
      b.push(box(a, a + 0.4, y - 0.6, y + 0.6, 1, 2.4, WOOD));
    });
  } else if (craft === "cooper") {
    barrel(b, x - 1.4, y);
    barrel(b, x + 1.2, y + 0.4);
    barrel(b, x, y + 2.4);
  } else if (craft === "potter") {
    b.push(box(x - 2.5, x + 2.5, y - 0.8, y + 0.8, 2.2, 2.7, WOOD));
    [x - 2.2, x - 0.6, x + 1].forEach(function (a, i) {
      b.push(
        box(a, a + 1.2, y - 0.5, y + 0.5, 2.7, 4 + (i % 2), [
          188,
          96 + i * 8,
          60,
        ]),
      );
    });
  } else if (craft === "weaver") {
    [x - 2.2, x + 2].forEach(function (a) {
      b.push(box(a, a + 0.4, y - 0.2, y + 0.2, 1, 6, WOOD));
    });
    b.push(box(x - 2.2, x + 2.4, y - 0.2, y + 0.2, 5.6, 6, WOOD));
    [
      [176, 50, 50],
      [236, 200, 90],
      [60, 110, 170],
      [90, 140, 80],
    ].forEach(function (c, i) {
      b.push(
        box(x - 1.8 + i, x - 0.9 + i, y - 0.3, y + 0.3, 2.4 + rnd(), 5.6, c),
      );
    });
  } else {
    b.push(box(x - 1.6, x + 1.6, y - 1.2, y + 1.2, 2.8, 3.3, WOOD));
    b.push(box(x - 0.4, x + 0.4, y - 0.4, y + 0.4, 1, 2.8, WOOD));
    [y - 2.2, y + 1.6].forEach(function (a) {
      b.push(box(x - 1.6, x + 1.6, a, a + 0.6, 1.8, 2.2, WOOD));
    });
    b.push(box(x - 0.6, x - 0.1, y - 0.3, y + 0.3, 3.3, 4.1, [200, 170, 90]));
  }
}

/**
 * A narrow house of the old town on r, its front - the face f - to a lane:
 * `storeys` high, its gable to the lane under a steep roof, a door and a
 * window to every bay of every floor; and on its ground floor, for a
 * craftsman's, the shop window, the sign hanging out over the lane on its
 * iron bracket, and what he makes out in front.
 *
 * @param house {{pal, storeys, craft, roof}} pal a palette of HOUSES, craft
 *        one of CRAFTS or null
 */
function townhouse(b, r, f, house, rnd) {
  var P = HOUSES[house.pal],
    top = walls(b, r, 1, house.storeys, P),
    sp = span(r, f),
    w = sp[1] - sp[0],
    mid = (sp[0] + sp[1]) / 2,
    door = house.craft ? sp[0] + 1.5 : mid - 1.75,
    k;

  doorOn(b, r, f, door, 3.5, 1.2, 8.5, P);

  //the shop window, or two windows
  if (house.craft && w > 9)
    windowOn(b, r, f, door + 5, Math.min(7, w - 9), 3, 6, P);
  else if (w > 9) windowsOn(b, r, f, [sp[0] + 1.5, sp[1] - 5], 3, 4.5, 5, P);

  //the floors over it, a window to every bay
  var n = Math.max(1, Math.floor((w - 2) / 5.5)),
    gap = (w - n * 3) / (n + 1);

  for (k = 1; k < house.storeys; k++)
    for (var i = 0; i < n; i++)
      windowOn(b, r, f, sp[0] + gap + i * (3 + gap), 3, 1 + k * SH + 3, 5, P);

  //the other faces, a window or two up the sides and the back
  ["-y", "+y", "-x", "+x"].forEach(function (g) {
    if (g === f) return;

    var s = span(r, g);

    if (s[1] - s[0] < 7) return;
    for (k = 1; k < house.storeys; k++)
      windowOn(b, r, g, (s[0] + s[1]) / 2 - 1.5, 3, 1 + k * SH + 3, 5, P);
  });

  //the roof: its ridge running back from the lane, its gable to it
  var axis = f === "-y" || f === "+y" ? "y" : "x",
    rise = gable(b, r, top, axis, STEEP, 1, house.roof, P.wall);

  //a window in the gable, and a chimney on the ridge at the back
  var gw = Math.min(3, w / 4);

  windowOn(b, r, f, mid - gw / 2, gw, top + 1.5, Math.min(4, rise - 4), P);
  if (rnd() < 0.7) {
    var cx =
        axis === "y" ? (r.x0 + r.x1) / 2 - 1 : f === "-x" ? r.x1 - 4 : r.x0 + 2,
      cy =
        axis === "x" ? (r.y0 + r.y1) / 2 - 1 : f === "-y" ? r.y1 - 4 : r.y0 + 2;

    chimney(b, cx, cy, top, top + rise + 2, darker(P.wall, 0.25));
  }

  if (!house.craft) {
    //flowers under the windows of a house of nobody's trade
    var o = OUT[f];

    for (var a = sp[0] + 5; a < sp[1] - 2; a += 6) {
      var q = outside(r, f, a, 0.6);

      b.push(
        box(
          q[0] - (o[0] ? 0.4 : 1.2),
          q[0] + (o[0] ? 0.4 : 1.2),
          q[1] - (o[1] ? 0.4 : 1.2),
          q[1] + (o[1] ? 0.4 : 1.2),
          1 + SH + 2.4,
          1 + SH + 3,
          [214, 60, 64],
        ),
      );
    }
    return;
  }

  //the sign on its bracket, out over the lane by the door
  var C = CRAFTS[house.craft],
    s = outside(r, f, door + 1.75, 0),
    o2 = OUT[f],
    z = 1 + SH - 1;

  b.push(
    box(
      Math.min(s[0], s[0] + o2[0] * 3.5) - (o2[0] ? 0 : 0.2),
      Math.max(s[0], s[0] + o2[0] * 3.5) + (o2[0] ? 0 : 0.2),
      Math.min(s[1], s[1] + o2[1] * 3.5) - (o2[1] ? 0 : 0.2),
      Math.max(s[1], s[1] + o2[1] * 3.5) + (o2[1] ? 0 : 0.2),
      z,
      z + 0.4,
      IRON,
    ),
  );

  var sx = s[0] + o2[0] * 2.5,
    sy = s[1] + o2[1] * 2.5;

  b.push(
    box(
      sx - (o2[0] ? 0.15 : 1.2),
      sx + (o2[0] ? 0.15 : 1.2),
      sy - (o2[1] ? 0.15 : 1.2),
      sy + (o2[1] ? 0.15 : 1.2),
      z - 2.6,
      z,
      C.board,
    ),
  );
  b.push(
    box(
      sx - (o2[0] ? 0.25 : 0.5),
      sx + (o2[0] ? 0.25 : 0.5),
      sy - (o2[1] ? 0.25 : 0.5),
      sy + (o2[1] ? 0.25 : 0.5),
      z - 1.8,
      z - 0.8,
      C.mark,
    ),
  );

  var at = outside(r, f, Math.min(sp[1] - 3, door + 7), 2.4);

  wares(b, house.craft, at[0], at[1], rnd);
}

/**
 * A row of houses along a lane, on the strip from a0 to a1 along it and
 * from c0 to c1 across it, their fronts to the face f: lots of their own,
 * each of the given widths along the lane, an alley left between them now
 * and then.
 *
 * @param lots {number[]} how wide each lot is along the lane
 */
function row(b, f, a0, a1, c0, c1, lots, o, rnd) {
  var a = a0,
    alongX = f === "-y" || f === "+y";

  lots.forEach(function (w, i) {
    var e = Math.min(a1, a + w);

    if (e - a < 6) return;

    var r = alongX
      ? { x0: a, x1: e, y0: c0, y1: c1 }
      : { x0: c0, x1: c1, y0: a, y1: e };

    townhouse(
      b,
      r,
      f,
      {
        pal: pick(rnd, SCHEMES[o.scheme]),
        storeys: rnd() < 0.6 ? 3 : 2,
        craft: rnd() < 0.7 ? pick(rnd, CRAFT_NAMES) : null,
        roof: pick(rnd, ROOFS[o.roof]),
      },
      rnd,
    );

    //an alley after it, now and then
    a = e + (i % 2 === 1 ? 2 : 0);
  });
}

function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

/* --- The church, the hall, the square ---------------------------------- */

/**
 * A church: its nave on r, running back from the street, under a steep roof
 * along it, buttresses between tall windows of stained glass down its sides,
 * a round window in its gable; and at its front a tower of stone with the
 * bells in the top of it under a spire, the door in its foot.
 */
function church(b, r, o) {
  var h = 18,
    mid = (r.x0 + r.x1) / 2,
    roof = o.roof === "slate" ? ROOFS.slate[1] : [150, 74, 56];

  b.push(
    box(
      r.x0 - 0.4,
      r.x1 + 0.4,
      r.y0 - 0.4,
      r.y1 + 0.4,
      1,
      2,
      darker(CHURCH_STONE, 0.2),
    ),
  );
  b.push(box(r.x0, r.x1, r.y0, r.y1, 2, h, CHURCH_STONE));

  //buttresses and tall windows down both sides
  for (var y = r.y0 + 4; y < r.y1 - 3; y += 6) {
    ["-x", "+x"].forEach(function (f) {
      b.push(outBox(r, f, y - 0.6, y + 0.6, 0, 1.4, 1, h - 3, CHURCH_STONE));
      b.push(outBox(r, f, y + 1.6, y + 4.2, 0, 0.3, 5, 14, STAINED, GLASSY));
      b.push(outBox(r, f, y + 2.4, y + 3.4, 0, 0.3, 14, 15.5, STAINED, GLASSY));
    });
  }

  gable(b, r, h, "y", STEEP, 1, roof, CHURCH_STONE, made("slate"));

  //the apse at the back, round in steps
  var ay = r.y1,
    aw = (r.x1 - r.x0) / 2 - 2;

  [aw, aw - 2, aw - 4].forEach(function (w, i) {
    b.push(box(mid - w, mid + w, ay, ay + 2 + i * 1.5, 1, h - 3, CHURCH_STONE));
  });

  //the tower at the front
  var t = { x0: mid - 5, x1: mid + 5, y0: r.y0 - 8, y1: r.y0 + 2 },
    th = 36;

  b.push(
    box(
      t.x0 - 0.5,
      t.x1 + 0.5,
      t.y0 - 0.5,
      t.y1 + 0.5,
      1,
      3,
      darker(CHURCH_STONE, 0.15),
    ),
  );
  b.push(box(t.x0, t.x1, t.y0, t.y1, 3, th, CHURCH_STONE));
  b.push(
    box(
      t.x0 - 0.3,
      t.x1 + 0.3,
      t.y0 - 0.3,
      t.y1 + 0.3,
      20,
      21,
      lighter(CHURCH_STONE, 0.1),
    ),
  );

  //the door, arched, in its foot
  b.push(outBox(t, "-y", mid - 2.2, mid + 2.2, 0, 0.3, 1.2, 10, [86, 60, 42]));
  b.push(outBox(t, "-y", mid - 1.2, mid + 1.2, 0, 0.3, 10, 11, [86, 60, 42]));
  b.push(outBox(t, "-y", mid - 3, mid + 3, 0, 0.6, 1, 1.4, CONCRETE));
  //a window over it, and the clock
  b.push(
    outBox(t, "-y", mid - 0.8, mid + 0.8, 0, 0.3, 13, 17, STAINED, GLASSY),
  );
  b.push(
    outBox(t, "-y", mid - 2, mid + 2, 0, 0.3, 22.5, 26.5, [244, 240, 228]),
  );
  b.push(outBox(t, "-y", mid - 0.25, mid + 0.25, 0, 0.4, 24.4, 26, IRON));

  //the belfry: an opening on every side
  ["-y", "+y", "-x", "+x"].forEach(function (f) {
    var s = span(t, f),
      m = (s[0] + s[1]) / 2;

    b.push(outBox(t, f, m - 2, m + 2, -0.5, 0.05, 28, 33, [40, 40, 46]));
  });
  b.push(
    box(
      t.x0 - 0.6,
      t.x1 + 0.6,
      t.y0 - 0.6,
      t.y1 + 0.6,
      th,
      th + 1,
      lighter(CHURCH_STONE, 0.1),
    ),
  );

  var sh = pyramid(
    b,
    t.x0 - 0.2,
    t.x1 + 0.2,
    t.y0 - 0.2,
    t.y1 + 0.2,
    th + 1,
    3,
    roof,
    made("slate"),
  );

  //the cross, gilt, on top
  b.push(
    box(
      mid - 0.3,
      mid + 0.3,
      (t.y0 + t.y1) / 2 - 0.3,
      (t.y0 + t.y1) / 2 + 0.3,
      th + sh,
      th + sh + 4,
      GOLD,
    ),
  );
  b.push(
    box(
      mid - 1.3,
      mid + 1.3,
      (t.y0 + t.y1) / 2 - 0.3,
      (t.y0 + t.y1) / 2 + 0.3,
      th + sh + 2.4,
      th + sh + 3,
      GOLD,
    ),
  );

  return t;
}

//a churchyard on x0..x1, y0..y1: grass, gravestones in rows, a yew or two
function churchyard(b, x0, x1, y0, y1, rnd, keep) {
  b.push(box(x0, x1, y0, y1, 1, 1.25, CHURCHYARD));

  for (var y = y0 + 3; y < y1 - 2; y += 5)
    for (var x = x0 + 2.5; x < x1 - 2; x += 4.5) {
      if (keep && !keep(x, y)) continue;
      if (rnd() < 0.35) continue;

      var grey = [150 + Math.floor(rnd() * 30), 150, 146];

      if (rnd() < 0.3) {
        b.push(box(x, x + 0.5, y, y + 0.5, 1.2, 4.6, grey));
        b.push(box(x - 0.8, x + 1.3, y, y + 0.5, 3.4, 3.9, grey));
      } else b.push(box(x, x + 1.8, y, y + 0.6, 1.2, 3.6, grey));
    }
}

/**
 * The guild hall on r, its front - the face f - to the square: an arcade of
 * columns along the ground floor, two floors of tall windows over it, a
 * stepped gable at each end over its steep roof, and the clock.
 */
function guildhall(b, r, f, o) {
  var P = HOUSES[o.scheme === "pastel" ? "ochre" : "stone"],
    h = 1 + 3 * SH,
    sp = span(r, f),
    roof = o.roof === "slate" ? ROOFS.slate[0] : ROOFS.tiles[1];

  b.push(box(r.x0, r.x1, r.y0, r.y1, 1, h, P.wall, finishOf(P.wall)));
  b.push(
    box(
      r.x0 - 0.2,
      r.x1 + 0.2,
      r.y0 - 0.2,
      r.y1 + 0.2,
      1 + SH - 0.4,
      1 + SH + 0.4,
      P.trim,
    ),
  );

  //the arcade: the ground floor's face in shadow behind its columns
  for (var a = sp[0] + 1; a < sp[1] - 2; a += 5) {
    b.push(
      outBox(r, f, a + 1, a + 4, -0.1, 0.05, 1.2, 1 + SH - 2, [70, 60, 54]),
    );
    b.push(outBox(r, f, a, a + 1, 0, 1.2, 1, 1 + SH - 0.4, P.trim));
  }
  b.push(outBox(r, f, sp[1] - 1, sp[1], 0, 1.2, 1, 1 + SH - 0.4, P.trim));

  for (var k = 1; k < 3; k++)
    for (a = sp[0] + 2; a < sp[1] - 3; a += 5)
      windowOn(b, r, f, a, 2.6, 1 + k * SH + 2.5, 7, P);

  var axis = f === "-y" || f === "+y" ? "x" : "y",
    rise = gable(b, r, h, axis, STEEP, 0, roof, P.wall);

  //the stepped gables at the ends, standing up over the roof
  var ends = axis === "x" ? ["-x", "+x"] : ["-y", "+y"],
    across = axis === "x" ? [r.y0, r.y1] : [r.x0, r.x1],
    w = across[1] - across[0];

  ends.forEach(function (g) {
    for (var s = 0; s < 4; s++) {
      var inset = (s * w) / 8,
        z0 = h + (s * rise) / 4;

      b.push(
        axis === "x"
          ? box(
              g === "-x" ? r.x0 - 0.5 : r.x1 - 1,
              g === "-x" ? r.x0 + 1 : r.x1 + 0.5,
              across[0] + inset,
              across[1] - inset,
              z0,
              z0 + rise / 4 + 1.5,
              P.wall,
              finishOf(P.wall),
            )
          : box(
              across[0] + inset,
              across[1] - inset,
              g === "-y" ? r.y0 - 0.5 : r.y1 - 1,
              g === "-y" ? r.y0 + 1 : r.y1 + 0.5,
              z0,
              z0 + rise / 4 + 1.5,
              P.wall,
              finishOf(P.wall),
            ),
      );
    }
  });

  //the clock over the middle of its front
  var m = (sp[0] + sp[1]) / 2;

  b.push(outBox(r, f, m - 2, m + 2, 0, 0.3, h - 6, h - 2, [244, 240, 228]));
  b.push(outBox(r, f, m - 0.25, m + 0.25, 0, 0.4, h - 4.4, h - 2.6, IRON));
}

/**
 * A market square on x0..x1, y0..y1: stalls round its edges under their
 * striped canopies, facing in, and a well or a fountain in the middle of
 * it, a tree by it.
 */
function square(b, x0, x1, y0, y1, o, rnd, big) {
  var mx = (x0 + x1) / 2,
    my = (y0 + y1) / 2,
    colors = CANOPIES.mixed,
    kinds = Object.keys(GOODS),
    n = 0;

  b.push(box(x0, x1, y0, y1, 1, 1.25, SLABS));

  //the stalls: a row along the back of it, and down its sides if it is big
  for (var x = x0 + 2; x < x1 - 7; x += 8)
    if (Math.abs(x + 3 - mx) > 6 || !big)
      stall(b, x, y1 - 7, pick(rnd, kinds), colors[n++ % colors.length], rnd);

  if (y1 - y0 > 28)
    for (var y = y0 + 4; y < y1 - 16; y += 9) {
      stall(b, x0 + 2, y, pick(rnd, kinds), colors[n++ % colors.length], rnd);
      if (x1 - x0 > 30)
        stall(b, x1 - 8, y, pick(rnd, kinds), colors[n++ % colors.length], rnd);
    }

  if (big) fountain(b, mx, my, 5);
  else well(b, mx, my);

  if (x1 - x0 > 24 && y1 - y0 > 20) tree(b, mx + 9, my - 6, 3);
}

/* --- The designs ------------------------------------------------------ */

/**
 * Where a design's buildings stand, for its building site: each rect, how
 * many storeys.
 */
function frames(rects) {
  return rects.map(function (r) {
    return { rect: r, storeys: r.storeys || 2 };
  });
}

//the ground of an old town W by D: cobbles over all of it
function cobbles(b, W, D) {
  b.push(box(0, W, 0, D, 0, 1, GRASS));
  b.push(box(0.3, W - 0.3, 0.3, D - 0.3, 1, 1.2, COBBLES));
}

/**
 * A lane of craftsmen's houses on one tile across and two or three deep:
 * the lane up the middle from the street, houses either side, their gables
 * to it - or, for "yard", houses down one side of a yard with a smithy's
 * open shed at the back of it, a well and a woodpile.
 */
function lane(D, yard) {
  return function (o, rnd, stage) {
    var d = D * TILE,
      L = { x0: M, x1: 13.5, y0: M, y1: d - M },
      R = { x0: 18.5, x1: TILE - M, y0: M, y1: d - M };

    if (stage)
      return site(
        TILE,
        d,
        frames(yard ? [{ x0: M, x1: 15, y0: M, y1: d - M }] : [L, R]),
        stage,
        rnd,
      );

    var b = [];

    cobbles(b, TILE, d);

    if (yard) {
      row(b, "+x", M, d - M, M, 15, lotsAlong(d - 2 * M, rnd), o, rnd);
      //the smithy's open shed at the back of the yard, the forge glowing
      var s = { x0: 18, x1: TILE - M, y0: d - M - 12, y1: d - M };

      [
        [s.x0, s.y0],
        [s.x1 - 0.8, s.y0],
      ].forEach(function (p) {
        b.push(
          box(p[0], p[0] + 0.8, p[1], p[1] + 0.8, 1, 9, darker(WOOD, 0.3)),
        );
      });
      b.push(box(s.x0, s.x1, s.y1 - 2, s.y1, 1, 9, STONE));
      b.push(box(s.x0 + 1, s.x0 + 5, s.y1 - 5, s.y1 - 2, 1, 4, STONE));
      b.push(
        box(
          s.x0 + 1.6,
          s.x0 + 4.4,
          s.y1 - 4.5,
          s.y1 - 2.5,
          4,
          4.3,
          [250, 140, 40],
          LIT,
        ),
      );
      gable(
        b,
        s,
        9,
        "x",
        STEEP / 2,
        1,
        pick(rnd, ROOFS[o.roof]),
        darker(WOOD, 0.3),
      );
      wares(b, "smith", s.x0 + 6, s.y0 - 3, rnd);
      well(b, 23, d / 2);
      woodpile(b, 25, 27, M + 4, M + 14, 3.4);
      farmTrailer(b, 19, M + 2);
    } else {
      row(b, "+x", M, d - M, M, 13.5, lotsAlong(d - 2 * M, rnd), o, rnd);
      row(b, "-x", M, d - M, 18.5, TILE - M, lotsAlong(d - 2 * M, rnd), o, rnd);
    }

    return { boxes: b };
  };
}

//lots along a lane of length n, of 12 to 20 each - the last taking the rest
function lotsAlong(n, rnd) {
  var out = [],
    left = n;

  while (left > 0) {
    var w = left < 26 ? left : 12 + Math.floor(rnd() * 8);

    out.push(w);
    left -= w + (out.length % 2 === 0 ? 2 : 0);
  }

  return out;
}

/**
 * A market square on two tiles by two: the square open to the street, its
 * stalls and its well, houses round its back and its sides - or a church in
 * its churchyard with a row of houses down one side.
 */
function market22(o, rnd, stage) {
  var W = 2 * TILE,
    back = { x0: M, x1: W - M, y0: 44, y1: W - M },
    left = { x0: M, x1: 15, y0: M + 8, y1: 40 },
    right = { x0: W - 15, x1: W - M, y0: M + 8, y1: 40 };

  if (stage) return site(W, W, frames([back, left, right]), stage, rnd);

  var b = [];

  cobbles(b, W, W);
  row(b, "-y", M, W - M, 44, W - M, [14, 13, 14, 13], o, rnd);
  row(b, "+x", M + 8, 40, M, 15, [15, 15], o, rnd);
  row(b, "-x", M + 8, 40, W - 15, W - M, [15, 15], o, rnd);
  square(b, 18, W - 18, M + 2, 41, o, rnd, false);

  return { boxes: b };
}

function church22(o, rnd, stage) {
  var W = 2 * TILE,
    nave = { x0: 26, x1: 46, y0: 24, y1: 52 },
    houses = { x0: M, x1: 17, y0: M, y1: W - M };

  if (stage)
    return site(
      W,
      W,
      frames([{ x0: 26, x1: 46, y0: 16, y1: 55, storeys: 3 }, houses]),
      stage,
      rnd,
    );

  var b = [];

  cobbles(b, W, W);
  churchyard(b, 21, W - M, 20, W - M, rnd, function (x, y) {
    return x < nave.x0 - 2 || x > nave.x1 + 1 || y > nave.y1 + 6;
  });
  row(b, "+x", M, W - M, M, 17, lotsAlong(W - 2 * M, rnd), o, rnd);
  church(b, nave, o);
  cypress(b, 50, 24, 16);
  cypress(b, 23, 50, 14);
  bench(b, 24, 8);

  return { boxes: b };
}

/**
 * A square before a church on two tiles by three, its stalls and well, the
 * church at the back of it, houses down both sides - or a street of
 * craftsmen up the middle, houses either side all the way, and a well
 * where it opens out at the back.
 */
function square23(o, rnd, stage) {
  var W = 2 * TILE,
    D = 3 * TILE,
    nave = { x0: 22, x1: 42, y0: 56, y1: D - M - 4 },
    left = { x0: M, x1: 16, y0: M, y1: D - M },
    right = { x0: W - 16, x1: W - M, y0: M, y1: D - M };

  if (stage)
    return site(
      W,
      D,
      frames([left, right, { x0: 22, x1: 42, y0: 48, y1: D - M, storeys: 3 }]),
      stage,
      rnd,
    );

  var b = [];

  cobbles(b, W, D);
  row(b, "+x", M, D - M, M, 16, lotsAlong(D - 2 * M, rnd), o, rnd);
  row(b, "-x", M, D - M, W - 16, W - M, lotsAlong(D - 2 * M, rnd), o, rnd);
  square(b, 19, W - 19, M + 1, 44, o, rnd, false);
  church(b, nave, o);

  return { boxes: b };
}

function crafts23(o, rnd, stage) {
  var W = 2 * TILE,
    D = 3 * TILE,
    rects = [
      { x0: M, x1: 27, y0: M, y1: D - 24 },
      { x0: 37, x1: W - M, y0: M, y1: D - 24 },
      { x0: M, x1: W - M, y0: D - 16, y1: D - M },
    ];

  if (stage) return site(W, D, frames(rects), stage, rnd);

  var b = [];

  cobbles(b, W, D);
  //two rows of houses back to back either side of the street
  row(b, "+x", M, D - 24, 16, 27, lotsAlong(D - 24 - M, rnd), o, rnd);
  row(b, "-x", M, D - 24, M, 15, lotsAlong(D - 24 - M, rnd).reverse(), o, rnd);
  row(b, "-x", M, D - 24, 37, 48, lotsAlong(D - 24 - M, rnd), o, rnd);
  row(
    b,
    "+x",
    M,
    D - 24,
    49,
    W - M,
    lotsAlong(D - 24 - M, rnd).reverse(),
    o,
    rnd,
  );
  //and along the back, facing where the street opens out
  row(b, "-y", M, W - M, D - 16, D - M, [15, 14, 15, 14], o, rnd);
  b.push(box(16, 48, D - 24, D - 16, 1, 1.25, SLABS));
  well(b, 32, D - 20);
  tree(b, 24, D - 20, 3);
  barrel(b, 42, D - 21);

  return { boxes: b };
}

/**
 * The whole old town on three tiles by three: the market square in the
 * middle with its fountain and its stalls, the guild hall on one side of
 * it, its arcade to the square, the church behind it in its churchyard, and
 * the craftsmen's houses all round.
 */
function town33(o, rnd, stage) {
  var W = 3 * TILE,
    nave = { x0: 40, x1: 58, y0: 66, y1: W - M - 3 },
    hall = { x0: M + 1, x1: 26, y0: M + 2, y1: 40 },
    east = { x0: W - 16, x1: W - M, y0: M, y1: W - M },
    west = { x0: M, x1: 18, y0: 46, y1: W - M },
    front = { x0: 30, x1: W - 20, y0: M, y1: 16 };

  if (stage)
    return site(
      W,
      W,
      frames([
        hall,
        east,
        west,
        front,
        { x0: 40, x1: 58, y0: 56, y1: W - M, storeys: 3 },
      ]),
      stage,
      rnd,
    );

  var b = [];

  cobbles(b, W, W);
  churchyard(b, 22, W - 20, 54, W - M, rnd, function (x, y) {
    return x < nave.x0 - 2 || x > nave.x1 + 1 || y > nave.y1 + 5;
  });
  //the houses: up the east side, down the west behind the hall, and a row
  //at the front either side of the way in
  row(b, "-x", M, W - M, W - 16, W - M, lotsAlong(W - 2 * M, rnd), o, rnd);
  row(b, "+x", 46, W - M, M, 18, lotsAlong(W - 46 - M, rnd), o, rnd);
  row(b, "+y", 30, 44, M, 16, [14], o, rnd);
  row(b, "+y", 54, W - 20, M, 16, [W - 74], o, rnd);
  guildhall(b, hall, "+x", o);
  square(b, 30, W - 20, 20, 52, o, rnd, true);
  church(b, nave, o);
  cypress(b, 26, 60, 16);
  cypress(b, W - 23, 86, 15);

  return { boxes: b };
}

var DESIGNS = {
  lane12: lane(2, false),
  yard12: lane(2, true),
  lane13: lane(3, false),
  yard13: lane(3, true),
  market22: market22,
  church22: church22,
  square23: square23,
  crafts23: crafts23,
  town33: town33,
};

/* --- The wall --------------------------------------------------------- */

//the edges of a tile in the order a wall's mask gives them, and its corners
//after them: x0y0, x1y0, x1y1, x0y1
var EDGES = ["x0", "y0", "x1", "y1"],
  CORNERS = [
    [0, 0],
    [TILE, 0],
    [TILE, TILE],
    [0, TILE],
  ],
  //which two edges meet at each corner
  CORNER_EDGES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];

//how thick the wall is, how high, its battlements over that
var WALL_T = 3.5,
  WALL_H = 13,
  TOWER = 7,
  TOWER_H = 19;

//a box along an edge of the tile, from a0 to a1 along it and c0 to c1 in
//from it
function edgeBox(edge, a0, a1, c0, c1, z0, z1, color, finish) {
  var near = edge[1] === "0";

  if (edge[0] === "y")
    return near
      ? box(a0, a1, c0, c1, z0, z1, color, finish)
      : box(a0, a1, TILE - c1, TILE - c0, z0, z1, color, finish);

  return near
    ? box(c0, c1, a0, a1, z0, z1, color, finish)
    : box(TILE - c1, TILE - c0, a0, a1, z0, z1, color, finish);
}

//a stretch of wall along an edge from a0 to a1, its battlements on top
function wallRun(b, edge, a0, a1) {
  if (a1 - a0 < 0.5) return;

  b.push(edgeBox(edge, a0, a1, 0.5, 0.5 + WALL_T, 1, WALL_H, WALL_STONE));
  //the walk along the top, and the merlons on its outer side
  b.push(
    edgeBox(
      edge,
      a0,
      a1,
      0.3,
      0.5 + WALL_T + 0.2,
      WALL_H,
      WALL_H + 0.5,
      darker(WALL_STONE, 0.1),
    ),
  );
  for (var a = Math.ceil(a0); a < a1 - 0.5; a += 2)
    b.push(
      edgeBox(
        edge,
        a,
        Math.min(a + 1, a1),
        0.3,
        1.5,
        WALL_H + 0.5,
        WALL_H + 2,
        WALL_STONE,
      ),
    );
}

/**
 * A square tower at the corner c of the tile, its top crenellated or under
 * a pointed cap of tiles.
 */
function tower(b, c, h, cap) {
  var p = CORNERS[c],
    x0 = p[0] === 0 ? 0 : TILE - TOWER,
    y0 = p[1] === 0 ? 0 : TILE - TOWER,
    x1 = x0 + TOWER,
    y1 = y0 + TOWER;

  b.push(box(x0 + 0.2, x1 - 0.2, y0 + 0.2, y1 - 0.2, 1, h, WALL_STONE));
  b.push(box(x0, x1, y0, y1, h - 1, h, darker(WALL_STONE, 0.12)));
  //arrow slits
  b.push(
    box(x0 + 3.2, x0 + 3.8, y0 + 0.1, y1 - 0.1, h - 7, h - 4, [40, 40, 46]),
  );
  b.push(
    box(x0 + 0.1, x1 - 0.1, y0 + 3.2, y0 + 3.8, h - 7, h - 4, [40, 40, 46]),
  );

  if (cap)
    pyramid(b, x0 - 0.5, x1 + 0.5, y0 - 0.5, y1 + 0.5, h, 1.5, ROOFS.tiles[0]);
  else
    for (var a = 0; a < 4; a++) {
      b.push(
        box(x0 + a * 2, x0 + a * 2 + 1, y0, y0 + 1, h, h + 1.5, WALL_STONE),
      );
      b.push(
        box(x0 + a * 2, x0 + a * 2 + 1, y1 - 1, y1, h, h + 1.5, WALL_STONE),
      );
      b.push(
        box(x0, x0 + 1, y0 + a * 2, y0 + a * 2 + 1, h, h + 1.5, WALL_STONE),
      );
      b.push(
        box(x1 - 1, x1, y0 + a * 2, y0 + a * 2 + 1, h, h + 1.5, WALL_STONE),
      );
    }
}

/**
 * A gatehouse in the wall along an edge: the way through in the middle, an
 * arch over it with the wall going on over that, a tower either side under
 * a cap of tiles, the gates swung open.
 */
function gatehouse(b, edge) {
  var g0 = 11,
    g1 = 21;

  wallRun(b, edge, 0, g0 - 4);
  wallRun(b, edge, g1 + 4, TILE);
  //over the way through
  b.push(edgeBox(edge, g0, g1, 0.5, 0.5 + WALL_T, 10, WALL_H + 2, WALL_STONE));
  b.push(edgeBox(edge, g0, g1, 0.3, 1.5, WALL_H + 2, WALL_H + 3.5, WALL_STONE));
  //the arch's keystones
  b.push(edgeBox(edge, g0, g1, 0.2, 0.5, 9.2, 10, lighter(WALL_STONE, 0.15)));

  [
    [g0 - 5, g0],
    [g1, g1 + 5],
  ].forEach(function (t) {
    b.push(edgeBox(edge, t[0], t[1], 0, 6, 1, TOWER_H, WALL_STONE));
    b.push(
      edgeBox(
        edge,
        t[0],
        t[1],
        2.4,
        2.6,
        TOWER_H - 7,
        TOWER_H - 4,
        [40, 40, 46],
      ),
    );

    var q = edgeBox(edge, t[0] - 0.5, t[1] + 0.5, -0.5, 6.5, 0, 0, WALL_STONE);

    pyramid(b, q.x0, q.x1, q.y0, q.y1, TOWER_H, 1.5, ROOFS.tiles[0]);
  });

  //the gates, of oak, swung open against the inside of the arch
  [g0 + 0.2, g1 - 0.6].forEach(function (a) {
    b.push(
      edgeBox(
        edge,
        a,
        a + 0.4,
        WALL_T + 0.6,
        WALL_T + 4.6,
        1.2,
        9,
        [104, 70, 44],
      ),
    );
  });
}

//whether an edge of a tile is at its back, seen from where the camera is
//with the tile turned so many times (as shared/gen/sites has it)
function atBack(edge, turns) {
  var mid = {
      x0: [0, TILE / 2],
      y0: [TILE / 2, 0],
      x1: [TILE, TILE / 2],
      y1: [TILE / 2, TILE],
    }[edge],
    p = turnPoint(mid[0], mid[1], turns);

  return Math.max(p[0], p[1]) > TILE - 1;
}

//and a corner: at the back unless it is the one nearest the camera
function cornerAtBack(c, turns) {
  var p = turnPoint(CORNERS[c][0], CORNERS[c][1], turns);

  return Math.max(p[0], p[1]) > TILE - 1;
}

/**
 * A tile's wall, by its mask - for each edge, x0 y0 x1 y1, 0 for none, 1
 * for wall and 2 for a gatehouse; then for each corner, x0y0 x1y0 x1y1
 * x0y1, 1 for the bit of wall that fills it where the town turns a corner
 * inwards there - the half of it at the back of the tile, or at its front,
 * as the tile is seen turned `turns` times. Where two walls meet there is a
 * tower.
 */
function wall(mask, back, turns) {
  var b = [],
    e = mask.slice(0, 4).split("").map(Number),
    c = mask.slice(4).split("").map(Number);

  EDGES.forEach(function (edge, i) {
    if (e[i] === 0 || atBack(edge, turns) !== back) return;

    //along it, short of the corners that have towers in them: an edge
    //along x meets x0 and x1 at its ends, one along y meets y0 and y1
    var ends = edge[0] === "y" ? [e[0], e[2]] : [e[1], e[3]],
      a0 = ends[0] ? TOWER - 0.5 : 0,
      a1 = ends[1] ? TILE - TOWER + 0.5 : TILE;

    if (e[i] === 2) gatehouse(b, edge);
    else wallRun(b, edge, a0, a1);
  });

  CORNER_EDGES.forEach(function (pair, k) {
    if (cornerAtBack(k, turns) !== back) return;

    var p = CORNERS[k];

    if (e[pair[0]] && e[pair[1]]) tower(b, k, TOWER_H, k % 2 === 1);
    else if (c[k]) {
      //where the walls of the two towns next to it meet, round the corner
      var x0 = p[0] === 0 ? 0.5 : TILE - 0.5 - WALL_T,
        y0 = p[1] === 0 ? 0.5 : TILE - 0.5 - WALL_T;

      b.push(box(x0, x0 + WALL_T, y0, y0 + WALL_T, 1, WALL_H, WALL_STONE));
      b.push(
        box(x0, x0 + WALL_T, y0, y0 + WALL_T, WALL_H, WALL_H + 2, WALL_STONE),
      );
    }
  });

  return b;
}

//every mask a tile's wall can have: its edges any way, a corner filled only
//where neither of its edges has a wall
var MASKS = (function () {
  var out = [];

  for (var m = 0; m < 81; m++) {
    var e = [
        m % 3,
        Math.floor(m / 3) % 3,
        Math.floor(m / 9) % 3,
        Math.floor(m / 27) % 3,
      ],
      combos = [[]];

    CORNER_EDGES.forEach(function (pair) {
      var next = [];

      combos.forEach(function (c) {
        next.push(c.concat([0]));
        if (!e[pair[0]] && !e[pair[1]]) next.push(c.concat([1]));
      });
      combos = next;
    });

    combos.forEach(function (c) {
      var mask = e.join("") + c.join("");

      if (mask !== "00000000") out.push(mask);
    });
  }

  return out;
})();

/* --- Parts ------------------------------------------------------------ */

//the tiles of a footprint sizeX by sizeY, each the part named by the
//template with the tile at the end
function tilesOf(sizeX, sizeY, template) {
  var out = [];

  for (var y = 0; y < sizeY; y++)
    for (var x = 0; x < sizeX; x++)
      out.push({ x: x, y: y, parts: [template + "/" + x + "/" + y] });

  return out;
}

var AXES = {
  side: ["l", "r"],
  scheme: Object.keys(SCHEMES),
  roof: Object.keys(ROOFS),
};

function design(name, sizeX, sizeY) {
  return {
    design: name,
    weight: 1,
    axes: AXES,
    tiles: tilesOf(sizeX, sizeY, "oldtown/" + name + "/{side}/{scheme}/{roof}"),
  };
}

/**
 * What every footprint of the old town can be: designs, each with its
 * options - see shared/gen/houses FOOTPRINTS.
 */
var FOOTPRINTS = {
  "1x2": [design("lane12", 1, 2), design("yard12", 1, 2)],
  "1x3": [design("lane13", 1, 3), design("yard13", 1, 3)],
  "2x2": [design("market22", 2, 2), design("church22", 2, 2)],
  "2x3": [design("square23", 2, 3), design("crafts23", 2, 3)],
  "3x3": [design("town33", 3, 3)],
};

//how big each design's footprint is
var SIZE = {};

Object.keys(FOOTPRINTS).forEach(function (fp) {
  FOOTPRINTS[fp].forEach(function (d) {
    SIZE[d.design] = fp.split("x").map(Number);
  });
});

/**
 * Every part there is, by name without its turn - every design with every
 * option, the frames they go up in, and the wall: "oldtown/wall/10100000/back".
 */
var PARTS = (function () {
  var out = {};

  Object.keys(FOOTPRINTS).forEach(function (fp) {
    FOOTPRINTS[fp].forEach(function (d) {
      d.tiles.forEach(function (t) {
        t.parts.forEach(function (p) {
          namesOf(p, d.axes).forEach(function (name) {
            var q = name.split("/");

            out[name] = true;
            [1, 2].forEach(function (stage) {
              out[
                [
                  "oldtown/frame",
                  q[1],
                  q[2],
                  stage,
                  q[q.length - 2],
                  q[q.length - 1],
                ].join("/")
              ] = true;
            });
          });
        });
      });
    });
  });

  MASKS.forEach(function (mask) {
    out["oldtown/wall/" + mask + "/back"] = true;
    out["oldtown/wall/" + mask + "/front"] = true;
  });

  return out;
})();

//the boxes mirrored across the footprint W wide - a design the other way
//round
function mirrored(boxes, W) {
  return boxes.map(function (c) {
    var r = box(W - c.x1, W - c.x0, c.y0, c.y1, c.z0, c.z1, c.color, c.finish);

    if (c.cuts)
      r.cuts = c.cuts.map(function (p) {
        return iso.plane(-p.n[0], p.n[1], p.n[2], p.d - p.n[0] * W);
      });

    return r;
  });
}

//the last few towns painted whole - the tiles of one are painted one after
//another
var whole = [],
  KEEP = 4;

/**
 * A town painted whole, by its name without the tile: its boxes, in the
 * footprint's own place, and the tops of its chimneys.
 */
function town(id) {
  for (var i = 0; i < whole.length; i++)
    if (whole[i].id === id) return whole[i].town;

  var p = id.split("/"),
    built;

  if (p[1] === "frame") {
    built = DESIGNS[p[2]]({}, random(id), +p[4]);
    built.side = p[3];
    built.design = p[2];
  } else {
    smoking = [];
    built = DESIGNS[p[1]]({ side: p[2], scheme: p[3], roof: p[4] }, random(id));
    built.chimneys = smoking;
    built.side = p[2];
    built.design = p[1];
    smoking = null;
  }

  var W = SIZE[built.design][0] * TILE;

  if (built.side === "r") {
    built.boxes = mirrored(built.boxes, W);
    built.chimneys = (built.chimneys || []).map(function (t) {
      return [W - t[0], t[1], t[2]];
    });
  }

  built.boxes.forEach(function (c) {
    ["x0", "x1", "y0", "y1", "z0", "z1"].forEach(function (k) {
      c[k] = Math.round(c[k] * 1024) / 1024;
    });
  });

  whole.unshift({ id: id, town: built });
  if (whole.length > KEEP) whole.pop();

  return built;
}

/**
 * The boxes of a part by its name without its turn, as it is painted: a tile
 * of a town, the whole of it so far off as the tile is from its corner; a
 * stretch of wall, as it is for the town turned `turns` times, at the back
 * of the tile or at its front.
 *
 * @param [turns] {number} 0..3
 */
export function partBoxes(key, turns) {
  if (PARTS[key] === undefined) throw new Error("no such part: " + key);

  var p = key.split("/");

  if (p[1] === "wall") return wall(p[2], p[3] === "back", turns || 0);

  var cx = +p[p.length - 2],
    cy = +p[p.length - 1];

  return town(p.slice(0, p.length - 2).join("/")).boxes.map(function (c) {
    return iso.moved(c, -cx * TILE, -cy * TILE, 0);
  });
}

/**
 * Every part, by sprite name - "gen/oldtown/lane12/l/warm/tiles/0/1/r2" -
 * with its size and pivot, without painting it; what every footprint can
 * be; and the tops of every town's chimneys, for its smoke.
 */
export function describe() {
  var sizes = {},
    smoke = {};

  Object.keys(PARTS).forEach(function (key) {
    var p = key.split("/");

    if (p[1] !== "wall" && p[1] !== "frame") {
      var id = p.slice(0, -2).join("/");

      if (smoke[id] === undefined)
        smoke[id] = town(id).chimneys.map(function (t) {
          return t.map(function (v) {
            return Math.round(v * 10) / 10;
          });
        });
    }

    TURNS.forEach(function (turns) {
      var boxes = partBoxes(key, turns);

      //a stretch of wall with nothing of it on this side of the tile is
      //nothing to draw (client/compoundbuilding leaves it out)
      sizes["gen/" + key + "/r" + turns] =
        boxes.length === 0
          ? { w: 0, h: 0, pivotX: 0, pivotY: 0 }
          : measureOnTile(iso.rotate(boxes, 1, 1, turns));
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      footprints: FOOTPRINTS,
      turns: TURNS,
      overlays: {},
      smoke: smoke,
    },
  };
}

/**
 * One part, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var key = name.replace(/^gen\//, ""),
    at = key.lastIndexOf("/r"),
    turns = parseInt(key.slice(at + 2), 10);

  if (TURNS.indexOf(turns) === -1) throw new Error("no such part: " + name);

  var boxes = iso.rotate(partBoxes(key.slice(0, at), turns), 1, 1, turns),
    clipped = [];

  iso.snapAll(boxes).forEach(function (b) {
    var c = iso.clip(b, 0, TILE, 0, TILE);

    if (c !== null) clipped.push(c);
  });

  var picture = iso.render(clipped),
    middle = iso.project(TILE / 2, TILE / 2, 0);

  picture.pivotX += middle[0];
  picture.pivotY += middle[1];

  return iso.toImage(picture);
}

export { PARTS, STOREY, MASKS };

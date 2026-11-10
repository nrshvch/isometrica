/**
 * Paints scenes made of boxes the way the game sees the world, for the
 * generators that paint buildings (shared/gen/flats).
 *
 * One ray per pixel goes straight into the scene; the pixel is the colour of
 * the first box it hits, shaded by which way the face it hits looks. Every
 * face looking the same way is the same flat colour - so everything painted
 * here is lit alike, the same as the vehicles - unless its box has a finish:
 * what it is made of, laid out on it a pixel at a time - brick courses,
 * panel joints, roof tiles, paving slabs, the speckle of asphalt (see
 * MATERIALS) - or the sky reflected in it, for glass (see finish).
 *
 * Every box is snapped to whole units before it is painted (see snap), the
 * way a picture drawn by hand keeps to its pixels: an edge along the ground
 * comes out a clean step of two pixels across for one down, a band a unit
 * high a line a pixel thick - never a line that is two pixels thick here and
 * one there, or broken into dots. A box can be cut by planes (see cut), for
 * a roof or a ramp: a slope, not a staircase of thin boxes.
 *
 * Units: one along the ground is one pixel across the screen - a tile is 32 of
 * them each way. Heights are in pixels. +x runs up and to the right on the
 * screen, +y up and to the left; only faces looking up, towards -x (down and
 * to the left) and towards -y (down and to the right) are ever seen.
 *
 * Or seen from straight above (setView "top"), for the map: +x to the right,
 * +y up, two pixels a unit - a tile 64 by 64 - and only what looks up seen.
 * A picture from above is always whole tiles, so that a part of something
 * standing on a tile is the tile's square whatever is on it (see render).
 */

var TILE = 32,
  TILE_W = 64,
  TILE_H = 32;

function mix(c, to, k) {
  return [
    c[0] + (to[0] - c[0]) * k,
    c[1] + (to[1] - c[1]) * k,
    c[2] + (to[2] - c[2]) * k,
  ];
}

function lighter(c, k) {
  return mix(c, [255, 255, 255], k);
}

function darker(c, k) {
  return mix(c, [0, 0, 0], k);
}

/**
 * @param [finish] {Object} what its surface is like, see finish - a box
 *        without one is flat colour
 */
function box(x0, x1, y0, y1, z0, z1, color, finish) {
  return {
    finish: finish,
    x0: Math.min(x0, x1),
    x1: Math.max(x0, x1),
    y0: Math.min(y0, y1),
    y1: Math.max(y0, y1),
    z0: Math.min(z0, z1),
    z1: Math.max(z0, z1),
    color: color,
  };
}

/**
 * A plane through the world, n . p = d, that a box is cut by (see cut).
 */
function plane(nx, ny, nz, d) {
  return { n: [nx, ny, nz], d: d };
}

/**
 * The box with only what of it lies under every one of the planes kept - nx
 * x + ny y + nz z <= d for each - for a roof or a ramp: whatever of it the
 * ray hits on a plane is lit by which way the plane looks (see lit). Its z0
 * and z1 are then only how far the planes leave it reaching.
 */
function cut(b, planes) {
  b.cuts = (b.cuts || []).concat(planes);

  return b;
}

//the same box, moved
function moved(b, dx, dy, dz) {
  var r = box(
    b.x0 + dx,
    b.x1 + dx,
    b.y0 + dy,
    b.y1 + dy,
    b.z0 + dz,
    b.z1 + dz,
    b.color,
    b.finish,
  );

  if (b.cuts)
    r.cuts = b.cuts.map(function (c) {
      return plane(
        c.n[0],
        c.n[1],
        c.n[2],
        c.d + c.n[0] * dx + c.n[1] * dy + c.n[2] * dz,
      );
    });
  if (b.seams) r.seams = b.seams;

  return r;
}

//what of the box is over x0..x1, y0..y1 - null if none of it is
function clip(b, x0, x1, y0, y1) {
  var cx0 = Math.max(b.x0, x0),
    cx1 = Math.min(b.x1, x1),
    cy0 = Math.max(b.y0, y0),
    cy1 = Math.min(b.y1, y1);

  //checked before box, which would put the ends of one off it the right way
  //round
  if (!(cx0 < cx1 && cy0 < cy1)) return null;

  var r = box(cx0, cx1, cy0, cy1, b.z0, b.z1, b.color, b.finish),
    seams = Object.assign({}, b.seams);

  r.cuts = b.cuts;

  //cut off more of itself: a seam there (seamed)
  if (cx0 > b.x0) seams.x0 = true;
  if (cx1 < b.x1) seams.x1 = true;
  if (cy0 > b.y0) seams.y0 = true;
  if (cy1 < b.y1) seams.y1 = true;
  if (Object.keys(seams).length > 0) r.seams = seams;

  return r;
}

/**
 * The boxes of something standing on sizeX by sizeY tiles, turned a quarter
 * turn at a time on the spot. Whatever looked towards -y looks, after one
 * turn, towards -x, after two towards +y and after three towards +x. Turned
 * an odd number of times its footprint is sizeY by sizeX.
 */
function rotate(boxes, sizeX, sizeY, turns) {
  var X = sizeX * TILE,
    Y = sizeY * TILE;

  function turn(x, y) {
    switch (turns % 4) {
      case 1:
        return [y, X - x];
      case 2:
        return [X - x, Y - y];
      case 3:
        return [Y - y, x];
      default:
        return [x, y];
    }
  }

  return boxes.map(function (b) {
    var p = turn(b.x0, b.y0),
      q = turn(b.x1, b.y1);
    var r = box(p[0], q[0], p[1], q[1], b.z0, b.z1, b.color, b.finish);

    if (b.cuts)
      r.cuts = b.cuts.map(function (c) {
        var n = c.n;

        switch (turns % 4) {
          case 1:
            return plane(n[1], -n[0], n[2], c.d - n[0] * X);
          case 2:
            return plane(-n[0], -n[1], n[2], c.d - n[0] * X - n[1] * Y);
          case 3:
            return plane(-n[1], n[0], n[2], c.d - n[1] * Y);
          default:
            return c;
        }
      });

    //its seams, the way the sides they are on now look
    if (b.seams) {
      r.seams = {};
      Object.keys(b.seams).forEach(function (side) {
        var n = SIDES[side],
          m =
            turns % 4 === 1
              ? [n[1], -n[0]]
              : turns % 4 === 2
                ? [-n[0], -n[1]]
                : turns % 4 === 3
                  ? [-n[1], n[0]]
                  : n;

        if (b.seams[side]) r.seams[sideOf(m)] = true;
      });
    }

    return r;
  });
}

//the sides of a box, by name, and which way each looks along the ground
var SIDES = { x0: [-1, 0], x1: [1, 0], y0: [0, -1], y1: [0, 1] };

//the side of a box that looks the way n does
function sideOf(n) {
  return n[0] < 0 ? "x0" : n[0] > 0 ? "x1" : n[1] < 0 ? "y0" : "y1";
}

/**
 * Has sides of a box be seams - where it runs on into more of itself, on
 * the next tile, rather than its faces: a building's walls are on its
 * faces, its rooms open at a seam (interiors). Cutting a box to a tile
 * (clip) leaves seams where it was cut; a part of a building put together
 * a tile at a time says so of itself (shared/gen/blocks).
 *
 * @param sides {{x0, x1, y0, y1}} true for each side that is a seam
 * @returns {Object} the box
 */
function seamed(b, sides) {
  var seams = Object.assign({}, b.seams);

  Object.keys(sides).forEach(function (side) {
    if (sides[side]) seams[side] = true;
  });
  if (Object.keys(seams).length > 0) b.seams = seams;

  return b;
}

/**
 * Has a box be an opening left in a wall going up - a door, a window not yet
 * glazed: laid on the wall's face, it is a hole through the wall when it is
 * painted, the room behind it showing (interiors).
 *
 * @returns {Object} the box
 */
function opening(b) {
  b.finish = Object.assign({}, b.finish || {}, { opening: true });

  return b;
}

//how thin a box squeezed onto what it lies on is (see snap)
var SKIN = 1 / 64;

/**
 * One side of a box snapped to whole units: both its ends rounded, so that
 * whatever lies against it still does. What rounds away to nothing is either
 * a skin - a stripe painted on a road, a pane of glass on a wall, thinner
 * than half a unit - which is laid on whatever it is on; or something thin
 * but not that thin - a pole, a rail - which is made a unit thick, a pixel
 * across.
 */
function snapSide(a0, a1, up, outward) {
  var s0 = Math.round(a0),
    s1 = Math.round(a1),
    c;

  if (s1 > s0) return [s0, s1];

  //up, over what it lies on; along the ground, level with the face it lies
  //on, and listed after it (see cast) - or, outward, in front of it
  if (a1 - a0 < 0.5)
    return up ? [s1, s1 + SKIN] : outward ? [s0 - SKIN, s0] : [s0, s0 + SKIN];

  c = Math.floor((a0 + a1) / 2);

  return [c, c + 1];
}

/**
 * The box snapped to whole units, the way a picture drawn by hand keeps to
 * its pixels. A unit along the ground is a pixel across the screen, and a
 * unit up a pixel up it, so with every edge on a whole unit:
 *
 *   - an edge along the ground is a clean step of two pixels across for one
 *     down, and a strip a whole number of units wide is a line as thick all
 *     along it - one half a unit wider is a pixel thicker here and not there;
 *   - the bands on a wall a whole number of units high are lines as thick
 *     all along, a step of a pixel up every two across.
 *
 * Left as they are: a box cut by planes keeps its heights (the planes say
 * how high it is), something round laid out in columns half a unit across
 * (blocks round, lit) keeps its columns, and a box with a fine finish - a
 * rod of a lattice strung out of little cubes, a line a pixel thin going
 * any way - stays where it is.
 *
 * @param [outward] {boolean} a skin on a face looking along the ground in
 *        front of it, rather than level with it - for whoever paints with the
 *        first of two boxes hit at the same spot winning (shared/gen/vehicles)
 */
function snap(b, outward) {
  if (
    b.finish !== undefined &&
    (b.finish.fine ||
      (b.finish.lit &&
        (b.x1 - b.x0 <= 0.5 + 1e-9 || b.y1 - b.y0 <= 0.5 + 1e-9)))
  )
    return b;

  var x = snapSide(b.x0, b.x1, false, outward),
    y = snapSide(b.y0, b.y1, false, outward),
    z = b.cuts ? [b.z0, b.z1] : snapSide(b.z0, b.z1, true),
    r = box(x[0], x[1], y[0], y[1], z[0], z[1], b.color, b.finish);

  r.cuts = b.cuts;
  if (b.seams) r.seams = b.seams;

  return r;
}

function snapAll(boxes) {
  return boxes.map(function (b) {
    return snap(b);
  });
}

//where a point in the world lands on the screen, the origin at 0, 0 - from
//above, wherever it is up
function project(x, y, z) {
  if (view === "top") return [x * TOP, -y * TOP];

  return [x - y, -(x + y) / 2 - z];
}

//how the boxes are seen (setView): from the side the game sees them from,
//"iso", or from straight above, "top" - and from above, how many pixels a
//unit is
var view = "iso",
  TOP = 2;

function setView(v) {
  view = v || "iso";
}

function getView() {
  return view;
}

//a face looking up is lit the most, one looking down and to the left (-x)
//less, down and to the right (-y) the least
function shade(color, face) {
  if (face === 2) return lighter(color, 0.22);
  else if (face === 0) return darker(color, 0.1);
  else return darker(color, 0.3);
}

//where the sun is, the way shade lights the faces: high, and over to the
//side the faces looking towards -x are on
var SUN = (function () {
  var l = [-0.45, 0.35, 1],
    n = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]);

  return [l[0] / n, l[1] / n, l[2] / n];
})();

//how much light falls on a face looking up, towards -x and towards -y
var LIT_UP = SUN[2],
  LIT_LEFT = -SUN[0],
  LIT_RIGHT = -SUN[1];

/**
 * The colour of a surface looking along nx, ny, nz, lit the way shade lights
 * a box's faces: as light as a box's top where it looks straight up, as dark
 * as its right side where it looks that way - so a slope or something round
 * sits among the boxes as if lit by the same sun.
 */
function lit(color, nx, ny, nz) {
  var n = Math.sqrt(nx * nx + ny * ny + nz * nz),
    l = (nx * SUN[0] + ny * SUN[1] + nz * SUN[2]) / n,
    k;

  if (l >= LIT_LEFT) k = -0.1 + ((l - LIT_LEFT) / (LIT_UP - LIT_LEFT)) * 0.32;
  else k = -0.3 + ((l - LIT_RIGHT) / (LIT_LEFT - LIT_RIGHT)) * 0.2;

  return k > 0 ? lighter(color, k) : darker(color, -k);
}

function screenBounds(b) {
  if (view === "top")
    return {
      minX: b.x0 * TOP,
      maxX: b.x1 * TOP,
      minY: -b.y1 * TOP,
      maxY: -b.y0 * TOP,
    };

  var corners = [
      [b.x0, b.y0, b.z0],
      [b.x1, b.y0, b.z0],
      [b.x0, b.y1, b.z0],
      [b.x1, b.y1, b.z0],
      [b.x0, b.y0, b.z1],
      [b.x1, b.y0, b.z1],
      [b.x0, b.y1, b.z1],
      [b.x1, b.y1, b.z1],
    ],
    r = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  corners.forEach(function (c) {
    var p = project(c[0], c[1], c[2]);
    r.minX = Math.min(r.minX, p[0]);
    r.maxX = Math.max(r.maxX, p[0]);
    r.minY = Math.min(r.minY, p[1]);
    r.maxY = Math.max(r.maxY, p[1]);
  });

  return r;
}

/**
 * The first box a ray through that point on the screen hits, shaded. The ray
 * comes from in front, above, and goes along (1, 1, -1), which is what every
 * point that lands on the same pixel lies on. Of two boxes hit at the same
 * spot the one listed later wins, so details go after what they sit on.
 */
function cast(boxes, sx, sy) {
  if (view === "top") return castDown(boxes, sx, sy);

  var y = -1000,
    x = y + sx,
    z = -(x + y) / 2 - sy,
    best = Infinity,
    hit = null,
    face = -1,
    i,
    b,
    tin,
    tout,
    f,
    t;

  for (i = 0; i < boxes.length; i++) {
    b = boxes[i];
    if (sx < b.sMinX || sx > b.sMaxX || sy < b.sMinY || sy > b.sMaxY) continue;

    tin = b.x0 - x;
    f = 0;
    t = b.y0 - y;
    if (t > tin) {
      tin = t;
      f = 1;
    }
    //z goes down along the ray
    t = z - b.z1;
    if (t > tin) {
      tin = t;
      f = 2;
    }
    tout = Math.min(b.x1 - x, b.y1 - y, z - b.z0);

    //the planes it is cut by: the ray goes along (1, 1, -1)
    if (b.cuts !== undefined) {
      for (var k = 0; k < b.cuts.length && tin < tout; k++) {
        var n = b.cuts[k].n,
          nr = n[0] + n[1] - n[2],
          no = n[0] * x + n[1] * y + n[2] * z;

        if (nr < 0) {
          t = (b.cuts[k].d - no) / nr;
          if (t > tin) {
            tin = t;
            f = 3 + k;
          }
        } else if (nr > 0) tout = Math.min(tout, (b.cuts[k].d - no) / nr);
        else if (no > b.cuts[k].d) tout = -Infinity;
      }
    }

    if (tin < tout && tin <= best) {
      best = tin;
      hit = b;
      face = f;
    }
  }

  if (hit === null) return null;

  return shadeHit(boxes, hit, face, x + best, y + best, z - best);
}

/**
 * The first box a ray straight down through that point of a picture from
 * above hits, shaded - the highest there; of two as high, the one listed
 * later.
 */
function castDown(boxes, sx, sy) {
  var x = sx / TOP,
    y = -sy / TOP,
    z = 100000,
    best = Infinity,
    hit = null,
    face = -1,
    i,
    b,
    tin,
    tout,
    f,
    t;

  for (i = 0; i < boxes.length; i++) {
    b = boxes[i];
    if (sx < b.sMinX || sx > b.sMaxX || sy < b.sMinY || sy > b.sMaxY) continue;
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;

    tin = z - b.z1;
    f = 2;
    tout = z - b.z0;

    //the planes it is cut by: the ray goes along (0, 0, -1)
    if (b.cuts !== undefined) {
      for (var k = 0; k < b.cuts.length && tin < tout; k++) {
        var n = b.cuts[k].n,
          nr = -n[2],
          no = n[0] * x + n[1] * y + n[2] * z;

        if (nr < 0) {
          t = (b.cuts[k].d - no) / nr;
          if (t > tin) {
            tin = t;
            f = 3 + k;
          }
        } else if (nr > 0) tout = Math.min(tout, (b.cuts[k].d - no) / nr);
        else if (no > b.cuts[k].d) tout = -Infinity;
      }
    }

    if (tin < tout && tin <= best) {
      best = tin;
      hit = b;
      face = f;
    }
  }

  if (hit === null) return null;

  return shadeHit(boxes, hit, face, x, y, z - best);
}

/**
 * The colour of box `hit` where a ray meets it, at x, y, z on its face - as
 * mode has it.
 */
function shadeHit(boxes, hit, face, px, py, pz) {
  var normal = face >= 3 ? hit.cuts[face - 3].n : null,
    color;

  //which way it looks, for the light to be worked out as it is drawn
  if (mode === "map") return facing(face, normal, hit.finish);

  //at night: what of it shines - a pane lit behind a window - in either of
  //its two ways, with the first of the lights on and with more of them; all
  //of it black, to hide whatever shines behind it - what shines lighting
  //what is round it as the city is drawn (client/generatorcore lightsOf)
  if (mode === "night") {
    var glows = shine(hit, face, normal, px, py, pz);

    //and how high the point is over the ground the picture stands on, a
    //pixel a unit, for the light of a lamp near it to be worked out as it
    //is drawn - with the whole of it in white, to lift a storey laid on
    //another by as much (client/cachedsprite Layers)
    return glows.concat([BLACK, heightOf(pz), WHITE]);
  }

  //a box lit already is its own colour on every face - with what it is
  //made of over it, if anything
  if (hit.finish !== undefined && hit.finish.lit)
    color =
      hit.finish.material === undefined
        ? hit.color
        : finish(hit.color, face, null, hit.finish, px, py, pz);
  else {
    //unlit, every face is the colour a top is in the sun - the light it is
    //drawn in takes the walls down from there
    color =
      mode !== "lit"
        ? shade(hit.color, 2)
        : normal === null
          ? shade(hit.color, face)
          : lit(hit.color, normal[0], normal[1], normal[2]);

    //a sign of no material is only a colour that shines at night (shine)
    if (hit.finish !== undefined && !(hit.finish.sign && !hit.finish.material))
      color = finish(color, face, normal, hit.finish, px, py, pz);
  }

  //indoors, out of the sun: darker (interiors)
  if (indoors.length > 0 && indoorAt(px, py, pz))
    color = darker(color, INDOOR_DARK);

  //its colour with no light on it, which way it looks (normalOf) and how
  //high it stands (heightOf) - for the light to be worked out pixel by
  //pixel as it is drawn, and the shadows the sun casts
  if (mode === "deferred")
    return [
      color,
      hit.finish !== undefined && hit.finish.lit
        ? BLACK
        : normalOf(
            normal !== null
              ? normal
              : face === 0
                ? [-1, 0, 0]
                : face === 1
                  ? [0, -1, 0]
                  : [0, 0, 1],
          ),
      heightOf(pz),
    ];

  //of each face's picture, as much of the colour as looks that way - black
  //where none of it does, so it still covers what is behind it
  if (mode === "faces")
    return weights(face, normal, hit.finish).map(function (k) {
      return [color[0] * k, color[1] * k, color[2] * k];
    });

  return color;
}

var BLACK = [0, 0, 0],
  //what of the panes are lit at night - with the first of a building's
  //lights on, and with more of them - and the light behind them: mostly
  //lamps, now and then the blue of a screen
  FIRST_PANES = 0.35,
  MORE_PANES = 0.65,
  //how wide a pane of a long run of glass is, along the wall
  PANE_W = 4,
  WARM = [255, 204, 128],
  COOL = [196, 212, 255],
  //a street light's: sodium orange
  LAMP_LIGHT = [255, 196, 112];

/**
 * The light a point x, y, z of box b gives off at night, either of two ways
 * - with the first of a building's lights on, with more of them, and the
 * same over again with other windows lit - for a storey that comes up again
 * and again not to be lit alike every time (client/cachedsprite). A lamp's
 * own (a finish with glow) and a sign's (with sign) shine all four ways; a
 * pane of glass in a wall (a finish with sheen) is lit or not by a toss of
 * its own, a few first and more later, never all - a long run of glass
 * being panes PANE_W across, and every storey of it on its own. What the
 * toss goes by is the same whichever way the box was turned, so a turn of
 * the camera does not switch lights on and off.
 *
 * @returns {Array[]} its colour with the first lights on and with more, one
 *          way and then the other
 */
function shine(b, face, normal, x, y, z) {
  var f = b.finish,
    c;

  //a lamp, its own light; a sign, its own colour
  if (f !== undefined && f.glow)
    return [LAMP_LIGHT, LAMP_LIGHT, LAMP_LIGHT, LAMP_LIGHT];
  if (f !== undefined && f.sign) {
    c = lighter(b.color, 0.1);
    return [c, c, c, c];
  }

  var lit = paneLit(b, face, normal, x, y, z);

  if (lit === null) return [BLACK, BLACK, BLACK, BLACK];

  return [
    lit.a < FIRST_PANES ? lit.c : BLACK,
    lit.a < MORE_PANES ? lit.c : BLACK,
    lit.b < FIRST_PANES ? lit.c : BLACK,
    lit.b < MORE_PANES ? lit.c : BLACK,
  ];
}

/**
 * The tosses a pane of glass at x, y, z of box b is lit by, one for either
 * way of lighting a storey (a, b, 0..1 - lit with the first lights under
 * FIRST_PANES, with more under MORE_PANES), and the light behind it (c);
 * null for what is no pane of glass in a wall.
 */
function paneLit(b, face, normal, x, y, z) {
  var f = b.finish;

  if (
    f === undefined ||
    !f.sheen ||
    face === 2 ||
    (normal !== null && Math.abs(normal[2]) > 0.7)
  )
    return null;

  var cx = (b.x0 + b.x1) / 2 - TILE / 2,
    cy = (b.y0 + b.y1) / 2 - TILE / 2,
    pane = Math.round((cx * cx + cy * cy) * 4),
    size = Math.round((b.x1 - b.x0 + b.y1 - b.y0) * 4),
    storey = Math.floor((z - (f.base || 0)) / (f.storey || 12)),
    level = Math.round(b.z0 * 4) * 64 + storey,
    //along the wall: a long run of glass is so many panes
    along = face === 1 ? x - b.x0 : y - b.y0,
    long = face === 1 ? b.x1 - b.x0 : b.y1 - b.y0,
    col = long > PANE_W * 1.5 ? Math.floor(along / PANE_W) : 0;

  return {
    a: hash(pane + col * 7919, size, level),
    b: hash(pane + col * 7919 + 4099, size + 3, level),
    c: hash(pane + col * 7919, level, size + 7) < 0.8 ? WARM : COOL,
  };
}

/**
 * What render paints (see setMode): the picture lit by the one sun every
 * picture is painted in ("lit"), its colours with no light on them
 * ("albedo"), which way each pixel of it looks ("map"), the colours of what
 * of it looks towards -x, -y and up, side by side - the three adding up to
 * the albedo ("faces") - for the light to be worked out as it is drawn,
 * wherever the sun is; or, for the night, what of it shines - with the
 * first of its lights on and with more of them, one way and another - the
 * whole of it in black, how high every pixel of it is and the whole of it in
 * white, side by side ("night", see NIGHT); or its colours with no light on them, which
 * way every pixel of it looks and how high it stands, side by side
 * ("deferred", see normalOf, heightOf).
 */
var mode = "lit";

//how many pictures the night is painted in, side by side: what shines one
//way, with the first lights on and with more, the same the other way, all
//of it in black, how high every pixel of it is (heightOf), and the whole of
//it in white
var NIGHT = 7,
  WHITE = [255, 255, 255];

//and how many it is painted in to be lit as it is drawn: its colours with
//no light on them, which way every pixel of it looks (normalOf), and how
//high it stands (heightOf) - for the shadows the sun casts
var DEFERRED = 3;

/**
 * Which way a pixel looks, n, as the picture of that has it: x, y and z of
 * it from -1..1 to 0..255 in the red, the green and the blue - black for
 * straight up, which is what anything with no picture of its own is taken
 * for as well (client/deferred), and which flat ground then need not draw.
 */
function normalOf(n) {
  var l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1,
    x = n[0] / l,
    y = n[1] / l,
    z = n[2] / l;

  if (z > 0.999) return BLACK;

  return [
    Math.round((x * 0.5 + 0.5) * 255),
    Math.round((y * 0.5 + 0.5) * 255),
    Math.round((z * 0.5 + 0.5) * 255),
  ];
}

/**
 * A height as the height picture has it: in the red, a pixel a unit, up to
 * 255 - higher than anything there is.
 */
function heightOf(z) {
  return [Math.max(0, Math.min(255, Math.round(z))), 0, 0];
}

function setMode(m) {
  mode = m;
}

/**
 * How much of a pixel looks towards -x, towards -y and up, adding up to one:
 * all of a box's face one way, a slope shared out by how far it leans each
 * way. What gives off light of its own is lit as a top is.
 */
function weights(face, normal, f) {
  if (f !== undefined && f.lit) return [0, 0, 1];
  if (normal === null)
    return face === 0 ? [1, 0, 0] : face === 1 ? [0, 1, 0] : [0, 0, 1];

  var l = Math.max(0, -normal[0]),
    r = Math.max(0, -normal[1]),
    u = Math.max(0, normal[2]),
    all = l + r + u;

  return all > 0 ? [l / all, r / all, u / all] : [0, 0, 1];
}

/**
 * The grey of a map (see mode) for a pixel looking that way: black where it
 * looks towards -x, white where it looks towards -y, half way between where
 * it looks up - and a slope as far between those as it leans each way.
 */
function facing(face, normal, f) {
  var w = weights(face, normal, f),
    v = Math.round((0.5 * w[2] + w[1]) * 255);

  return [v, v, v];
}

//what comes out of a hash of whole numbers: 0..1, the same every time
function hash(i, j, k) {
  var h =
    Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791);

  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);

  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function mod(v, n) {
  return ((v % n) + n) % n;
}

//how much lighter (above 0) or darker a colour is made
function tint(c, k) {
  return k > 0 ? lighter(c, k) : k < 0 ? darker(c, -k) : c;
}

//-1..1, the same for the same whole numbers every time
function jitter(i, j, k) {
  return hash(i, j, k) * 2 - 1;
}

/**
 * What things are made of: how much lighter or darker a point on a face of
 * it is than the face's own colour, by where the point is on the face - u
 * across it and v up it (along the ground on a face looking up: u along x,
 * v along y; down a slope on a plane: v down it) - and which face it is:
 * "top" looking up, "side" a wall, "slope" a plane.
 *
 * Everything is laid out in whole units, a pixel at a time, so that a joint
 * between bricks is a clean line a pixel thick, never a smear. Courses and
 * rows go into a storey (12 high) and a tile (32 across) a whole number of
 * times, so the pattern carries on unbroken from a part to the next one laid
 * over it or beside it.
 */
var MATERIALS = {
  //smooth render, and painted concrete: the odd stain, faint
  render: function (u, v, side, dark) {
    return jitter(u >> 1, v, 11) * 0.018 + (hash(u, v, 12) < 0.05 ? -0.035 : 0);
  },

  //a block of flats' precast panels: a joint round each, a storey high and
  //eight units across, and each a shade off the next
  panels: function (u, v, side) {
    if (side === "top") return MATERIALS.render(u, v);
    if (mod(u, 8) === 0 || v === 0) return -0.07;

    return jitter(u >> 3, 0, 13) * 0.025 + jitter(u, v, 14) * 0.01;
  },

  //brick in courses three high - two of brick, one of mortar - each brick
  //six long, every other course set over by half a brick
  brick: function (u, v, side, dark) {
    if (side === "top") return jitter(u, v, 21) * 0.03;

    var course = Math.floor(v / 3),
      off = course % 2 ? 3 : 0,
      mortar = dark ? 0.1 : -0.08;

    if (mod(v, 3) === 2 || mod(u + off, 6) === 0) return mortar;

    return jitter(Math.floor((u + off) / 6), course, 22) * 0.06;
  },

  //stone blocks in courses four high, of lengths set by the course
  stone: function (u, v, side, dark) {
    if (side === "top") return jitter(u, v, 31) * 0.04;

    var course = Math.floor(v / 4),
      off = Math.floor(hash(course, 0, 32) * 5),
      len = 5,
      mortar = dark ? 0.08 : -0.09;

    if (mod(v, 4) === 3 || mod(u + off, len) === 0) return mortar;

    return jitter(Math.floor((u + off) / len), course, 33) * 0.07;
  },

  //setts: cobbles of stone a little over two units square, laid in rows
  //each set over from the last, the joints between them dark; a wall of it
  //is stone
  setts: function (u, v, side, dark) {
    if (side !== "top") return MATERIALS.stone(u, v, side, dark);

    var row = Math.floor(v / 3),
      off = row % 2 ? 2 : 0;

    if (mod(v, 3) === 2 || mod(u + off, 3) === 2) return -0.1;

    return jitter(Math.floor((u + off) / 3), row, 231) * 0.07 + 0.02;
  },

  //boards two high, the shadow under each one's lip
  siding: function (u, v, side) {
    if (side === "top") return jitter(u, v, 41) * 0.02;

    return (mod(v, 2) === 0 ? -0.08 : 0.02) + jitter(u >> 3, v >> 1, 42) * 0.02;
  },

  //planks along u, two across, butted end to end at random
  wood: function (u, v) {
    var plank = v >> 1,
      off = Math.floor(hash(plank, 0, 51) * 8);

    if (mod(v, 2) === 1 || mod(u + off, 8) === 0) return -0.08;

    return jitter(Math.floor((u + off) / 8), plank, 52) * 0.05;
  },

  //corrugated sheet: ribs every two units, across the slope or up the wall
  metal: function (u, v, side) {
    return side === "top" ? jitter(u, v, 61) * 0.02 : mod(u, 2) ? 0.05 : -0.04;
  },

  //roof tiles: rows down the slope two units deep, each tile three across
  //and a row set over by half a tile, the lower edge of each row in shadow
  tiles: function (u, v, side) {
    if (side !== "slope") return MATERIALS.render(u, v);

    var row = v >> 1,
      off = row % 2 ? 1 : 0;

    if (mod(v, 2) === 1) return -0.1;
    if (mod(u + off, 3) === 0) return -0.04;

    return jitter(Math.floor((u + off) / 3), row, 71) * 0.05;
  },

  //slates: rows two deep, each four across, flatter and nearer alike
  slate: function (u, v, side) {
    if (side !== "slope") return MATERIALS.render(u, v);

    var row = v >> 1,
      off = row % 2 ? 2 : 0;

    if (mod(v, 2) === 1) return -0.08;
    if (mod(u + off, 4) === 0) return -0.03;

    return jitter(Math.floor((u + off) / 4), row, 81) * 0.035;
  },

  //thatch: straws down the slope, a row of it every three
  thatch: function (u, v) {
    return (mod(v, 3) === 2 ? -0.06 : 0) + jitter(u, v >> 2, 91) * 0.07;
  },

  //a flat roof's felt: seams every eight, a speck here and there
  felt: function (u, v) {
    if (mod(u, 8) === 0) return -0.05;

    var h = hash(u, v, 101);

    return h < 0.08 ? -0.06 : h > 0.95 ? 0.05 : 0;
  },

  //asphalt: dark and light grains of the stones in it, and patches a shade
  //off where it has been mended
  asphalt: function (u, v) {
    var h = hash(u, v, 111),
      k = jitter(u >> 2, v >> 2, 112) * 0.02;

    return k + (h < 0.12 ? -0.07 : h > 0.92 ? 0.07 : 0);
  },

  //paving slabs four by four, the joints between them, and each slab a
  //shade off the next
  slabs: function (u, v) {
    if (mod(u, 4) === 3 || mod(v, 4) === 3) return -0.06;

    return jitter(u >> 2, v >> 2, 121) * 0.03;
  },

  //cast concrete: blotches, the odd pit - and on a wall the lines where the
  //boards it was cast against met
  concrete: function (u, v, side) {
    var k =
      jitter(u >> 1, v >> 1, 131) * 0.025 +
      (hash(u, v, 132) < 0.05 ? -0.05 : 0);

    return side === "side" && mod(v, 4) === 0 ? k - 0.04 : k;
  },

  //a tarp hung on a fence: folds down it, and creases between them
  tarp: function (u, v, side) {
    if (side === "top") return 0;

    return (mod(u, 8) === 4 ? -0.08 : 0) + jitter(u >> 1, v >> 2, 171) * 0.04;
  },

  //grass: dark tufts and light blades over a mottle
  grass: function (u, v) {
    var h = hash(u, v, 141),
      k = jitter(u >> 2, v >> 2, 142) * 0.03;

    return k + (h < 0.16 ? -0.08 : h > 0.9 ? 0.06 : 0);
  },

  //water: still, a glint here and there and ripples running across it
  water: function (u, v) {
    var h = hash(u, v, 201);

    if (h < 0.04) return 0.2;
    if (mod(u + 3 * v, 11) === 0) return 0.08;

    return jitter(u >> 2, v >> 1, 202) * 0.02;
  },

  //sand: fine, a grain lighter or darker here and there
  sand: function (u, v) {
    var h = hash(u, v, 181);

    return (
      jitter(u >> 2, v >> 2, 182) * 0.02 +
      (h < 0.1 ? -0.04 : h > 0.92 ? 0.04 : 0)
    );
  },

  //logs laid along the wall, two high: lit on top, in shadow underneath
  logs: function (u, v, side) {
    if (side === "top") return jitter(u, v, 191) * 0.03;

    return (mod(v, 2) ? 0.06 : -0.1) + jitter(u >> 2, v >> 1, 192) * 0.03;
  },

  //gravel: stones every one their own shade
  gravel: function (u, v) {
    return jitter(u, v, 151) * 0.1;
  },

  //bare earth: clods, and the odd stone in it
  dirt: function (u, v) {
    var h = hash(u, v, 161),
      k = jitter(u >> 1, v >> 1, 162) * 0.045;

    return k + (h < 0.1 ? -0.08 : h > 0.95 ? 0.1 : 0);
  },
};

/**
 * The colour of a point of a box with a finish, shaded already: x, y, z where
 * the ray hit it, on the face it went in through - 2 the top, 0 and 1 the
 * sides, a plane it was cut by (normal its normal, otherwise null).
 *
 * It goes by where the point is on its own tile and its own storey - x and y
 * from the tile's corner, z from the floor of the storey it is on - so a part
 * painted on a tile of its own comes out the same as it does in a whole
 * building put together out of it, whichever tile and storey it is laid on.
 *
 * A finish with lit set instead is a box whose colour has had the light on
 * it worked out already - a little column of something round, shaded by
 * which way its surface faces there rather than by the faces of the column -
 * and is painted that colour as it is.
 *
 * @param f {{material: string, sheen: boolean, base: number, storey: number}}
 *        material, what it is made of (see MATERIALS); sheen, for glass, the
 *        sky in it - brighter towards the top of a storey, with a streak of
 *        light across it; base, how high the floor of the first storey is,
 *        and storey, how high a storey
 */
function finish(color, face, normal, f, x, y, z) {
  var base = f.base || 0,
    storey = f.storey || 12,
    //whole units, the pixel the point is in
    lx = Math.floor(mod(x, TILE) + 1e-6),
    ly = Math.floor(mod(y, TILE) + 1e-6),
    lz = Math.floor(mod(z - base, storey) + 1e-6),
    c = color,
    side,
    u,
    v;

  if (normal !== null) {
    side = "slope";
    //down the slope the way it slopes most
    if (Math.abs(normal[0]) > Math.abs(normal[1])) {
      u = ly;
      v = normal[0] > 0 ? lx : -lx - 1;
    } else {
      u = lx;
      v = normal[1] > 0 ? ly : -ly - 1;
    }
  } else if (face === 2) {
    side = "top";
    u = lx;
    v = ly;
  } else {
    side = "side";
    u = face === 1 ? lx : ly;
    v = lz;
  }

  if (f.sheen && side === "side") {
    //brighter up the storey, and a streak running up across it, a step of a
    //pixel up for every one across
    var s = mod(u + lz, 9);

    c = lighter(c, 0.04 + (0.12 * lz) / storey);
    if (s < 1) c = lighter(c, 0.2);
    else if (s < 2) c = lighter(c, 0.09);
  }

  if (f.material !== undefined) {
    var m = MATERIALS[f.material];

    if (m === undefined) throw new Error("no such material: " + f.material);

    c = tint(c, m(u, v, side, luma(color) < 120, f));
  }

  //run down (setWorn): cracked, stained, dusty or sooted
  if (f.worn) c = wear(c, side, x, y, z, f.worn);

  return c;
}

//noise over x, y, smooth between whole steps, 0..1
function smooth(x, y, k) {
  var x0 = Math.floor(x),
    y0 = Math.floor(y),
    fx = x - x0,
    fy = y - y0,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy),
    a = hash(x0, y0, k),
    b = hash(x0 + 1, y0, k),
    c = hash(x0, y0 + 1, k),
    d = hash(x0 + 1, y0 + 1, k);

  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

//the dust a blast leaves over everything, and the soot a fire does
var DUST = [176, 168, 154],
  SOOT = [34, 30, 28];

/**
 * A point of a surface run down (setWorn), x, y, z where it is: on the
 * ground, cracks running through it, a pothole here and there, stains - and
 * over everything, in drifts, the dust a blast left (worn 1), or the soot of
 * a fire (2); on a wall, grime run down it.
 */
function wear(c, side, x, y, z, worn) {
  var drift = smooth(x / 7, y / 7, 311 + worn);

  if (side === "top") {
    var crack = Math.abs(smooth(x / 5, y / 5, 301) - 0.5),
      crack2 = Math.abs(smooth(x / 3 + 17, y / 9, 303) - 0.5);

    if (crack < 0.025 || crack2 < 0.018) c = darker(c, 0.45);
    else if (smooth(x / 4, y / 4, 305) > 0.82) c = darker(c, 0.22);
  } else if (hash(Math.floor(x + y), 0, 307) < 0.3) c = darker(c, 0.12);

  return worn === 2
    ? mix(c, SOOT, 0.25 + 0.45 * drift)
    : mix(c, DUST, 0.1 + 0.3 * drift);
}

function luma(c) {
  return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
}

/**
 * Where the picture of the boxes would be, without painting it: its size, and
 * pivotX/pivotY, where the world's origin lands in it - as render has them.
 */
function measure(boxes) {
  var minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  snapAll(boxes).forEach(function (b) {
    var r = screenBounds(b);

    minX = Math.min(minX, r.minX);
    maxX = Math.max(maxX, r.maxX);
    minY = Math.min(minY, r.minY);
    maxY = Math.max(maxY, r.maxY);
  });

  if (view === "top") {
    var whole = tiles(minX, maxX, minY, maxY);

    minX = whole.minX;
    maxX = whole.maxX;
    minY = whole.minY;
    maxY = whole.maxY;
  }

  minX = Math.floor(minX);
  minY = Math.floor(minY);

  return {
    w: Math.ceil(maxX) - minX,
    h: Math.ceil(maxY) - minY,
    pivotX: -minX,
    pivotY: -minY,
  };
}

/**
 * From above, the whole tiles a picture's bounds are on - what sticks out a
 * hair past a tile's edge, a box snapped a skin over, not counted.
 */
function tiles(minX, maxX, minY, maxY) {
  var T = TILE * TOP,
    e = 1;

  return {
    minX: Math.floor((minX + e) / T) * T,
    maxX:
      Math.max(Math.ceil((maxX - e) / T), Math.floor((minX + e) / T) + 1) * T,
    minY: Math.floor((minY + e) / T) * T,
    maxY:
      Math.max(Math.ceil((maxY - e) / T), Math.floor((minY + e) / T) + 1) * T,
  };
}

/* --- Open ------------------------------------------------------------ */

//which sides of the tile what is painted is open on (setOpen): 1 its side
//towards -x, 2 towards -y, 3 both - 0 for none
var open = 0;

/**
 * Has what is painted next (render) open on sides of its tile - a tile of a
 * building whose tile in front of it has come down (client/demolition
 * open): 1 towards -x, 2 towards -y, 3 both, 0 none. Only those sides can
 * be seen; the picture is as big as it would be shut.
 */
function setOpen(sides) {
  open = sides | 0;
}

//a room's walls, how thick, and its floor and its ceiling; how high a storey
//is, for the floors of something more than a storey high; how wide a room is
//at the most, before a wall across it; how big a box has to be every way to
//be rooms rather than a detail of something
var WALL = 2,
  SLAB = 2,
  CEIL = 1,
  STOREY_Z = 12,
  ROOM_W = 17,
  ROOMY = 8;

//inside: a bare concrete floor, plastered walls
var FLOOR = [146, 142, 134],
  PLASTER = [208, 202, 192];

//whether a colour is leaves, grass - a tree's crown is not a room
function green(c) {
  return c !== undefined && c[1] > c[0] + 18 && c[1] > c[2] + 18;
}

/**
 * The boxes as they are with the sides of the tile it says open (open):
 * every box big enough to be rooms that reaches that side - a storey, the
 * body of a house - hollow inside, its wall on that side gone and whatever
 * was on it, its walls on the other sides, its floor and its ceiling left;
 * and in it empty rooms, a bare floor, plastered walls, a wall across it
 * where it is wide, a floor between storeys where it is more than one high.
 */
function hollow(boxes, sides) {
  var rooms = [];

  boxes.forEach(function (b) {
    if ((b.cuts !== undefined && b.cuts.length > 0) || green(b.color)) return;
    if (b.x1 - b.x0 < ROOMY || b.y1 - b.y0 < ROOMY || b.z1 - b.z0 < ROOMY)
      return;

    var openX = (sides & 1) !== 0 && b.x0 <= 0.5,
      openY = (sides & 2) !== 0 && b.y0 <= 0.5;

    if (!openX && !openY) return;

    var r = {
      b: b,
      openX: openX,
      openY: openY,
      x0: openX ? -1 : b.x0 + WALL,
      x1: b.x1 - WALL,
      y0: openY ? -1 : b.y0 + WALL,
      y1: b.y1 - WALL,
      z0: b.z0 + SLAB,
      z1: b.z1 - CEIL,
    };

    if (
      r.x1 - Math.max(r.x0, b.x0) >= 4 &&
      r.y1 - Math.max(r.y0, b.y0) >= 4 &&
      r.z1 - r.z0 >= 5
    )
      rooms.push(r);
  });

  if (rooms.length === 0) return boxes;

  var out = [];

  boxes.forEach(function (b) {
    var pieces = [b];

    rooms.forEach(function (r) {
      var left = [];

      pieces.forEach(function (p) {
        left = left.concat(subtract(p, r));
      });
      pieces = left;
    });
    out = out.concat(pieces);
  });

  rooms.forEach(function (r) {
    out = out.concat(inside(r));
  });

  return out;
}

//what is left of box b with room r taken out of it - in up to six pieces
function subtract(b, r) {
  if (
    b.x1 <= r.x0 ||
    b.x0 >= r.x1 ||
    b.y1 <= r.y0 ||
    b.y0 >= r.y1 ||
    b.z1 <= r.z0 ||
    b.z0 >= r.z1
  )
    return [b];

  var out = [],
    mx0 = Math.max(b.x0, r.x0),
    mx1 = Math.min(b.x1, r.x1),
    my0 = Math.max(b.y0, r.y0),
    my1 = Math.min(b.y1, r.y1);

  function piece(x0, x1, y0, y1, z0, z1) {
    if (!(x0 < x1 && y0 < y1 && z0 < z1)) return;

    var c = box(x0, x1, y0, y1, z0, z1, b.color, b.finish);

    if (b.cuts !== undefined) c.cuts = b.cuts;
    out.push(c);
  }

  piece(b.x0, r.x0, b.y0, b.y1, b.z0, b.z1);
  piece(r.x1, b.x1, b.y0, b.y1, b.z0, b.z1);
  piece(mx0, mx1, b.y0, r.y0, b.z0, b.z1);
  piece(mx0, mx1, r.y1, b.y1, b.z0, b.z1);
  piece(mx0, mx1, my0, my1, b.z0, r.z0);
  piece(mx0, mx1, my0, my1, r.z1, b.z1);

  return out;
}

//what is in a room opened up: its floor and its ceiling, concrete where
//they were cut through; its walls plastered; a wall across it, where it is
//wide; and the floors between its storeys
function inside(r) {
  var b = r.b,
    x0 = Math.max(r.x0, b.x0),
    y0 = Math.max(r.y0, b.y0),
    out = [
      box(x0, r.x1, y0, r.y1, b.z0, r.z0, FLOOR),
      box(x0, r.x1, y0, r.y1, r.z1, b.z1, FLOOR),
      //the walls it is seen to have: at its back, and along its far side
      box(r.x1, r.x1 + 1, y0, r.y1, r.z0, r.z1, PLASTER),
      box(x0, r.x1, r.y1, r.y1 + 1, r.z0, r.z1, PLASTER),
    ],
    z,
    c;

  for (z = b.z0 + STOREY_Z; z + SLAB < r.z1 - 3; z += STOREY_Z)
    out.push(box(x0, r.x1, y0, r.y1, z, z + SLAB, FLOOR));

  //a wall across it, from the back of it to near the opening
  if (r.openX && r.y1 - y0 >= ROOM_W) {
    c = Math.round((y0 + r.y1) / 2);
    out.push(box(x0 + 2, r.x1, c, c + 1, r.z0, r.z1, PLASTER));
  }
  if (r.openY && r.x1 - x0 >= ROOM_W) {
    c = Math.round((x0 + r.x1) / 2);
    out.push(box(c, c + 1, y0 + 2, r.y1, r.z0, r.z1, PLASTER));
  }

  return out;
}

/* --- Run down -------------------------------------------------------- */

//what is painted next run down (setWorn): 1 wrecked by a blast, 2 burnt -
//0 as it is
var worn = 0;

/**
 * Has what is painted next (render) run down: a yard, a park, a garden of a
 * building blown up (1) or burnt down (2) - 0 as it is (client/spritecache
 * wornName). The same picture, as big, as it would be.
 */
function setWorn(kind) {
  worn = kind | 0;
}

//dried leaves, a dead tree's; grass gone dry; water gone murky; what is
//burnt black; and the colour things go dull to
var DRIED = [118, 98, 70],
  DRY_GRASS = [156, 146, 96],
  BURNT_GRASS = [58, 50, 42],
  MURK = [92, 96, 70],
  CHARRED = [40, 34, 30],
  DULL = [128, 124, 118];

//what lies strewn about a yard wrecked: lumps of concrete, brick, timber,
//glass - or, burnt, char and ash
var WRECKAGE = [
    [150, 146, 138],
    [140, 72, 52],
    [104, 76, 52],
    [196, 204, 206],
    [118, 114, 108],
  ],
  ASHES = [
    [40, 34, 30],
    [110, 104, 96],
    [96, 56, 44],
    [62, 56, 52],
  ];

//a number 0..1 for a box, the same for the same box every time
function boxHash(b, k) {
  return hash(
    Math.round(b.x0 * 4 + b.x1 * 7),
    Math.round(b.y0 * 5 + b.y1 * 3),
    Math.round(b.z0 * 11 + b.z1 * 13) + k,
  );
}

function brown(c) {
  return c !== undefined && c[0] > c[2] + 20 && c[1] > c[2] && c[0] < 170;
}

function blue(c) {
  return c !== undefined && c[2] > c[0] + 30 && c[2] > c[1] + 5;
}

/**
 * The boxes of what is painted run down (worn): what lies on the ground -
 * the lot, paving, asphalt, sand - cracked, stained, the grass gone dry or
 * burnt (wear); a tree dead, a bare trunk and a few dried leaves, or burnt
 * black; water gone murky; what stood on it - swings, a slide, benches,
 * lamps, bins - some of it gone, some knocked flat, the rest dull, or
 * charred; and lumps of what was blown over it strewn about.
 */
function rundown(boxes, kind) {
  var out = [],
    seed = 0;

  boxes.forEach(function (b) {
    seed = (seed + Math.round(b.x0 * 31 + b.y1 * 17 + b.z1 * 7)) | 0;
  });

  boxes.forEach(function (b) {
    var dx = b.x1 - b.x0,
      dy = b.y1 - b.y0,
      dz = b.z1 - b.z0,
      h = boxHash(b, kind),
      ground = b.z0 <= 1.5 && dz <= 1.5 && dx >= 3 && dy >= 3,
      c = copy(b);

    c.finish = Object.assign({}, b.finish || {}, { worn: kind });
    if (kind === 2 && c.finish.sheen) c.finish.sheen = false;

    if (ground) {
      if (green(b.color))
        c.color = mix(b.color, kind === 2 ? BURNT_GRASS : DRY_GRASS, 0.55);
      else if (blue(b.color)) c.color = mix(b.color, MURK, 0.6);
      out.push(c);
      return;
    }

    //a tree's crown: a few dried leaves left, or none, burnt
    if (green(b.color)) {
      if (h < (kind === 2 ? 0.05 : 0.16)) {
        c.color = mix(b.color, kind === 2 ? CHARRED : DRIED, 0.85);
        out.push(c);
      }
      return;
    }

    //a trunk, a post: standing, bare, or charred
    if (brown(b.color) && dx <= 1.5 && dy <= 1.5 && dz >= 2) {
      c.color = kind === 2 ? mix(b.color, CHARRED, 0.8) : darker(b.color, 0.1);
      out.push(c);
      return;
    }

    if (blue(b.color)) {
      c.color = mix(b.color, MURK, 0.6);
      out.push(c);
      return;
    }

    //what stood there: some of it gone, some knocked flat, the rest dull
    if (h < 0.28) return;

    if (h < 0.55 && dz >= 3 && dz > 2 * Math.max(dx, dy)) {
      var along = h < 0.42,
        long = Math.min(dz, along ? TILE - b.x0 : TILE - b.y0);

      c.z1 = c.z0 + Math.max(1, Math.min(dx, dy));
      if (along) c.x1 = c.x0 + long;
      else c.y1 = c.y0 + long;
    }

    c.color = mix(b.color, kind === 2 ? CHARRED : DULL, kind === 2 ? 0.6 : 0.3);
    out.push(c);
  });

  //and lumps of what was blown over it, or burnt, lying about
  var lumps = kind === 2 ? ASHES : WRECKAGE,
    n = kind === 2 ? 8 : 12;

  for (var i = 0; i < n; i++) {
    var x = 2 + Math.floor(hash(seed, i, 401) * 27),
      y = 2 + Math.floor(hash(seed, i, 403) * 27),
      w = 1 + Math.floor(hash(seed, i, 405) * 2),
      d = 1 + Math.floor(hash(seed, i, 407) * 2),
      lump = box(x, x + w, y, y + d, 1, 2, lumps[i % lumps.length]);

    lump.finish = { worn: kind };
    out.push(lump);
  }

  return out;
}

//a box as it is, its own
function copy(b) {
  var c = box(b.x0, b.x1, b.y0, b.y1, b.z0, b.z1, b.color, b.finish);

  if (b.cuts !== undefined) c.cuts = b.cuts;
  if (b.seams) c.seams = b.seams;

  return c;
}

/* --- Ruins ----------------------------------------------------------- */

//what is painted next as a ruin (setRuin): "s" burnt out and standing, "b"
//burnt and fallen in, "c" fallen in, rubble - null as it is; and how many
//storeys of it came down onto what is painted, for how high its heap is
var ruin = null,
  ruinStoreys = 0;

/**
 * Has what is painted next (render) a ruin of itself - a part of a building
 * burnt down or come down (client/ruin, client/buildingview): "s" its
 * shell, burnt out but standing, no roof, black holes where its windows and
 * doors were; "b" burnt and fallen in, its walls broken off about a storey
 * up and a heap of charred beams and rubble in them; "c" come down, the
 * same but not burnt, the heap of what it was built of - storeys how many
 * storeys came down onto it (0 for as many as it has). null for itself.
 * The same picture, as big, as it would be.
 */
function setRuin(kind, storeys) {
  ruin = kind || null;
  ruinStoreys = storeys | 0;
}

//a window, a door, gone: the black of a hole into a burnt-out building; the
//floor inside, ash; and what a heap of it has in it besides what it was
//built of: timber, concrete, steel - charred black, burnt
var HOLE = [20, 18, 17],
  ASH_FLOOR = [70, 64, 58],
  TIMBER = [118, 86, 58],
  CONCRETE_GREY = [150, 146, 140],
  STEEL = [104, 106, 112],
  CHAR_BLACK = [34, 29, 26],
  ASH = [110, 104, 96];

//how thick a wall left standing is; how high a wall of a building fallen in
//is left, at the most; and a storey, for how high its heap is
var RUIN_WALL = 2,
  STUB = 13,
  STOREY_HEAP = 2.6;

//whether a box is glass - a window - or a door: thin, and that colour
function glassy(b) {
  return (
    (b.finish !== undefined && b.finish.sheen) ||
    (blue(b.color) && Math.min(b.x1 - b.x0, b.y1 - b.y0) <= 1.5)
  );
}

function doorish(b) {
  var c = b.color;

  return (
    c !== undefined &&
    Math.min(b.x1 - b.x0, b.y1 - b.y0) <= 1 &&
    c[0] < 110 &&
    c[1] < 100 &&
    c[2] < 90 &&
    c[0] >= c[2]
  );
}

//whether box b touches box m, or stands as near it as a balcony does -
//something on the building, not in the garden round it
function touches(b, m) {
  return !(
    b.x1 < m.x0 - 3.5 ||
    b.x0 > m.x1 + 3.5 ||
    b.y1 < m.y0 - 3.5 ||
    b.y0 > m.y1 + 3.5
  );
}

/**
 * The boxes of a part as a ruin of it (setRuin): its building - every box
 * big enough to be rooms (the storeys of a block, the body of a house) -
 * roofless and hollow, and what is on it as its walls are; what is round
 * it, a garden, a fence, left as it was.
 */
function ruined(boxes, kind, storeys) {
  var masses = boxes.filter(function (b) {
    return (
      (b.cuts === undefined || b.cuts.length === 0) &&
      !green(b.color) &&
      b.x1 - b.x0 >= ROOMY &&
      b.y1 - b.y0 >= ROOMY &&
      b.z1 - b.z0 >= ROOMY - 2
    );
  });

  //no building on it: a roof laid on one (gone), or what is round one
  if (masses.length === 0)
    return boxes.every(function (b) {
      return b.z0 >= 4;
    })
      ? []
      : boxes;

  var top = -Infinity,
    burnt = kind !== "c",
    fallen = kind !== "s",
    seed = 0,
    colours = [],
    rooms = [];

  masses.forEach(function (m) {
    top = Math.max(top, m.z1);
    seed = (seed + Math.round(m.x0 * 7 + m.y1 * 13 + m.z0 * 3)) | 0;
  });

  //how high what is left of it stands, here: all of it, or a stub
  function cap(x, y, m) {
    if (!fallen) return Infinity;

    return (
      m.z0 +
      SLAB +
      Math.min(m.z1 - m.z0, STUB) *
        (0.3 + 0.7 * smooth(x / 3 + 5, y / 3 + 9, seed & 1023))
    );
  }

  //the mass a box is on, if any
  function on(b) {
    for (var i = 0; i < masses.length; i++)
      if (touches(b, masses[i])) return masses[i];

    return null;
  }

  //what it was built of, for its heap
  boxes.forEach(function (b) {
    if (b.color !== undefined && !green(b.color) && on(b) !== null)
      colours.push(b.color);
  });

  var out = [];

  boxes.forEach(function (b) {
    var m = on(b);

    //round it: as it was
    if (m === null) {
      out.push(b);
      return;
    }

    //a roof, what is laid on top of it: gone
    if ((b.cuts !== undefined && b.cuts.length > 0) || b.z0 >= top - 0.5)
      return;

    //its plants: burnt away, or as they were
    if (green(b.color)) {
      if (!burnt) out.push(b);
      return;
    }

    var c = copy(b);

    c.finish = Object.assign({}, b.finish || {}, {
      worn: burnt ? 2 : 1,
      sheen: false,
    });

    //windows and doors: holes, or gone with the walls - and over a hole,
    //the soot the fire left on the wall as it came out of it
    if (glassy(b) || doorish(b)) {
      if (fallen) return;
      c.color = HOLE;
      c.finish = undefined;
      out.push(c);
      out.push(soot(b, top));
      return;
    }

    //charred, the more the higher up, where the heat went
    c.color = burnt
      ? mix(b.color, CHARRED, 0.4 + 0.35 * Math.min(1, (b.z0 - m.z0) / 14))
      : mix(b.color, DULL, 0.15);

    //fallen in: only as high as the stub of the wall it is on
    if (fallen && masses.indexOf(b) < 0) {
      var h = cap((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, m);

      if (c.z0 >= h) return;
      c.z1 = Math.min(c.z1, h);
    }

    out.push(c);
  });

  //every one of it hollow, open to the sky - its walls left, and fallen in,
  //broken off a step at a time along them, any height
  masses.forEach(function (m) {
    rooms.push({
      m: m,
      x0: m.x0 + RUIN_WALL,
      x1: m.x1 - RUIN_WALL,
      y0: m.y0 + RUIN_WALL,
      y1: m.y1 - RUIN_WALL,
      z0: m.z0 + SLAB,
      z1: Infinity,
    });
  });

  var shell = [];

  out.forEach(function (b) {
    var pieces = [b];

    rooms.forEach(function (r) {
      var left = [];

      pieces.forEach(function (p) {
        left = left.concat(subtract(p, r));
      });
      pieces = left;
    });

    pieces.forEach(function (p) {
      var m = masses.filter(function (x) {
        return touches(p, x);
      })[0];

      //a wall fallen in: in steps along it, each as high as it is left
      if (fallen && m !== undefined && p.z1 - p.z0 > SLAB) {
        var along = p.x1 - p.x0 >= p.y1 - p.y0;

        for (var a = along ? p.x0 : p.y0; a < (along ? p.x1 : p.y1); a += 3) {
          var e = Math.min(a + 3, along ? p.x1 : p.y1),
            x = along ? (a + e) / 2 : (p.x0 + p.x1) / 2,
            y = along ? (p.y0 + p.y1) / 2 : (a + e) / 2,
            h = Math.min(p.z1, cap(x, y, m));

          if (h <= p.z0) continue;

          var step = copy(p);

          if (along) {
            step.x0 = a;
            step.x1 = e;
          } else {
            step.y0 = a;
            step.y1 = e;
          }
          step.z1 = h;
          shell.push(step);
        }
        return;
      }

      shell.push(p);
    });
  });

  rooms.forEach(function (r, k) {
    shell = shell.concat(
      fallen
        ? heap(r, burnt, storeys, colours, seed + k * 101)
        : burntOut(r, seed + k * 101),
    );
  });

  return shell;
}

//the soot over a window or a door of a shell burnt out (ruined): a stain up
//the wall from it, a step proud of it, a few pixels up
function soot(b, top) {
  var thinX = b.x1 - b.x0 < b.y1 - b.y0,
    up = Math.min(top - b.z1, 5),
    stain = copy(b);

  stain.z0 = b.z1;
  stain.z1 = b.z1 + Math.max(1, up);
  stain.color = CHAR_BLACK;
  stain.finish = { worn: 2 };
  if (thinX) stain.x0 = stain.x1 - 0.5;
  else stain.y0 = stain.y1 - 0.5;

  return stain;
}

//inside a shell burnt out: its floor ash, beams fallen across it, charred
//lumps of what was in it
function burntOut(r, seed) {
  var out = [box(r.x0, r.x1, r.y0, r.y1, r.z0 - 1, r.z0, ASH_FLOOR)],
    i;

  for (i = 0; i < 3; i++) {
    var along = hash(seed, i, 501) < 0.5,
      a = along ? r.y0 + 1 + hash(seed, i, 503) * (r.y1 - r.y0 - 2) : 0,
      b = along ? 0 : r.x0 + 1 + hash(seed, i, 505) * (r.x1 - r.x0 - 2);

    out.push(
      along
        ? box(r.x0, r.x1, a, a + 1, r.z0, r.z0 + 1, CHAR_BLACK)
        : box(b, b + 1, r.y0, r.y1, r.z0, r.z0 + 1, CHAR_BLACK),
    );
  }

  for (i = 0; i < 8; i++) {
    var x = r.x0 + Math.floor(hash(seed, i, 507) * (r.x1 - r.x0 - 1)),
      y = r.y0 + Math.floor(hash(seed, i, 509) * (r.y1 - r.y0 - 1));

    out.push(box(x, x + 1, y, y + 1, r.z0, r.z0 + 1, i % 2 ? ASH : CHAR_BLACK));
  }

  return out;
}

/**
 * The heap a building fallen in leaves in its walls: higher in the middle,
 * as high as storeys of it came down (as many as it stands, without) - of
 * lumps of what it was built of (colours), its floors fallen in on each
 * other where it was concrete, and beams across it and out over its walls;
 * burnt, charred black and ash.
 */
function heap(r, burnt, storeys, colours, seed) {
  var m = r.m,
    n = storeys > 0 ? storeys : Math.max(1, Math.round((m.z1 - m.z0) / 12)),
    high = Math.min(m.z1 - r.z0 - 1, 3 + STOREY_HEAP * n),
    cx = (r.x0 + r.x1) / 2,
    cy = (r.y0 + r.y1) / 2,
    rx = (r.x1 - r.x0) / 2 + 1,
    ry = (r.y1 - r.y0) / 2 + 1,
    stone =
      colours.filter(function (c) {
        return luma(c) > 110;
      }).length >
      colours.length / 2,
    out = [],
    x,
    y,
    i;

  function lump(k) {
    var pick = hash(seed, k, 521);

    if (burnt)
      return pick < 0.45
        ? CHAR_BLACK
        : pick < 0.7
          ? ASH
          : mix(colours[k % colours.length] || DULL, CHARRED, 0.55);

    return pick < 0.15
      ? CONCRETE_GREY
      : colours[Math.floor(hash(seed, k, 523) * colours.length)] || DULL;
  }

  //the heap: higher in the middle, lumpy
  for (x = r.x0; x < r.x1; x += 2)
    for (y = r.y0; y < r.y1; y += 2) {
      var dx = (x + 1 - cx) / rx,
        dy = (y + 1 - cy) / ry,
        d = dx * dx + dy * dy,
        h = Math.round(
          high * Math.max(0, 1 - d) * (0.6 + 0.4 * hash(x, y, seed + 527)),
        );

      if (h < 1) continue;

      out.push(
        box(
          x,
          Math.min(x + 2, r.x1),
          y,
          Math.min(y + 2, r.y1),
          r.z0,
          r.z0 + h,
          lump(x * 31 + y),
        ),
      );
    }

  //its floors fallen in on each other, where it was concrete
  if (stone && !burnt)
    for (i = 0; i < Math.min(n, 4); i++) {
      var sx = r.x0 + hash(seed, i, 531) * (r.x1 - r.x0) * 0.4,
        sy = r.y0 + hash(seed, i, 533) * (r.y1 - r.y0) * 0.4,
        z = r.z0 + Math.round((high * (i + 1)) / (n + 1));

      out.push(
        box(
          Math.round(sx),
          Math.round(Math.min(r.x1, sx + (r.x1 - r.x0) * 0.6)),
          Math.round(sy),
          Math.round(Math.min(r.y1, sy + (r.y1 - r.y0) * 0.6)),
          z,
          z + 1,
          CONCRETE_GREY,
        ),
      );
    }

  //beams across it, out over its walls
  for (i = 0; i < 3 + n; i++) {
    var along = hash(seed, i, 541) < 0.5,
      at = along
        ? r.y0 + 1 + Math.floor(hash(seed, i, 543) * (r.y1 - r.y0 - 2))
        : r.x0 + 1 + Math.floor(hash(seed, i, 545) * (r.x1 - r.x0 - 2)),
      from = along
        ? r.x0 - 2 + Math.floor(hash(seed, i, 547) * 4)
        : r.y0 - 2 + Math.floor(hash(seed, i, 549) * 4),
      length = 8 + Math.floor(hash(seed, i, 551) * 10),
      bz = r.z0 + Math.round(high * (0.3 + 0.6 * hash(seed, i, 553))),
      colour = burnt ? CHAR_BLACK : stone ? STEEL : TIMBER;

    out.push(
      along
        ? box(
            from,
            Math.min(from + length, m.x1 + 2),
            at,
            at + 1,
            bz,
            bz + 1,
            colour,
          )
        : box(
            at,
            at + 1,
            from,
            Math.min(from + length, m.y1 + 2),
            bz,
            bz + 1,
            colour,
          ),
    );
  }

  out.forEach(function (b) {
    b.finish = { worn: burnt ? 2 : 1 };
  });

  return out;
}

/* --- Interiors ------------------------------------------------------ */

//a building's rooms as it is built: how thick its walls are, its floor and
//its ceiling, and the plaster on its walls inside; how high a storey is, for
//the floors of a box more than one high; how wide a room is at the most
//before a wall across it; how big a box has to be every way to be rooms
//rather than a detail of something; and how deep an opening is cut through
//whatever it is laid on
var ROOM_WALL = 2,
  ROOM_SLAB = 2,
  ROOM_CEILING = 1,
  ROOM_PLASTER = 1,
  ROOM_STOREY = 12,
  ROOM_WIDE = 17,
  ROOM_LEAST = 8,
  OPENING_DEPTH = 2.5;

//how far behind a wall's face a pane in it is set through it (glazed): what
//is laid on the face, the pane, a mullion over it, left as it is
var FACE_SKIN = 1.5 / 64;

//inside: a bare concrete floor, plastered walls - and indoors, out of the
//sun, how much darker anything is than it would be lit as it is
var BARE_FLOOR = [146, 142, 134],
  PLASTERED = [208, 202, 192],
  INDOOR_DARK = 0.42;

//the spaces indoors of what is being painted (interiors, indoor): rooms,
//the inside of a shell going up - whatever of it is seen in them darker
var indoors = [];

/**
 * A space indoors, x0..x1, y0..y1, z0..z1 - the inside of the shell of a
 * building going up, its walls round it and openings left in them: nothing
 * to be seen itself, only whatever of it is seen in it painted darker, out
 * of the sun, as a room is (interiors). Laid with the boxes, cut and turned
 * with them.
 *
 * @returns {Object} a box to be laid with the others
 */
function indoor(x0, x1, y0, y1, z0, z1) {
  return box(x0, x1, y0, y1, z0, z1, undefined, { indoors: true });
}

//whether a point is indoors (indoors), on its walls or its floor as well
function indoorAt(x, y, z) {
  var e = 0.02;

  for (var i = 0; i < indoors.length; i++) {
    var r = indoors[i];

    if (
      x >= r.x0 - e &&
      x <= r.x1 + e &&
      y >= r.y0 - e &&
      y <= r.y1 + e &&
      z >= r.z0 - e &&
      z <= r.z1 + e
    )
      return true;
  }

  return false;
}

//whether a box is leaves, grass - a tree's crown, a hedge, a lawn is not a
//room - by its colour: green, and not glass, which shines, nor a wall
//painted green, which is made of something
function leafy(b) {
  var c = b.color,
    f = b.finish;

  if (c === undefined || !(c[1] > c[0] + 18 && c[1] > c[2] + 18)) return false;

  return !(
    f !== undefined &&
    (f.sheen || (f.material !== undefined && f.material !== "grass"))
  );
}

//whether a box is rooms - the body of a house, a storey of a block, a shop -
//rather than a detail of something: big enough every way, square, not
//leaves
function roomy(b) {
  return (
    (b.cuts === undefined || b.cuts.length === 0) &&
    !leafy(b) &&
    b.x1 - b.x0 >= ROOM_LEAST &&
    b.y1 - b.y0 >= ROOM_LEAST &&
    b.z1 - b.z0 >= ROOM_LEAST
  );
}

//whether a box is a pane of glass: shining, or thin and blue
function paneOf(b) {
  var c = b.color;

  return (
    (b.finish !== undefined && !!b.finish.sheen) ||
    (c !== undefined &&
      c[2] > c[0] + 30 &&
      c[2] > c[1] + 5 &&
      Math.min(b.x1 - b.x0, b.y1 - b.y0) <= 1.5)
  );
}

/**
 * The boxes as a building is built, inside as well as out:
 *
 *   - every box of it big enough to be rooms (roomy) hollow, its walls on
 *     its faces and open at its seams, where it runs on into more of itself
 *     on the next tile (seamed): a bare concrete floor to every storey, its
 *     ceiling, plaster on the walls that can be seen inside, a wall across
 *     it where it is wide - a storey all of glass an open floor inside its
 *     glass walls;
 *   - every pane of glass in a wall of it set in a hole through the wall,
 *     glass through it, a window from inside as well as out;
 *   - every opening left in a wall going up (opening) a hole through it.
 *
 * Seen from outside it is as it was: its rooms only where its walls are not,
 * at a seam - where the tile next to it has gone - or through an opening.
 */
function interiors(boxes) {
  boxes = pierce(boxes);

  var rooms = [];

  boxes.forEach(function (b) {
    //rooms - and seen: only through a seam on a side that looks this way,
    //towards -x or -y; shut all round, it is as it would be solid
    if (!roomy(b) || !b.seams || !(b.seams.x0 || b.seams.y0)) return;

    var s = b.seams,
      r = {
        b: b,
        glass: b.finish !== undefined && !!b.finish.sheen,
        seams: s,
        x0: s.x0 ? b.x0 - 1 : b.x0 + ROOM_WALL,
        x1: s.x1 ? b.x1 + 1 : b.x1 - ROOM_WALL,
        y0: s.y0 ? b.y0 - 1 : b.y0 + ROOM_WALL,
        y1: s.y1 ? b.y1 + 1 : b.y1 - ROOM_WALL,
        z0: b.z0 + ROOM_SLAB,
        z1: b.z1 - ROOM_CEILING,
      };

    if (
      Math.min(r.x1, b.x1) - Math.max(r.x0, b.x0) >= 4 &&
      Math.min(r.y1, b.y1) - Math.max(r.y0, b.y0) >= 4 &&
      r.z1 - r.z0 >= 5
    )
      rooms.push(r);
  });

  rooms.forEach(function (r) {
    indoors.push({
      x0: Math.max(r.x0, r.b.x0),
      x1: Math.min(r.x1, r.b.x1),
      y0: Math.max(r.y0, r.b.y0),
      y1: Math.min(r.y1, r.b.y1),
      z0: r.z0,
      z1: r.z1,
    });
  });

  if (rooms.length === 0) return boxes;

  var out = [];

  //the rooms taken out of it - not out of a roof, which is no room
  boxes.forEach(function (b) {
    var pieces = [b];

    if (b.cuts === undefined || b.cuts.length === 0)
      rooms.forEach(function (r) {
        var left = [];

        pieces.forEach(function (p) {
          left = left.concat(minus(p, r));
        });
        pieces = left;
      });
    out = out.concat(pieces);
  });

  rooms.forEach(function (r) {
    out = out.concat(furnished(r));
  });
  rooms.forEach(function (r) {
    if (!r.glass) out = glazed(r, boxes, out);
  });

  return out;
}

//the boxes without the spaces indoors laid with them (indoor) - which are
//kept, for what is seen in them (indoorAt), from now till the next picture
function withoutIndoors(boxes) {
  indoors = [];

  return boxes.filter(function (b) {
    if (!(b.finish !== undefined && b.finish.indoors)) return true;

    indoors.push({
      x0: b.x0,
      x1: b.x1,
      y0: b.y0,
      y1: b.y1,
      z0: b.z0,
      z1: b.z1,
    });

    return false;
  });
}

//what is left of box b with the space r taken out of it - in up to six
//pieces
function minus(b, r) {
  if (
    b.x1 <= r.x0 ||
    b.x0 >= r.x1 ||
    b.y1 <= r.y0 ||
    b.y0 >= r.y1 ||
    b.z1 <= r.z0 ||
    b.z0 >= r.z1
  )
    return [b];

  var out = [],
    mx0 = Math.max(b.x0, r.x0),
    mx1 = Math.min(b.x1, r.x1),
    my0 = Math.max(b.y0, r.y0),
    my1 = Math.min(b.y1, r.y1);

  function piece(x0, x1, y0, y1, z0, z1) {
    if (!(x0 < x1 && y0 < y1 && z0 < z1)) return;

    var c = box(x0, x1, y0, y1, z0, z1, b.color, b.finish);

    if (b.cuts !== undefined) c.cuts = b.cuts;
    out.push(c);
  }

  piece(b.x0, r.x0, b.y0, b.y1, b.z0, b.z1);
  piece(r.x1, b.x1, b.y0, b.y1, b.z0, b.z1);
  piece(mx0, mx1, b.y0, r.y0, b.z0, b.z1);
  piece(mx0, mx1, r.y1, b.y1, b.z0, b.z1);
  piece(mx0, mx1, my0, my1, b.z0, r.z0);
  piece(mx0, mx1, my0, my1, r.z1, b.z1);

  return out;
}

//what is in a room (interiors): its floor, concrete; the floors between
//its storeys; plaster on its walls that can be seen inside, at its back and
//along its far side; and a wall across it, where it is wide
function furnished(r) {
  var b = r.b,
    x0 = Math.max(r.x0, b.x0),
    x1 = Math.min(r.x1, b.x1),
    y0 = Math.max(r.y0, b.y0),
    y1 = Math.min(r.y1, b.y1),
    out = [box(x0, x1, y0, y1, b.z0, r.z0, BARE_FLOOR)],
    z,
    c;

  for (z = b.z0 + ROOM_STOREY; z + ROOM_SLAB < r.z1 - 3; z += ROOM_STOREY)
    out.push(box(x0, x1, y0, y1, z, z + ROOM_SLAB, BARE_FLOOR));

  if (r.glass) return out;

  if (!r.seams.x1)
    out.push(box(r.x1, r.x1 + ROOM_PLASTER, y0, y1, r.z0, r.z1, PLASTERED));
  if (!r.seams.y1)
    out.push(box(x0, x1, r.y1, r.y1 + ROOM_PLASTER, r.z0, r.z1, PLASTERED));

  if (y1 - y0 >= ROOM_WIDE) {
    c = Math.round((y0 + y1) / 2);
    out.push(box(x0, x1, c, c + 1, r.z0, r.z1, PLASTERED));
  }
  if (x1 - x0 >= ROOM_WIDE) {
    c = Math.round((x0 + x1) / 2);
    out.push(box(c, c + 1, y0, y1, r.z0, r.z1, PLASTERED));
  }

  return out;
}

//every pane of glass in a wall of a room (interiors) set in a hole through
//the wall, glass through it to the room - the pane as it was outside, a
//window inside - of the boxes as they were, out of the boxes as they are:
//in the walls at its back and its far side, the ones seen from inside
function glazed(r, boxes, out) {
  var b = r.b,
    s = r.seams,
    //along a wall, between the walls across its ends
    ya = s.y0 ? b.y0 : b.y0 + ROOM_WALL,
    yb = s.y1 ? b.y1 : b.y1 - ROOM_WALL,
    xa = s.x0 ? b.x0 : b.x0 + ROOM_WALL,
    xb = s.x1 ? b.x1 : b.x1 - ROOM_WALL,
    holes = [];

  boxes.forEach(function (g) {
    if (g === b || !paneOf(g)) return;

    var z0 = Math.max(g.z0, r.z0),
      z1 = Math.min(g.z1, r.z1),
      thinX = g.x1 - g.x0 <= 1.5,
      thinY = g.y1 - g.y0 <= 1.5,
      y0 = Math.max(g.y0, ya),
      y1 = Math.min(g.y1, yb),
      x0 = Math.max(g.x0, xa),
      x1 = Math.min(g.x1, xb),
      through = null;

    if (z1 - z0 < 1) return;

    //in a wall at +x or at +y, the ones whose inside can be seen - through
    //it from just behind its face, where the pane and whatever is laid over
    //it are, to the room
    if (thinX && y1 - y0 >= 1 && !s.x1 && g.x0 <= b.x1 + 0.5)
      if (g.x1 >= b.x1 - ROOM_WALL)
        through = [b.x1 - ROOM_WALL - 0.01, b.x1 - FACE_SKIN, y0, y1];

    if (through === null && thinY && x1 - x0 >= 1 && !s.y1)
      if (g.y0 <= b.y1 + 0.5 && g.y1 >= b.y1 - ROOM_WALL)
        through = [x0, x1, b.y1 - ROOM_WALL - 0.01, b.y1 - FACE_SKIN];

    if (through !== null) holes.push({ g: g, at: through, z0: z0, z1: z1 });
  });

  holes.forEach(function (h) {
    var hole = {
        x0: h.at[0],
        x1: h.at[1],
        y0: h.at[2],
        y1: h.at[3],
        z0: h.z0,
        z1: h.z1,
      },
      left = [];

    out.forEach(function (p) {
      left = left.concat(paneOf(p) ? [p] : minus(p, hole));
    });
    out = left;

    //the glass through the wall
    out.push(
      box(
        h.at[0],
        h.at[1],
        h.at[2],
        h.at[3],
        h.z0,
        h.z1,
        h.g.color,
        h.g.finish,
      ),
    );
  });

  return out;
}

//every opening left in a wall going up (opening) a hole through whatever it
//is laid on - the wall, its plaster - and gone itself
function pierce(boxes) {
  var openings = boxes.filter(function (b) {
    return b.finish !== undefined && b.finish.opening;
  });

  if (openings.length === 0) return boxes;

  var out = boxes.filter(function (b) {
    return !(b.finish !== undefined && b.finish.opening);
  });

  openings.forEach(function (o) {
    var thinX = o.x1 - o.x0 <= o.y1 - o.y0,
      hole = {
        x0: o.x0 - (thinX ? OPENING_DEPTH : 0),
        x1: o.x1 + (thinX ? OPENING_DEPTH : 0),
        y0: o.y0 - (thinX ? 0 : OPENING_DEPTH),
        y1: o.y1 + (thinX ? 0 : OPENING_DEPTH),
        z0: o.z0,
        z1: o.z1,
      },
      left = [];

    out.forEach(function (b) {
      var on =
        b.x1 >= o.x0 - 0.06 &&
        b.x0 <= o.x1 + 0.06 &&
        b.y1 >= o.y0 - 0.06 &&
        b.y0 <= o.y1 + 0.06 &&
        b.z1 > o.z0 &&
        b.z0 < o.z1;

      left = left.concat(on ? minus(b, hole) : [b]);
    });
    out = left;
  });

  return out;
}

/**
 * The picture of the boxes, with pivotX/pivotY where the world's origin lands
 * in it - from above, the whole tiles it is on. Open on the sides setOpen
 * says, as big a picture as it would be shut.
 */
function render(boxes) {
  var minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    i,
    j,
    w,
    h,
    pixels;

  boxes = snapAll(boxes);

  boxes.forEach(function (b) {
    var r = screenBounds(b);

    minX = Math.min(minX, r.minX);
    maxX = Math.max(maxX, r.maxX);
    minY = Math.min(minY, r.minY);
    maxY = Math.max(maxY, r.maxY);
  });

  //the spaces indoors laid with it out of it, first (isobox indoor)
  boxes = withoutIndoors(boxes);

  if (open !== 0 && view !== "top") boxes = hollow(boxes, open);
  if (worn !== 0) boxes = rundown(boxes, worn);
  if (ruin !== null) boxes = ruined(boxes, ruin, ruinStoreys);

  //as it is built, inside as well as out - the same size as it would be
  //solid; what is seen of it from straight above is its top all the same
  if (view !== "top") boxes = interiors(boxes);

  boxes = boxes.map(function (b) {
    var r = screenBounds(b);

    return {
      x0: b.x0,
      x1: b.x1,
      y0: b.y0,
      y1: b.y1,
      z0: b.z0,
      z1: b.z1,
      color: b.color,
      finish: b.finish,
      cuts: b.cuts,
      sMinX: r.minX,
      sMaxX: r.maxX,
      sMinY: r.minY,
      sMaxY: r.maxY,
    };
  });

  if (view === "top") {
    var whole = tiles(minX, maxX, minY, maxY);

    minX = whole.minX;
    maxX = whole.maxX;
    minY = whole.minY;
    maxY = whole.maxY;
  }

  minX = Math.floor(minX);
  minY = Math.floor(minY);
  w = Math.ceil(maxX) - minX;
  h = Math.ceil(maxY) - minY;
  pixels = [];

  if (sections() > 1) return sideBySide(boxes, minX, minY, w, h, sections());

  for (j = 0; j < h; j++) {
    for (i = 0; i < w; i++)
      pixels.push(cast(boxes, minX + i + 0.5, minY + j + 0.5));
  }

  return { w: w, h: h, pixels: pixels, pivotX: -minX, pivotY: -minY };
}

/**
 * The n pictures a mode paints at once (see mode) side by side in one, each
 * w across, all from the one ray per pixel - its pivot that of the first.
 */
function sideBySide(boxes, minX, minY, w, h, n) {
  var rows = [],
    pixels = [],
    i,
    j,
    k,
    c;

  for (k = 0; k < n; k++) rows.push([]);

  for (j = 0; j < h; j++) {
    for (i = 0; i < w; i++) {
      c = cast(boxes, minX + i + 0.5, minY + j + 0.5);
      for (k = 0; k < n; k++) rows[k].push(c === null ? null : c[k]);
    }
    for (k = 0; k < n; k++) {
      for (i = 0; i < w; i++) pixels.push(rows[k][i]);
      rows[k] = [];
    }
  }

  return { w: w * n, h: h, pixels: pixels, pivotX: -minX, pivotY: -minY };
}

/**
 * How many pictures side by side the mode paints (see mode): three for the
 * faces, NIGHT for the night, one for anything else.
 */
function sections() {
  return mode === "faces"
    ? 3
    : mode === "night"
      ? NIGHT
      : mode === "deferred"
        ? DEFERRED
        : 1;
}

function getMode() {
  return mode;
}

/**
 * A colour as each of the faces' pictures has it (see mode) on a surface
 * looking along normal: for whatever paints over a picture after it is
 * painted - a stripe on a road.
 */
function facesOf(color, normal) {
  var c = shade(color, 2);

  return weights(null, normal, undefined).map(function (k) {
    return [c[0] * k, c[1] * k, c[2] * k];
  });
}

/**
 * One picture per tile of something standing on sizeX by sizeY tiles, each
 * painted from only what stands on that tile - every box clipped to the tile's
 * footprint - so no piece carries a bit of its neighbour: the renderer sorts
 * the pieces tile by tile and they cover each other the way the things on
 * them would. Whatever sticks out past its tile is cut off, so every piece of
 * a building has to be built to stay on its own tile.
 *
 * Every piece's pivot is the middle of its tile, on the ground. A tile with
 * nothing on it gets no piece.
 */
function paintTiles(boxes, sizeX, sizeY) {
  var pieces = [],
    i,
    j;

  //snapped whole before it is cut up, so that the pieces meet as the whole
  boxes = snapAll(boxes);

  for (i = 0; i < sizeX; i++) {
    for (j = 0; j < sizeY; j++) {
      var x0 = i * TILE,
        x1 = x0 + TILE,
        y0 = j * TILE,
        y1 = y0 + TILE,
        clipped = [],
        picture,
        middle;

      boxes.forEach(function (b) {
        var c = clip(b, x0, x1, y0, y1);

        if (c !== null) clipped.push(c);
      });

      if (clipped.length === 0) continue;

      picture = render(clipped);
      middle = project(x0 + TILE / 2, y0 + TILE / 2, 0);

      pieces.push({
        x: i,
        y: j,
        w: picture.w,
        h: picture.h,
        pixels: picture.pixels,
        pivotX: picture.pivotX + middle[0],
        pivotY: picture.pivotY + middle[1],
      });
    }
  }

  return pieces;
}

//rounded to 16 bit colour, 5 bits of red, 6 of green, 5 of blue
function to16(c) {
  return [
    Math.round((Math.round((c[0] * 31) / 255) * 255) / 31),
    Math.round((Math.round((c[1] * 63) / 255) * 255) / 63),
    Math.round((Math.round((c[2] * 31) / 255) * 255) / 31),
  ];
}

/**
 * A painted picture as RGBA pixels, {width, height, data}, in 16 bit colour -
 * its colours, that is: what is not a colour (which way a pixel looks, how
 * high it is, as the mode paints them) is kept as it is.
 */
function toImage(picture) {
  var data = new Uint8ClampedArray(picture.w * picture.h * 4),
    //how wide the pictures side by side in it are, and how many of them,
    //from the first, are colours
    w = picture.w / sections(),
    colours = mode === "night" ? 0 : mode === "deferred" ? 1 : sections(),
    c,
    k;

  for (var i = 0; i < picture.pixels.length; i++) {
    c = picture.pixels[i];
    if (c === null) continue;

    if (Math.floor((i % picture.w) / w) < colours) c = to16(c);
    k = i * 4;
    data[k] = c[0];
    data[k + 1] = c[1];
    data[k + 2] = c[2];
    data[k + 3] = 255;
  }

  return { width: picture.w, height: picture.h, data: data };
}

//the pixels written into a PNG's data at x, y
function blit(png, picture, x, y) {
  var i, j, c, k;

  for (j = 0; j < picture.h; j++) {
    for (i = 0; i < picture.w; i++) {
      c = picture.pixels[j * picture.w + i];
      if (
        c === null ||
        x + i < 0 ||
        y + j < 0 ||
        x + i >= png.width ||
        y + j >= png.height
      )
        continue;

      c = to16(c);
      k = ((y + j) * png.width + x + i) * 4;
      png.data[k] = c[0];
      png.data[k + 1] = c[1];
      png.data[k + 2] = c[2];
      png.data[k + 3] = 255;
    }
  }
}

export {
  TILE,
  TILE_W,
  TILE_H,
  MATERIALS,
  mix,
  lighter,
  darker,
  lit,
  shade,
  box,
  plane,
  cut,
  moved,
  clip,
  seamed,
  opening,
  indoor,
  snap,
  snapAll,
  rotate,
  project,
  measure,
  render,
  setMode,
  getMode,
  setView,
  getView,
  setOpen,
  setWorn,
  setRuin,
  sections,
  heightOf,
  normalOf,
  facesOf,
  paintTiles,
  toImage,
  blit,
};

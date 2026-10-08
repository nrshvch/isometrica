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

  r.group = b.group;
  if (b.cuts)
    r.cuts = b.cuts.map(function (c) {
      return plane(
        c.n[0],
        c.n[1],
        c.n[2],
        c.d + c.n[0] * dx + c.n[1] * dy + c.n[2] * dz,
      );
    });

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

  var r = box(cx0, cx1, cy0, cy1, b.z0, b.z1, b.color, b.finish);

  r.group = b.group;
  r.cuts = b.cuts;

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

    r.group = b.group;
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

    return r;
  });
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

  r.group = b.group;
  r.cuts = b.cuts;

  return r;
}

function snapAll(boxes) {
  return boxes.map(function (b) {
    return snap(b);
  });
}

//where a point in the world lands on the screen, the origin at 0, 0
function project(x, y, z) {
  return [x - y, -(x + y) / 2 - z];
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

  var normal = face >= 3 ? hit.cuts[face - 3].n : null,
    color;

  //which way it looks, for the light to be worked out as it is drawn
  if (mode === "map") return facing(face, normal, hit.finish);

  //how high the point is over the ground the picture stands on, a pixel a
  //unit, for the light of a lamp near it to be worked out as it is drawn;
  //and the whole of it, to lift a storey laid on another (Looks.height)
  if (mode === "height") return [heightOf(z - best), WHITE];

  //at night: what of it shines - a pane lit behind a window - in either of
  //its two ways, with the first of the lights on and with more of them; all
  //of it black, to hide whatever shines behind it; and the light thrown on
  //the ground round it by what shines near
  if (mode === "night") {
    var px = x + best,
      py = y + best,
      pz = z - best,
      glows = shine(hit, face, normal, px, py, pz);

    glows.push(BLACK);

    return glows.concat(spill(boxes, face, normal, px, py, pz, sx, sy));
  }

  //a box lit already is its own colour on every face - with what it is
  //made of over it, if anything
  if (hit.finish !== undefined && hit.finish.lit)
    color =
      hit.finish.material === undefined
        ? hit.color
        : finish(
            hit.color,
            face,
            null,
            hit.finish,
            x + best,
            y + best,
            z - best,
          );
  else {
    //unlit, every face is the colour a top is in the sun - the light it is
    //drawn in takes the walls down from there
    color =
      mode !== "lit"
        ? shade(hit.color, 2)
        : normal === null
          ? shade(hit.color, face)
          : lit(hit.color, normal[0], normal[1], normal[2]);

    if (
      hit.finish !== undefined &&
      hit.finish.shadow &&
      shadowed(boxes, hit, x + best, y + best, z - best)
    )
      color = darker(color, SHADOW);

    //a sign of no material is only a colour that shines at night (shine)
    if (hit.finish !== undefined && !(hit.finish.sign && !hit.finish.material))
      color = finish(
        color,
        face,
        normal,
        hit.finish,
        x + best,
        y + best,
        z - best,
      );
  }

  //of each face's picture, as much of the colour as looks that way - black
  //where none of it does, so it still covers what is behind it
  if (mode === "faces")
    return weights(face, normal, hit.finish).map(function (k) {
      return [color[0] * k, color[1] * k, color[2] * k];
    });

  return color;
}

//how much darker a spot in another box's shadow is
var SHADOW = 0.32;

var BLACK = [0, 0, 0],
  //what of the panes are lit at night - with the first of a building's
  //lights on, and with more of them - and the light behind them: mostly
  //lamps, now and then the blue of a screen
  FIRST_PANES = 0.2,
  MORE_PANES = 0.45,
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

//how far the light of what shines falls round it, and how much light it
//gives there at the most
var SPILL_REACH = 9,
  SPILL = 0.6;

//the dither the steps of that light are broken up with, 4x4 - as the
//client's pools of light are (client/glow)
var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * The light thrown at night on x, y, z - a surface looking up: the ground at
 * the foot of a building, a roof round a billboard - by what shines near it,
 * signs and lamps, and the glass of the ground storey where it is lit: with
 * the first lights on and with more, one way and the other, as shine has
 * them (client/lighting adds it to the light on what looks up). Stepped,
 * and dithered between the steps by where on the screen it is, sx, sy.
 * Black anywhere else.
 *
 * @returns {Array[]} its light in the four ways shine has
 */
function spill(boxes, face, normal, x, y, z, sx, sy) {
  if (face !== 2 && (normal === null || normal[2] < 0.7))
    return [BLACK, BLACK, BLACK, BLACK];

  var from = emitters(boxes),
    sum = [0, 0, 0, 0],
    rgb = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    w,
    i,
    k;

  for (i = 0; i < from.length; i++) {
    var e = from[i].box,
      nx = Math.max(e.x0, Math.min(e.x1, x)),
      ny = Math.max(e.y0, Math.min(e.y1, y)),
      nz = Math.max(e.z0, Math.min(e.z1, z)),
      d = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2 + (nz - z) ** 2);

    //nothing it could not shine down on: no higher than the bottom of a
    //window, than the top of a sign
    if (d >= SPILL_REACH || z > (from[i].color === null ? e.z0 + 1 : e.z1))
      continue;

    w = (1 - d / SPILL_REACH) * (1 - d / SPILL_REACH);

    //a sign or a lamp is lit whichever way; a pane only as it is lit,
    //the one nearest
    var lit = from[i].color,
      on = [true, true, true, true];

    if (lit === null) {
      var pane = paneLit(
        e,
        e.x1 - e.x0 >= e.y1 - e.y0 ? 1 : 0,
        null,
        nx,
        ny,
        nz,
      );

      if (pane === null) continue;
      lit = pane.c;
      on = [
        pane.a < FIRST_PANES,
        pane.a < MORE_PANES,
        pane.b < FIRST_PANES,
        pane.b < MORE_PANES,
      ];
    }

    for (k = 0; k < 4; k++) {
      if (!on[k]) continue;
      sum[k] += w;
      rgb[k][0] += lit[0] * w;
      rgb[k][1] += lit[1] * w;
      rgb[k][2] += lit[2] * w;
    }
  }

  var bayer =
    (BAYER[
      (((Math.floor(sy) % 4) + 4) % 4) * 4 + (((Math.floor(sx) % 4) + 4) % 4)
    ] +
      0.5) /
    16;

  return sum.map(function (all, k) {
    if (all === 0) return BLACK;

    //three steps of it, dithered between
    var level = Math.min(1, all) * 3,
      step = Math.floor(level),
      s = Math.min(3, step + (level - step > bayer ? 1 : 0)) / 3;

    if (s === 0) return BLACK;

    return [
      (rgb[k][0] / all) * s * SPILL,
      (rgb[k][1] / all) * s * SPILL,
      (rgb[k][2] / all) * s * SPILL,
    ];
  });
}

//what of a picture's boxes throws light round it at night, each with its
//light - or null for a pane of glass, lit or not as it is (paneLit) -
//worked out once a picture
var emitting = new WeakMap();

function emitters(boxes) {
  var out = emitting.get(boxes);

  if (out !== undefined) return out;

  out = [];
  boxes.forEach(function (b) {
    var f = b.finish;

    if (f === undefined) return;
    if (f.glow) out.push({ box: b, color: LAMP_LIGHT });
    else if (f.sign) out.push({ box: b, color: lighter(b.color, 0.1) });
    //the glass of a shop window or the ground storey's windows
    else if (f.sheen && b.z0 < (f.base || 0) + (f.storey || 12))
      out.push({ box: b, color: null });
  });
  emitting.set(boxes, out);

  return out;
}

/**
 * What render paints (see setMode): the picture lit by the one sun every
 * picture is painted in ("lit"), its colours with no light on them
 * ("albedo"), which way each pixel of it looks ("map"), the colours of what
 * of it looks towards -x, -y and up, side by side - the three adding up to
 * the albedo ("faces") - for the light to be worked out as it is drawn,
 * wherever the sun is; or, for the night, what of it shines - with the
 * first of its lights on and with more of them, one way and another - the
 * whole of it in black, and the light it throws round it each of those
 * ways, side by side ("night", see NIGHT); or how high every pixel of it is
 * and the whole of it in white ("height", see HEIGHT).
 */
var mode = "lit";

//how many pictures the night is painted in, side by side: what shines one
//way, with the first lights on and with more, the same the other way, all
//of it in black, and the light it throws round it the four ways again
var NIGHT = 9;

//and the height of every pixel of it, painted as two pictures side by side
//(heightOf): how high, and the whole of it in white
var HEIGHT = 2,
  WHITE = [255, 255, 255];

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

/**
 * Whether the sun is kept off that point of box `hit` by another box of the
 * same group that casts a shadow (finish.shadow) - a strut of a lattice
 * falling across the next one. Only a box's own group shades it, so a part
 * comes out the same alone as laid with others (see compose).
 */
function shadowed(boxes, hit, px, py, pz) {
  var e = 0.05,
    ox = px + SUN[0] * e,
    oy = py + SUN[1] * e,
    oz = pz + SUN[2] * e;

  for (var i = 0; i < boxes.length; i++) {
    var b = boxes[i];

    if (
      b === hit ||
      b.group !== hit.group ||
      b.finish === undefined ||
      !b.finish.shadow
    )
      continue;

    var t0 = 0,
      t1 = Infinity,
      lo = [b.x0, b.y0, b.z0],
      hi = [b.x1, b.y1, b.z1],
      o = [ox, oy, oz],
      k;

    for (k = 0; k < 3 && t0 <= t1; k++) {
      if (Math.abs(SUN[k]) < 1e-9) {
        if (o[k] < lo[k] || o[k] > hi[k]) t0 = Infinity;
        continue;
      }

      var a = (lo[k] - o[k]) / SUN[k],
        c = (hi[k] - o[k]) / SUN[k];

      t0 = Math.max(t0, Math.min(a, c));
      t1 = Math.min(t1, Math.max(a, c));
    }

    if (t0 <= t1) return true;
  }

  return false;
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
 * A finish with shadow set has the shadows of the other boxes of its group
 * with shadow set fall on it (see shadowed) - the members of a steel
 * lattice shading each other.
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

  return c;
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
 * The picture of the boxes, with pivotX/pivotY where the world's origin lands
 * in it.
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

  boxes = snapAll(boxes).map(function (b) {
    var r = screenBounds(b);
    minX = Math.min(minX, r.minX);
    maxX = Math.max(maxX, r.maxX);
    minY = Math.min(minY, r.minY);
    maxY = Math.max(maxY, r.maxY);

    return {
      x0: b.x0,
      x1: b.x1,
      y0: b.y0,
      y1: b.y1,
      z0: b.z0,
      z1: b.z1,
      color: b.color,
      finish: b.finish,
      group: b.group,
      cuts: b.cuts,
      sMinX: r.minX,
      sMaxX: r.maxX,
      sMinY: r.minY,
      sMaxY: r.maxY,
    };
  });

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
      : mode === "height"
        ? HEIGHT
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
 * A painted picture as RGBA pixels, {width, height, data}, in 16 bit colour.
 */
function toImage(picture) {
  var data = new Uint8ClampedArray(picture.w * picture.h * 4),
    c,
    k;

  for (var i = 0; i < picture.pixels.length; i++) {
    c = picture.pixels[i];
    if (c === null) continue;

    c = to16(c);
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
  box,
  plane,
  cut,
  moved,
  clip,
  snap,
  snapAll,
  rotate,
  project,
  measure,
  render,
  setMode,
  getMode,
  sections,
  heightOf,
  facesOf,
  paintTiles,
  toImage,
  blit,
};

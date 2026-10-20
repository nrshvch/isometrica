/**
 * What the icon kit (kit.js) draws its icons with: shapes on the 24 by 24
 * grid the icons are made on, or things standing in the world, seen the way
 * the game sees them (iso) and fitted to the grid - and all of it written
 * out as one SVG path of one colour.
 *
 * One colour, so depth is told by gaps: every face is drawn a little in
 * from its edges (GAP between two faces that meet), and whatever stands in
 * front of a face cuts a gap round itself out of it - so a box reads as
 * three faces, a chimney as standing on its roof. A detail on a face - a
 * window, a pip, a road's markings - is a hole in it.
 *
 * What is drawn is solid where the path winds round once (nonzero): faces
 * and shapes go round clockwise, holes the other way.
 */

//the grid, and the margin round what is drawn on it
export var SIZE = 24;

var PAD = 2,
  //between two faces that meet, and round what stands in front, in pixels
  //of the grid
  GAP = 1.05;

/* --- polygons ---------------------------------------------------------- */

//twice the area, positive going round clockwise (y down)
function area(p) {
  var a = 0;

  for (var i = 0; i < p.length; i++) {
    var j = (i + 1) % p.length;

    a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
  }

  return a;
}

function clockwise(p) {
  return area(p) >= 0 ? p : p.slice().reverse();
}

function anticlockwise(p) {
  return area(p) >= 0 ? p.slice().reverse() : p;
}

//where two lines, a point and a direction each, cross - null if they run
//side by side
function cross(a, da, b, db) {
  var det = da[0] * db[1] - da[1] * db[0];

  if (Math.abs(det) < 1e-9) return null;

  var t = ((b[0] - a[0]) * db[1] - (b[1] - a[1]) * db[0]) / det;

  return [a[0] + da[0] * t, a[1] + da[1] * t];
}

/**
 * A convex polygon, its edges moved in by d - out, for d below 0.
 */
function offset(p, d) {
  var q = clockwise(p),
    n = q.length,
    lines = [],
    out = [];

  for (var i = 0; i < n; i++) {
    var a = q[i],
      b = q[(i + 1) % n],
      dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy);

    if (len < 1e-9) continue;

    //inwards, going round clockwise with y down, is to the right
    lines.push({
      at: [a[0] - (dy / len) * d, a[1] + (dx / len) * d],
      dir: [dx, dy],
    });
  }

  for (var k = 0; k < lines.length; k++) {
    var prev = lines[(k + lines.length - 1) % lines.length],
      x = cross(prev.at, prev.dir, lines[k].at, lines[k].dir);

    if (x !== null) out.push(x);
  }

  return out;
}

/**
 * What of a polygon is within a convex one (Sutherland-Hodgman).
 */
function clip(subject, convex) {
  var c = clockwise(convex),
    out = subject;

  for (var i = 0; i < c.length && out.length; i++) {
    var a = c[i],
      b = c[(i + 1) % c.length],
      input = out;

    out = [];

    for (var j = 0; j < input.length; j++) {
      var p = input[j],
        q = input[(j + 1) % input.length],
        pin = side(a, b, p) >= 0,
        qin = side(a, b, q) >= 0;

      if (pin) out.push(p);
      if (pin !== qin) {
        var x = cross(p, [q[0] - p[0], q[1] - p[1]], a, [
          b[0] - a[0],
          b[1] - a[1],
        ]);

        if (x !== null) out.push(x);
      }
    }
  }

  return out;
}

/**
 * What of a convex polygon is outside another, as convex pieces that do not
 * overlap: for each edge of the other in turn, what is beyond it, of what
 * is not beyond any edge before it.
 */
function subtract(a, b) {
  var c = clockwise(b),
    pieces = [],
    rest = a;

  if (clip(a, b).length < 3) return [a];

  for (var i = 0; i < c.length && rest.length > 2; i++) {
    var p = c[i],
      q = c[(i + 1) % c.length],
      beyond = half(rest, q, p),
      within = half(rest, p, q);

    if (beyond.length > 2 && Math.abs(area(beyond)) > 1e-4) pieces.push(beyond);
    rest = within;
  }

  return pieces;
}

//what of a polygon is to the right of the line from a to b
function half(points, a, b) {
  var out = [];

  for (var j = 0; j < points.length; j++) {
    var p = points[j],
      q = points[(j + 1) % points.length],
      pin = side(a, b, p) >= 0,
      qin = side(a, b, q) >= 0;

    if (pin) out.push(p);
    if (pin !== qin)
      out.push(
        cross(p, [q[0] - p[0], q[1] - p[1]], a, [b[0] - a[0], b[1] - a[1]]),
      );
  }

  return out.filter(Boolean);
}

function side(a, b, p) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

//the smallest convex polygon round the points
function hull(points) {
  var p = points.slice().sort(function (a, b) {
      return a[0] - b[0] || a[1] - b[1];
    }),
    lower = [],
    upper = [];

  function turn(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }

  p.forEach(function (q) {
    while (
      lower.length >= 2 &&
      turn(lower[lower.length - 2], lower[lower.length - 1], q) <= 0
    )
      lower.pop();
    lower.push(q);
  });
  for (var i = p.length - 1; i >= 0; i--) {
    while (
      upper.length >= 2 &&
      turn(upper[upper.length - 2], upper[upper.length - 1], p[i]) <= 0
    )
      upper.pop();
    upper.push(p[i]);
  }

  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/* --- shapes ------------------------------------------------------------ */

//points round an ellipse - a circle when ry is not given - from a0 to a1,
//radians, clockwise from three o'clock
export function arc(cx, cy, rx, ry, a0, a1, n) {
  var out = [];

  if (ry === undefined) ry = rx;
  if (a0 === undefined) {
    a0 = 0;
    a1 = Math.PI * 2;
  }
  n = n || Math.max(8, Math.round((Math.abs(a1 - a0) / (Math.PI * 2)) * 64));

  var whole = Math.abs(Math.abs(a1 - a0) - Math.PI * 2) < 1e-9;

  for (var i = 0; i < (whole ? n : n + 1); i++) {
    var t = a0 + ((a1 - a0) * i) / n;

    out.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }

  return out;
}

export function rect(x, y, w, h) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/**
 * A line of width w along the points, its corners mitred - square ends
 * reaching w/2 past the ends ("square"), or flat at them ("butt").
 */
export function stroke(points, w, cap) {
  var half = w / 2,
    n = points.length,
    dirs = [],
    left = [],
    right = [];

  for (var i = 0; i < n - 1; i++) {
    var dx = points[i + 1][0] - points[i][0],
      dy = points[i + 1][1] - points[i][1],
      len = Math.hypot(dx, dy);

    dirs.push([dx / len, dy / len]);
  }

  function along(i, s) {
    var d = dirs[i];

    return [-d[1] * s, d[0] * s];
  }

  [1, -1].forEach(function (s) {
    var out = s === 1 ? left : right;

    for (var i = 0; i < n; i++) {
      var p = points[i];

      if (i === 0 || i === n - 1) {
        var d = dirs[i === 0 ? 0 : n - 2],
          o = along(i === 0 ? 0 : n - 2, half * s),
          ext = cap === "square" ? (i === 0 ? -half : half) : 0;

        out.push([p[0] + o[0] + d[0] * ext, p[1] + o[1] + d[1] * ext]);
        continue;
      }

      var o1 = along(i - 1, half * s),
        o2 = along(i, half * s),
        x = cross(
          [p[0] + o1[0], p[1] + o1[1]],
          dirs[i - 1],
          [p[0] + o2[0], p[1] + o2[1]],
          dirs[i],
        );

      //a corner too sharp to mitre is cut off square
      if (x === null || Math.hypot(x[0] - p[0], x[1] - p[1]) > half * 3) {
        out.push([p[0] + o1[0], p[1] + o1[1]], [p[0] + o2[0], p[1] + o2[1]]);
      } else out.push(x);
    }
  });

  return left.concat(right.reverse());
}

/**
 * The world seen the way the game sees it: +x up and to the right, +y up
 * and to the left, two across for one up, z straight up.
 */
export function iso(x, y, z) {
  return [x - y, -(x + y) / 2 - (z || 0)];
}

/* --- drawing ----------------------------------------------------------- */

/**
 * An icon being drawn: faces, shapes and holes in them, in the order they
 * stand from the back - and written out (path) fitted to the grid, or on
 * it as drawn.
 *
 * @param [fit] {boolean} drawn in its own units (the world's, say), to be
 *        fitted to the grid's margin; or else on the grid as it is
 */
export function Drawing(fit) {
  this.fit = fit === true;
  this.items = [];
}

/**
 * A face: a convex polygon drawn GAP/2 in from its edges, so that two that
 * meet stand apart, and that what stands in front of it cuts round itself.
 * Returns it, for holes to be made in it - and, set on it, the convex
 * opening it is seen through only, if it is (within).
 */
Drawing.prototype.face = function (points) {
  var face = { kind: "face", points: points, holes: [] };

  this.items.push(face);

  return face;
};

/**
 * A shape drawn as it is - a line, an arrow: not drawn in from its edges,
 * nor cut by what stands in front of it.
 */
Drawing.prototype.shape = function (points) {
  this.items.push({ kind: "shape", points: points });

  return this;
};

/**
 * A hole in a face - a window, a pip, a road's marking - kept within it.
 */
Drawing.prototype.hole = function (face, points) {
  face.holes.push(points);

  return this;
};

/**
 * What is drawn next stands in front of what is drawn so far, as tall and
 * wide as the points: the faces behind are cut GAP round it.
 */
Drawing.prototype.front = function (points) {
  this.items.push({ kind: "front", points: points });

  return this;
};

/**
 * A box in the world, its three faces the game sees - its top, and its
 * sides towards -x and -y - each a face, standing in front of what is
 * drawn before it. Returns its faces, for holes to be made in them, and
 * how to find a point on each (on), for where they go.
 */
Drawing.prototype.box = function (x0, x1, y0, y1, z0, z1, only) {
  var corners = [],
    self = this,
    out = {};

  [x0, x1].forEach(function (x) {
    [y0, y1].forEach(function (y) {
      [z0, z1].forEach(function (z) {
        corners.push(iso(x, y, z));
      });
    });
  });

  this.front(corners);

  var faces = {
    top: [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ],
    left: [
      [x0, y0, z0],
      [x0, y1, z0],
      [x0, y1, z1],
      [x0, y0, z1],
    ],
    right: [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
    ],
  };

  Object.keys(faces).forEach(function (k) {
    if (only && only.indexOf(k) === -1) return;

    out[k] = self.face(
      faces[k].map(function (p) {
        return iso(p[0], p[1], p[2]);
      }),
    );
  });

  return out;
};

//the path's numbers, as short as they go
function n(v) {
  return String(Math.round(v * 100) / 100);
}

function ring(points) {
  return (
    "M" +
    points
      .map(function (p) {
        return n(p[0]) + " " + n(p[1]);
      })
      .join("L") +
    "Z"
  );
}

/**
 * The drawing as one SVG path on the grid.
 */
Drawing.prototype.path = function () {
  var place = function (p) {
    return p;
  };

  if (this.fit) {
    var all = [];

    this.items.forEach(function (it) {
      if (it.kind !== "front") all = all.concat(it.points);
    });

    var xs = all.map(function (p) {
        return p[0];
      }),
      ys = all.map(function (p) {
        return p[1];
      }),
      minX = Math.min.apply(null, xs),
      maxX = Math.max.apply(null, xs),
      minY = Math.min.apply(null, ys),
      maxY = Math.max.apply(null, ys),
      live = SIZE - PAD * 2,
      s = Math.min(live / (maxX - minX), live / (maxY - minY)),
      cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2;

    place = function (p) {
      return [SIZE / 2 + (p[0] - cx) * s, SIZE / 2 + (p[1] - cy) * s];
    };
  }

  var faces = [],
    d = "";

  function placed(points) {
    return points.map(place);
  }

  //a face is kept as the convex pieces of it nothing in front has cut away,
  //and the details cut out of it
  this.items.forEach(function (it) {
    if (it.kind === "face") {
      //seen only through an opening, as much of it as that shows (within)
      var base = it.within
          ? clip(placed(it.points), placed(it.within))
          : placed(it.points),
        drawn = base.length > 2 ? offset(base, GAP / 2) : [];

      faces.push({
        pieces: drawn.length > 2 && area(clockwise(drawn)) > 0 ? [drawn] : [],
        holes: it.holes.map(placed),
      });
    } else if (it.kind === "shape")
      faces.push({ shape: placed(it.points), hole: it.hole === true });
    else {
      var round = offset(hull(placed(it.points)), -GAP);

      faces.forEach(function (f) {
        if (!f.pieces) return;

        f.pieces = [].concat.apply(
          [],
          f.pieces.map(function (piece) {
            return subtract(piece, round);
          }),
        );
      });
    }
  });

  faces.forEach(function (f) {
    if (f.shape) {
      d += ring(f.hole ? anticlockwise(f.shape) : clockwise(f.shape));
      return;
    }

    f.pieces.forEach(function (piece) {
      d += ring(clockwise(piece));
    });
    //each detail as much of it as is on what is left of the face
    f.holes.forEach(function (h) {
      f.pieces.forEach(function (piece) {
        var kept = clip(h, piece);

        if (kept.length > 2 && Math.abs(area(kept)) > 1e-3)
          d += ring(anticlockwise(kept));
      });
    });
  });

  return d;
};

/**
 * Holes in a shape drawn as it is, for a drawing on the grid as it is: the
 * points, wound the other way.
 */
Drawing.prototype.cutout = function (points) {
  this.items.push({ kind: "shape", points: anticlockwise(points) });
  this.items[this.items.length - 1].hole = true;

  return this;
};

export { clockwise, anticlockwise, offset };

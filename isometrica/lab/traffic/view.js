/**
 * The traffic testbed, drawn (Traffic.jsx): the roads of its world from
 * above, where things went wrong, the tiles picked, the cars - and the one
 * followed, with its way ahead and what it keeps its distance from - and
 * what is under the pointer.
 */

//the colours of the kinds of vehicle, and of why one is standing
var COLOURS = {
    car: "#d8d8d8",
    small: "#9fd3ff",
    van: "#f0e08a",
    lorry: "#e8a868",
    truck: "#e07a5a",
    bus: "#7ad07a",
  },
  ARROW = ["<", "^", ">", "v"];

export var HELD = { queue: "#e0a040", junction: "#e05040", merge: "#b070e0" };

//what is drawn, set for each frame by draw
var canvas = null,
  g = null,
  view = null,
  bed = null,
  picks = [],
  followed = null;

//a world's roads as a map drawn as text (scenarios.js)
export function toText(world) {
  var b = world.box,
    rows = [];

  for (var y = b[1]; y <= b[3]; y++) {
    var row = "";

    for (var x = b[0]; x <= b[2]; x++) {
      var r = world.map.get(world.tileAt(x, y));

      row += !r
        ? " "
        : r.stop
          ? "S"
          : r.way >= 0
            ? ARROW[r.way]
            : r.material === "cobble"
              ? "c"
              : r.material === "gravel"
                ? "g"
                : "#";
    }

    rows.push(row.replace(/\s+$/, ""));
  }

  return rows.join("\n");
}

//the whole world in sight of the canvas
export function fit(view, world, canvas) {
  var b = world.box,
    w = canvas.clientWidth,
    h = canvas.clientHeight;

  view.x = (b[0] + b[2]) / 2;
  view.y = (b[1] + b[3]) / 2;
  view.s = Math.max(
    4,
    Math.min(64, Math.min(w / (b[2] - b[0] + 3), h / (b[3] - b[1] + 3))),
  );
}

function sx(x) {
  return (x - view.x) * view.s + canvas.width / 2;
}

function sy(y) {
  return (y - view.y) * view.s + canvas.height / 2;
}

/**
 * The bed (or nothing yet) onto the canvas, as the view has it: { x, y, s }
 * the tile in the middle and how many pixels a tile is.
 */
export function draw(into, look, it) {
  canvas = into;
  g = canvas.getContext("2d");
  view = look;
  bed = it.bed;
  picks = it.picks;
  followed = it.followed;

  var w = canvas.clientWidth,
    h = canvas.clientHeight;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  g.fillStyle = "#16181a";
  g.fillRect(0, 0, w, h);

  if (!bed) return;

  roads();
  marks();
  picked();
  cars();
}

function roads() {
  var s = view.s,
    world = bed.world,
    traffic = bed.traffic;

  world.map.forEach(function (r, tile) {
    var x = sx(r.x - 0.5),
      y = sy(r.y - 0.5);

    if (x > canvas.width || y > canvas.height || x < -s || y < -s) return;

    var junction = traffic.isJunction(tile) && world.joins(tile) >= 3;

    g.fillStyle = junction ? "#3d4046" : "#33363b";
    g.fillRect(x, y, s - 1, s - 1);

    if (r.stop) {
      g.fillStyle = "#2f6f6f";
      g.fillRect(x + s * 0.8, y, s * 0.2 - 1, s - 1);
    }

    //the middle line, or the way it goes
    if (r.way >= 0 && s >= 10) {
      g.fillStyle = "#6c7178";
      g.font = Math.round(s * 0.55) + "px monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(ARROW[r.way], x + s / 2, y + s / 2);
    }
  });
}

//where things went wrong: turning round mid-road, on top of each other
function marks() {
  var s = view.s,
    c = bed.counts;

  g.strokeStyle = "#ff5a3a";
  g.lineWidth = 2;
  c.badTurns.slice(-20).forEach(function (b) {
    var x = sx(b.x),
      y = sy(b.y);

    g.beginPath();
    g.moveTo(x - s * 0.3, y - s * 0.3);
    g.lineTo(x + s * 0.3, y + s * 0.3);
    g.moveTo(x + s * 0.3, y - s * 0.3);
    g.lineTo(x - s * 0.3, y + s * 0.3);
    g.stroke();
  });

  g.strokeStyle = "#ffd23a";
  c.overlaps.slice(-20).forEach(function (o) {
    g.beginPath();
    g.arc(sx(o.x), sy(o.y), s * 0.35, 0, Math.PI * 2);
    g.stroke();
  });
}

function picked() {
  var s = view.s;

  picks.forEach(function (t, i) {
    var xy = bed.world.xy(t);

    g.strokeStyle = i === 0 ? "#7fc4c4" : "#d0d070";
    g.lineWidth = 2;
    g.strokeRect(sx(xy[0] - 0.5) + 1, sy(xy[1] - 0.5) + 1, s - 3, s - 3);
    g.fillStyle = g.strokeStyle;
    g.font = Math.round(Math.max(9, s * 0.4)) + "px monospace";
    g.fillText(i === 0 ? "A" : String(i), sx(xy[0]), sy(xy[1]));
  });
}

function cars() {
  var s = view.s;

  bed.cars.forEach(function (car) {
    var d = car.driver;

    if (d.wps.length === 0) return;

    g.save();
    g.translate(sx(d.x), sy(d.y));
    g.rotate(Math.atan2(d.hy, d.hx));
    g.fillStyle = d.parked ? "#777" : COLOURS[car.type] || "#ccc";
    g.fillRect(
      (-d.length / 2) * s,
      (-d.width / 2) * s,
      d.length * s,
      d.width * s,
    );

    //why it stands
    var held = d.v < 0.05 && HELD[d.held];

    if (held) {
      g.strokeStyle = held;
      g.lineWidth = 2;
      g.strokeRect(
        (-d.length / 2) * s,
        (-d.width / 2) * s,
        d.length * s,
        d.width * s,
      );
    }

    //its front
    g.fillStyle = "#222";
    g.fillRect(
      (d.length / 2 - 0.06) * s,
      (-d.width / 2) * s,
      0.06 * s,
      d.width * s,
    );
    g.restore();
  });

  if (followed && bed.cars.indexOf(followed) !== -1) {
    var d = followed.driver;

    //its way ahead
    g.strokeStyle = "rgba(127,196,196,0.8)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(sx(d.x), sy(d.y));
    for (var i = d.target; i < d.wps.length && i < d.target + 60; i++)
      g.lineTo(sx(d.wps[i].x), sy(d.wps[i].y));
    g.stroke();

    //what it keeps its distance from
    if (d.leader) {
      g.strokeStyle = "#e0a040";
      g.setLineDash([4, 3]);
      g.beginPath();
      g.moveTo(sx(d.x), sy(d.y));
      g.lineTo(sx(d.leader.x), sy(d.leader.y));
      g.stroke();
      g.setLineDash([]);
    }

    g.strokeStyle = "#fff";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(sx(d.x), sy(d.y), Math.max(6, d.length * s * 0.8), 0, Math.PI * 2);
    g.stroke();
  }
}

//the tile under the pointer, and where on it
export function tileUnder(canvas, view, bed, e) {
  var r = canvas.getBoundingClientRect(),
    x = (e.clientX - r.left - canvas.width / 2) / view.s + view.x,
    y = (e.clientY - r.top - canvas.height / 2) / view.s + view.y;

  return { x: x, y: y, tile: bed.world.tileAt(Math.round(x), Math.round(y)) };
}

//the car nearest what is under the pointer, if one is near enough
export function carUnder(bed, at) {
  var best = null,
    most = 0.5;

  bed.cars.forEach(function (c) {
    var dd = Math.hypot(c.driver.x - at.x, c.driver.y - at.y);

    if (dd < most) {
      most = dd;
      best = c;
    }
  });

  return best;
}

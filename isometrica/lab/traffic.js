/**
 * The traffic testbed's page (lab/trafficbed): the game's own traffic on a
 * few roads, seen from above, going. Pick a scenario, or draw roads of your
 * own; put cars on where you like, of the kind you like, going where you
 * like; follow one to see what it is doing and why; and see what has gone
 * wrong so far - turning round mid-road, standing too long, locking up,
 * driving into each other. "check" runs the scenario through as the
 * headless runner does (tools/traffictest.mjs).
 */
import { TYPES } from "./trafficbed/bed.js";
import { SCENARIOS, start, check } from "./trafficbed/scenarios.js";

var FRAME = 33,
  //the colours of the kinds of vehicle, and of why one is standing
  COLOURS = {
    car: "#d8d8d8",
    small: "#9fd3ff",
    van: "#f0e08a",
    lorry: "#e8a868",
    truck: "#e07a5a",
    bus: "#7ad07a",
  },
  HELD = { queue: "#e0a040", junction: "#e05040", merge: "#b070e0" },
  ARROW = ["<", "^", ">", "v"];

var canvas = el("canvas"),
  g = canvas.getContext("2d"),
  scenario = null,
  bed = null,
  playing = true,
  picks = [],
  followed = null,
  custom = null,
  view = { x: 0, y: 0, s: 24 },
  last = 0,
  owed = 0,
  checked = null;

function el(id) {
  return document.getElementById(id);
}

/* --- setting up -------------------------------------------------------- */

SCENARIOS.forEach(function (s, i) {
  var o = document.createElement("option");

  o.value = i;
  o.textContent = s.name;
  el("scenario").appendChild(o);
});

var mine = document.createElement("option");

mine.value = "custom";
mine.textContent = "your roads";
el("scenario").appendChild(mine);

Object.keys(TYPES).forEach(function (t) {
  var o = document.createElement("option");

  o.value = t;
  o.textContent = t;
  el("type").appendChild(o);
});

//a world's roads as a map drawn as text (scenarios.js)
function toText(world) {
  var b = world.box,
    rows = [];

  for (var y = b[1]; y <= b[3]; y++) {
    var row = "";

    for (var x = b[0]; x <= b[2]; x++) {
      var r = world.map.get(world.tileAt(x, y));

      row += !r ? " " : r.stop ? "S" : r.way >= 0 ? ARROW[r.way] : "#";
    }

    rows.push(row.replace(/\s+$/, ""));
  }

  return rows.join("\n");
}

function reset() {
  var pick = el("scenario").value,
    seed = +el("seed").value || 1;

  if (pick === "custom") {
    scenario = custom || {
      name: "your roads",
      about: "Roads of your own (below), and the cars you put on them.",
      map: el("map").value.split("\n"),
      setup: function () {},
      seconds: 120,
    };
  } else scenario = SCENARIOS[+pick];

  bed = start(scenario, seed);
  followed = null;
  picks = [];
  checked = null;
  el("about").textContent = scenario.about;
  el("map").value = toText(bed.world);
  fit();
  showPicks();
}

//the whole world in sight
function fit() {
  var b = bed.world.box,
    w = canvas.clientWidth,
    h = canvas.clientHeight;

  view.x = (b[0] + b[2]) / 2;
  view.y = (b[1] + b[3]) / 2;
  view.s = Math.max(
    4,
    Math.min(64, Math.min(w / (b[2] - b[0] + 3), h / (b[3] - b[1] + 3))),
  );
}

/* --- going ------------------------------------------------------------- */

function frame(now) {
  var dt = last ? Math.min(250, now - last) : 0;

  last = now;

  if (playing && bed) {
    owed += dt * +el("speed").value;

    for (var n = 0; owed >= FRAME && n < 40; n++) {
      owed -= FRAME;
      tick();
    }

    if (owed > FRAME * 40) owed = 0;
  }

  draw();
  requestAnimationFrame(frame);
}

function tick() {
  bed.step(FRAME);
  if (scenario.later) scenario.later(bed);
}

/* --- drawing ----------------------------------------------------------- */

function sx(x) {
  return (x - view.x) * view.s + canvas.width / 2;
}

function sy(y) {
  return (y - view.y) * view.s + canvas.height / 2;
}

function draw() {
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

/* --- what is going on -------------------------------------------------- */

function line(text, cls) {
  return "<div" + (cls ? ' class="' + cls + '"' : "") + ">" + text + "</div>";
}

function showReport() {
  if (!bed) return;

  var r = bed.report(),
    u = r.uturns,
    out =
      line(
        r.seconds +
          " s, " +
          r.cars +
          " on the roads, " +
          r.arrived +
          " got where they were going",
      ) +
      line(
        "turned round: " +
          u.junction +
          " at junctions, " +
          u.deadEnd +
          " at dead ends, " +
          u.road +
          " mid-road",
        u.road ? "bad" : "",
      ) +
      line(
        "longest stood in the traffic: " +
          r.mostStood +
          " s" +
          (r.mostStoodBy
            ? " (#" + r.mostStoodBy.id + " " + r.mostStoodBy.type + ")"
            : ""),
        r.mostStood > 25 ? "bad" : "",
      ) +
      line("locked: " + r.locks.length, r.locks.length ? "bad" : "") +
      line(
        "on top of each other: " + r.overlaps.length,
        r.overlaps.length ? "bad" : "",
      ) +
      line(
        "no way to where it was going: " + r.noRoute.length,
        r.noRoute.length ? "bad" : "",
      );

  if (checked)
    out += line(
      "check (" +
        scenario.seconds +
        " s, seed " +
        el("seed").value +
        "): " +
        (checked.ok ? "holds" : checked.failed.join("; ")),
      checked.ok ? "good" : "bad",
    );

  el("report").innerHTML = out;
  el("log").textContent = bed.log.slice(-60).reverse().join("\n");

  var c = followed;

  if (!c || bed.cars.indexOf(c) === -1) {
    el("car").innerHTML = "<p>none followed</p>";
    return;
  }

  var d = c.driver,
    tiles = [];

  for (var i = d.target; i < d.wps.length && tiles.length < 6; i++)
    if (tiles[tiles.length - 1] !== d.wps[i].tile) tiles.push(d.wps[i].tile);

  el("car").innerHTML =
    line("#" + c.id + " " + c.type + (c.bus ? " (bus)" : "")) +
    line(
      "at " +
        d.x.toFixed(2) +
        ", " +
        d.y.toFixed(2) +
        ", going " +
        d.v.toFixed(2) +
        " of " +
        d.v0.toFixed(2) +
        " tiles/s",
    ) +
    line(
      "held: " +
        (d.held || "-") +
        (d.leader ? ", behind #" + d.leader.id : "") +
        (c.stood > 0 ? ", " + (c.stood / 1000).toFixed(1) + " s" : ""),
      c.stood > 10000 ? "bad" : "",
    ) +
    line(
      (d.parked
        ? "parked"
        : d.standing()
          ? "standing at the end of its way"
          : "") +
        (d.overtaking ? " going round #" + d.overtaking.id : "") +
        (d.merging
          ? " changing lanes" + (d.merging.waiting ? ", waiting for room" : "")
          : ""),
    ) +
    line(
      "next: " +
        tiles
          .map(function (t) {
            return bed.world.xy(t).join(",");
          })
          .join(" → "),
    );
}

setInterval(showReport, 250);

/* --- picking and putting on -------------------------------------------- */

function showPicks() {
  el("picks").textContent = picks.length
    ? "from " +
      bed.world.xy(picks[0]).join(",") +
      (picks.length > 1
        ? " to " +
          picks
            .slice(1)
            .map(function (t) {
              return bed.world.xy(t).join(",");
            })
            .join(", then ")
        : " - now where to")
    : "nothing picked";
}

function tileUnder(e) {
  var r = canvas.getBoundingClientRect(),
    x = (e.clientX - r.left - canvas.width / 2) / view.s + view.x,
    y = (e.clientY - r.top - canvas.height / 2) / view.s + view.y;

  return { x: x, y: y, tile: bed.world.tileAt(Math.round(x), Math.round(y)) };
}

function carUnder(at) {
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

var dragging = null;

canvas.addEventListener("mousedown", function (e) {
  dragging = {
    x: e.clientX,
    y: e.clientY,
    vx: view.x,
    vy: view.y,
    moved: false,
  };
});

window.addEventListener("mousemove", function (e) {
  if (!dragging) return;

  var dx = e.clientX - dragging.x,
    dy = e.clientY - dragging.y;

  if (Math.abs(dx) + Math.abs(dy) > 4) dragging.moved = true;
  if (dragging.moved) {
    view.x = dragging.vx - dx / view.s;
    view.y = dragging.vy - dy / view.s;
  }
});

window.addEventListener("mouseup", function (e) {
  var was = dragging;

  dragging = null;
  if (!was || was.moved || !bed || e.target !== canvas) return;

  var at = tileUnder(e),
    car = carUnder(at);

  if (car && !e.shiftKey) {
    followed = car;
    return;
  }

  if (bed.world.roadman.getRoad(at.tile) === null) return;

  if (picks.length === 0) picks = [at.tile];
  else if (e.shiftKey || picks.length === 1) picks.push(at.tile);
  else picks = [picks[0], at.tile];

  showPicks();
});

canvas.addEventListener(
  "wheel",
  function (e) {
    e.preventDefault();

    var r = canvas.getBoundingClientRect(),
      mx = e.clientX - r.left - canvas.width / 2,
      my = e.clientY - r.top - canvas.height / 2,
      before = view.s;

    view.s = Math.max(
      4,
      Math.min(96, view.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)),
    );
    view.x += mx / before - mx / view.s;
    view.y += my / before - my / view.s;
  },
  { passive: false },
);

el("add").onclick = function () {
  if (picks.length === 0) return;

  var then = el("then").value,
    spec = { type: el("type").value, at: picks[0] };

  if (then === "bus") {
    spec.bus = true;
    spec.to = picks.length > 1 ? picks.slice(1) : [picks[0]];
  } else if (then !== "wander") {
    if (picks.length < 2) return;
    spec.to = picks.slice(1);
    spec.then = then;
  }

  var car = bed.add(spec);

  if (car) followed = car;
  else bed.note("no room there, or no way from there");
};

el("add10").onclick = function () {
  for (var i = 0, n = 0; i < 100 && n < 10; i++)
    if (bed.add({ type: el("type").value, at: bed.anyTile() })) n++;
};

el("clear").onclick = function () {
  picks = [];
  showPicks();
};

/* --- the controls ------------------------------------------------------ */

el("scenario").onchange = reset;
el("reset").onclick = reset;

el("play").onclick = function () {
  playing = !playing;
  this.textContent = playing ? "pause" : "play";
  this.className = playing ? "" : "on";
};

el("step").onclick = function () {
  if (bed) tick();
};

el("check").onclick = function () {
  var b = this;

  b.textContent = "checking...";
  setTimeout(function () {
    checked = check(scenario, +el("seed").value || 1);
    b.textContent = "check";
  }, 20);
};

el("apply").onclick = function () {
  custom = {
    name: "your roads",
    about: "Roads of your own, and the cars you put on them.",
    map: el("map").value.split("\n"),
    setup: function () {},
    seconds: 120,
  };
  el("scenario").value = "custom";
  reset();
};

//a scenario named in the address: traffic.html#city
var named = SCENARIOS.findIndex(function (s) {
  return s.name === decodeURIComponent(location.hash.slice(1));
});

if (named !== -1) el("scenario").value = named;

//for the console: trafficbed.bed.add({...}), trafficbed.bed.report()
window.trafficbed = {
  get bed() {
    return bed;
  },
  view: view,
};

reset();
requestAnimationFrame(frame);

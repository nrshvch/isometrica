/**
 * The woods map: the world's trees from straight above, a few pixels a
 * tile, the way core/ambient grows them - which kind on every tile
 * (core/woods treeAt), or which wood every tile is in (woodAt), on the ground
 * of core/terrain: the sea, the shore, and the land lighter the higher it is.
 *
 * As in the game, nothing grows on the shore or in the water. What the map
 * leaves out is the stones the world strews about, which keep a tree off
 * the odd tile in the game, and whatever a city built.
 */
import Terrain from "../src/core/terrain.js";
import Woods from "../src/core/woods.js";
import Trees from "../src/data/trees.js";

//the kinds, each as it shows on the map
var KIND_COLOURS = {
  oak: [150, 90, 20],
  beech: [230, 150, 40],
  ash: [240, 220, 90],
  alder: [130, 50, 170],
  birch: [255, 255, 255],
  pine: [220, 60, 50],
  spruce: [10, 70, 36],
};

//the woods, in the order core/woods has them
var WOOD_COLOURS = [
  [150, 190, 110],
  [20, 70, 40],
  [200, 90, 80],
  [220, 170, 60],
  [130, 70, 170],
];

var SEA = [52, 92, 150],
  SHORE = [200, 184, 130];

//round about the city a new player starts on (data/initialcity)
var HOME = [22110, 22110];

var terrain = new Terrain(null),
  canvas = document.getElementById("map"),
  kindOf = {},
  view = "trees",
  centre = HOME.slice(),
  scale = 2,
  //what was drawn, for what is under the pointer
  drawn = null;

Trees.TREES.forEach(function (tree) {
  kindOf[tree.code] = tree.kind;
});

function rgb(c) {
  return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
}

//the land, lighter the higher it is
function ground(low) {
  var l = Math.min(low, 10) / 10;

  return [92 + 50 * l, 118 + 50 * l, 70 + 40 * l];
}

function draw() {
  var started = performance.now(),
    cw = (canvas.width = Math.floor(canvas.clientWidth / scale)),
    ch = (canvas.height = Math.floor(canvas.clientHeight / scale)),
    x0 = Math.round(centre[0] - cw / 2),
    y0 = Math.round(centre[1] - ch / 2),
    g = canvas.getContext("2d"),
    img = g.createImageData(cw, ch),
    //every grid point's height, once
    heights = new Int16Array((cw + 1) * (ch + 1)),
    count = {},
    trees = 0,
    land = 0,
    x,
    y,
    i;

  for (y = 0; y <= ch; y++)
    for (x = 0; x <= cw; x++)
      heights[y * (cw + 1) + x] = terrain.getGridPointHeight(x0 + x, y0 + y);

  drawn = { x0: x0, y0: y0, w: cw, h: ch, heights: heights };

  for (y = 0; y < ch; y++)
    for (x = 0; x < cw; x++) {
      var at = y * (cw + 1) + x,
        a = heights[at],
        b = heights[at + 1],
        c = heights[at + cw + 1],
        d = heights[at + cw + 2],
        low = Math.min(a, b, c, d),
        colour;

      if (Math.max(a, b, c, d) <= 0) colour = SEA;
      else if (low <= 0) colour = SHORE;
      else {
        land++;

        if (view === "woods")
          colour = WOOD_COLOURS[Woods.woodAt(x0 + x, y0 + y, low)];
        else {
          var code = Woods.treeAt(x0 + x, y0 + y, low);

          if (code === null) colour = ground(low);
          else {
            trees++;
            count[kindOf[code]] = (count[kindOf[code]] || 0) + 1;
            colour = KIND_COLOURS[kindOf[code]];
          }
        }
      }

      i = (y * cw + x) * 4;
      img.data[i] = colour[0];
      img.data[i + 1] = colour[1];
      img.data[i + 2] = colour[2];
      img.data[i + 3] = 255;
    }

  g.putImageData(img, 0, 0);

  document.getElementById("x").value = centre[0];
  document.getElementById("y").value = centre[1];
  legend(count, trees, land);
  status(
    cw +
      " by " +
      ch +
      " tiles in " +
      Math.round(performance.now() - started) +
      " ms" +
      (view === "trees" && land > 0
        ? ", trees on " + Math.round((100 * trees) / land) + "% of the land"
        : ""),
  );
}

function legend(count, trees, land) {
  var el = document.getElementById("legend");

  el.innerHTML = "";

  function item(colour, name, note) {
    var span = document.createElement("span"),
      swatch = document.createElement("i");

    swatch.style.background = rgb(colour);
    span.appendChild(swatch);
    span.appendChild(document.createTextNode(name));

    if (note) {
      var small = document.createElement("small");

      small.textContent = note;
      span.appendChild(small);
    }

    el.appendChild(span);
  }

  if (view === "woods")
    Woods.WOODS.forEach(function (wood, w) {
      item(WOOD_COLOURS[w], wood.name);
    });
  else
    Trees.KINDS.forEach(function (kind) {
      item(
        KIND_COLOURS[kind],
        kind,
        trees > 0 ? Math.round((100 * (count[kind] || 0)) / trees) + "%" : "",
      );
    });

  item(SEA, "sea");
  item(SHORE, "shore");
}

function status(text) {
  document.getElementById("status").textContent = text;
}

//what is on the tile under the pointer
function hover(e) {
  if (drawn === null) return;

  var r = canvas.getBoundingClientRect(),
    x = Math.floor(((e.clientX - r.left) / r.width) * drawn.w),
    y = Math.floor(((e.clientY - r.top) / r.height) * drawn.h);

  if (x < 0 || y < 0 || x >= drawn.w || y >= drawn.h) return;

  var at = y * (drawn.w + 1) + x,
    h = drawn.heights,
    low = Math.min(h[at], h[at + 1], h[at + drawn.w + 1], h[at + drawn.w + 2]),
    tx = drawn.x0 + x,
    ty = drawn.y0 + y,
    text = "tile " + tx + ", " + ty + " - height " + low;

  if (low > 0) {
    var code = Woods.treeAt(tx, ty, low);

    text +=
      " - " +
      Woods.WOODS[Woods.woodAt(tx, ty, low)].name +
      " - " +
      (code === null ? "no tree" : kindOf[code]);
  }

  status(text);
}

function setView(v) {
  view = v;
  document.getElementById("trees").classList.toggle("on", v === "trees");
  document.getElementById("woods").classList.toggle("on", v === "woods");
  draw();
}

document.getElementById("trees").onclick = function () {
  setView("trees");
};

document.getElementById("woods").onclick = function () {
  setView("woods");
};

document.getElementById("scale").onchange = function (e) {
  scale = +e.target.value;
  draw();
};

document.getElementById("home").onclick = function () {
  centre = HOME.slice();
  draw();
};

["x", "y"].forEach(function (axis, k) {
  document.getElementById(axis).onchange = function (e) {
    var v = Math.round(+e.target.value);

    if (isFinite(v)) centre[k] = Math.max(0, Math.min(65535, v));
    draw();
  };
});

//dragged round, the map follows the pointer and is drawn again once let go
(function () {
  var from = null;

  canvas.addEventListener("pointerdown", function (e) {
    from = { x: e.clientX, y: e.clientY, centre: centre.slice() };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("dragging");
  });

  canvas.addEventListener("pointermove", function (e) {
    if (from === null) return hover(e);

    canvas.style.transform =
      "translate(" +
      (e.clientX - from.x) +
      "px," +
      (e.clientY - from.y) +
      "px)";
  });

  function end(e) {
    if (from === null) return;

    var r = canvas.getBoundingClientRect(),
      per = r.width / drawn.w;

    canvas.style.transform = "";
    canvas.classList.remove("dragging");
    centre = [
      Math.round(from.centre[0] - (e.clientX - from.x) / per),
      Math.round(from.centre[1] - (e.clientY - from.y) / per),
    ];
    from = null;
    draw();
  }

  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
})();

window.addEventListener("resize", draw);

draw();

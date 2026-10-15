/**
 * The sprite gallery: every picture the generators paint (shared/gen/
 * catalog), a generator at a time - painted in the page, off its thread,
 * the way the game paints them, and only as they come into sight. Filter by
 * name, see them lit or at night, bigger, on another ground; click one to
 * see it big, with its name and size.
 */
import * as Catalog from "../src/shared/gen/catalog.js";

//how many cards a page of them is, and how many workers paint
var PAGE = 240,
  WORKERS = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));

var workers = [],
  turn = 0,
  waiting = {},
  nextId = 1,
  described = {},
  current = null,
  matches = [],
  shown = 0,
  observer = null;

function el(id) {
  return document.getElementById(id);
}

function status(text) {
  el("status").textContent = text;
}

function worker() {
  if (workers.length === 0)
    for (var i = 0; i < WORKERS; i++) {
      var w = new Worker(new URL("./spriteworker.js", import.meta.url), {
        type: "module",
      });

      w.onmessage = function (e) {
        var m = e.data,
          key = m.type === "described" ? "d:" + m.gen : m.id,
          done = waiting[key];

        delete waiting[key];
        if (done) done(m);
      };
      workers.push(w);
    }

  return workers[turn++ % workers.length];
}

//what a generator paints - asked once, and kept
function describe(gen) {
  if (described[gen]) return Promise.resolve(described[gen]);

  return new Promise(function (resolve) {
    waiting["d:" + gen] = function (m) {
      described[gen] = m;
      resolve(m);
    };
    worker().postMessage({ type: "describe", gen: gen });
  });
}

function paint(gen, key, look) {
  return new Promise(function (resolve) {
    var id = nextId++;

    waiting[id] = resolve;
    worker().postMessage({
      type: "paint",
      id: id,
      gen: gen,
      key: key,
      look: look,
    });
  });
}

//a picture onto a canvas, as big as asked
function show(canvas, p, scale) {
  canvas.width = p.width;
  canvas.height = p.height;
  canvas.style.width = p.width * scale + "px";
  canvas.style.height = p.height * scale + "px";
  canvas
    .getContext("2d")
    .putImageData(new ImageData(p.data, p.width, p.height), 0, 0);
}

function settings() {
  return {
    look: el("look").value || undefined,
    scale: +el("scale").value,
    bg: el("bg").value,
  };
}

/**
 * A card for a sprite, its canvas the size the picture will be - painted
 * once it comes into sight.
 */
function card(sprite) {
  var s = settings(),
    div = document.createElement("div"),
    canvas = document.createElement("canvas");

  div.className = "card";
  div.title = sprite[0] + "  " + sprite[1] + "x" + sprite[2];
  canvas.style.width = sprite[1] * s.scale + "px";
  canvas.style.height = sprite[2] * s.scale + "px";
  div.appendChild(canvas);
  div.sprite = sprite;
  div.canvas = canvas;
  div.onclick = function () {
    zoom(sprite);
  };

  return div;
}

function paintCard(div) {
  if (div.painted) return;

  div.painted = true;

  var s = settings(),
    gen = current;

  paint(gen, div.sprite[3], s.look).then(function (p) {
    if (p.error) {
      div.title += "\n" + p.error;
      div.style.borderColor = "#b5532f";
      return;
    }

    if (gen === current) show(div.canvas, p, s.scale);
  });
}

function more() {
  var grid = el("grid"),
    old = el("more"),
    upto = Math.min(matches.length, shown + PAGE);

  if (old) old.remove();

  for (var i = shown; i < upto; i++) {
    var c = card(matches[i]);

    grid.appendChild(c);
    observer.observe(c);
  }

  shown = upto;

  if (shown < matches.length) {
    var b = document.createElement("button");

    b.id = "more";
    b.textContent =
      "show " +
      Math.min(PAGE, matches.length - shown) +
      " more of " +
      (matches.length - shown);
    b.onclick = more;
    grid.appendChild(b);
  }
}

//the sprites of the generator open that match the filter, a page of them
function list() {
  var d = described[current],
    words = el("filter").value.toLowerCase().split(/\s+/).filter(Boolean),
    grid = el("grid");

  document.body.style.setProperty("--bg", el("bg").value);

  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) paintCard(e.target);
      });
    },
    { root: grid, rootMargin: "300px" },
  );

  grid.innerHTML = "";
  matches = d.sprites.filter(function (s) {
    var name = s[0].toLowerCase();

    return words.every(function (w) {
      return name.indexOf(w) !== -1;
    });
  });
  shown = 0;
  more();

  status(
    current +
      ": " +
      matches.length +
      " of " +
      d.sprites.length +
      " pictures" +
      (words.length ? " match" : "") +
      " - described in " +
      Math.round(d.ms) +
      " ms" +
      (d.faced ? "" : " - painted lit only"),
  );
}

function open(gen) {
  current = gen;
  Array.prototype.forEach.call(el("gens").children, function (b) {
    b.className = b.gen === gen ? "on" : "";
  });
  el("grid").innerHTML = "";
  status("describing " + gen + "...");

  describe(gen).then(function (d) {
    var b = Array.prototype.find.call(el("gens").children, function (x) {
      return x.gen === gen;
    });

    b.querySelector("small").textContent = d.sprites.length;
    if (current === gen) list();
  });
}

function zoom(sprite) {
  var z = el("zoom"),
    s = settings(),
    canvas = z.querySelector("canvas");

  z.style.display = "flex";
  z.querySelector("div").textContent =
    sprite[0] +
    " - " +
    sprite[1] +
    "x" +
    sprite[2] +
    (sprite[3] !== sprite[0] ? " - " + sprite[3] : "");

  paint(current, sprite[3], s.look).then(function (p) {
    if (!p.error)
      show(
        canvas,
        p,
        Math.max(
          2,
          Math.floor(
            Math.min(
              (innerWidth * 0.9) / p.width,
              (innerHeight * 0.75) / p.height,
            ),
          ),
        ),
      );
  });
}

el("zoom").onclick = function () {
  this.style.display = "none";
};

Catalog.GENERATORS.forEach(function (gen) {
  var b = document.createElement("button");

  b.gen = gen;
  b.innerHTML = gen + " <small></small>";
  b.onclick = function () {
    open(gen);
  };
  el("gens").appendChild(b);
});

var typing = null;

el("filter").oninput = function () {
  clearTimeout(typing);
  typing = setTimeout(function () {
    if (current && described[current]) list();
  }, 200);
};

["look", "scale", "bg"].forEach(function (id) {
  el(id).onchange = function () {
    if (current && described[current]) list();
  };
});

open(location.hash ? location.hash.slice(1) : "vehicles");

window.addEventListener("hashchange", function () {
  if (Catalog.GENERATORS.indexOf(location.hash.slice(1)) !== -1)
    open(location.hash.slice(1));
});

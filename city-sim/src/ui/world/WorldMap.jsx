/**
 * The map of the world, for debugging (the menu's World map): the ground of
 * as much of it as is asked for - all of it, 65536 tiles each way, down to a
 * few hundred tiles across - from straight above, north up the way the view
 * from above has it: x to the right, y up. The tiles' x and y along its
 * edges, and the tile under the pointer under it; the camera and the cities
 * marked on it.
 *
 * Coarse on purpose: a pixel of it is how high the ground is at a tile or
 * two (isometrica core/terrain, the noise and whatever was shaped), never
 * every tile it covers, so it costs much the same whatever it shows - a few
 * tiles averaged, zoomed out, to tell mostly land from mostly sea. Worked
 * out a few rows a frame, the game going on meanwhile. It opens over the
 * camera, a good way out.
 *
 * Dragged, it moves about; turned with the wheel, or the buttons, it shows
 * more or less of the world; Go to puts it over the tile asked for. Clicked,
 * the camera is put over the tile clicked - which no player can do: they
 * only ever pan. It is not kept from them yet.
 */
import { useEffect, useRef, useState } from "react";
import ClientConfig from "isometrica/client/config";
import { Icon, cx } from "../kit";
import { setWorldMap, useGame } from "../store";
import { getClient } from "../session";

//how many tiles the world is each way: a tile's x and y are 16 bits each
//(isometrica core/terrain convertToIndex)
var WORLD = 65536;
//how near the world's edges the camera is put at the most, tiles: the
//chunks round it are loaded only where x and y are not below 0, and past
//the 16 bits they would run into one another
var EDGE = 128;
//the map's own pixels each way - a sample of the ground each
var PX = 256;
//how many tiles across the map shows, zoomed out to in
var SPANS = [65536, 32768, 16384, 8192, 4096, 2048, 1024, 512, 256];
//how far in Go to zooms when the whole world is shown: SPANS[GO_ZOOM] -
//and how far in the map opens, over the camera
var GO_ZOOM = 4,
  OPEN_ZOOM = 2;
//samples of the ground a frame, not to hold the game up
var SAMPLES = 8192;
//room round the map for the axes' figures, CSS pixels
var LEFT = 40,
  TOP = 6,
  RIGHT = 10,
  BOTTOM = 18;
//how far the pointer goes, pressed, before it drags the map, not clicks it
var DRAG = 4;
//how often the camera's spot is read again, ms
var EVERY = 250;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

//the map over x, y at zoom - as near there as it goes without showing
//past the world's edges
function shown(x, y, zoom) {
  var half = SPANS[zoom] / 2;

  return {
    x: clamp(x, half, WORLD - half),
    y: clamp(y, half, WORLD - half),
    zoom: zoom,
  };
}

/**
 * The colour of ground that high, into out at o: the sea deeper blue the
 * deeper it is, the shore sand, the land green, darker going up, and rock
 * up high.
 */
function colour(h, out, o) {
  var r, g, b, t;

  if (h <= 0) {
    t = Math.min(1, -h / 10);
    r = 74 - 56 * t;
    g = 150 - 104 * t;
    b = 214 - 96 * t;
  } else if (h <= 1) {
    r = 214;
    g = 200;
    b = 146;
  } else {
    t = Math.min(1, (h - 2) / 10);
    if (t < 0.6) {
      t /= 0.6;
      r = 96 - 44 * t;
      g = 164 - 54 * t;
      b = 72 - 30 * t;
    } else {
      t = (t - 0.6) / 0.4;
      r = 52 + 92 * t;
      g = 110 + 22 * t;
      b = 42 + 72 * t;
    }
  }

  out[o] = r;
  out[o + 1] = g;
  out[o + 2] = b;
  out[o + 3] = 255;
}

//a step between the figures along an edge about that many tiles long: 1, 2
//or 5 of some power of ten
function niceStep(raw) {
  var pow = Math.pow(10, Math.floor(Math.log10(raw))),
    m = [1, 2, 5, 10];

  for (var i = 0; i < m.length; i++) if (m[i] * pow >= raw) return m[i] * pow;

  return 10 * pow;
}

//a figure along an edge: thousands as k, from ten thousand on
function figure(n) {
  return n >= 10000 && n % 1000 === 0 ? n / 1000 + "k" : String(n);
}

//the tile under the middle of the screen, x and y - or null
function cameraTile(client) {
  if (!client || !client.camera) return null;

  var p = client.camera.transform.getPosition();

  return [p[0] / ClientConfig.tileSize, p[2] / ClientConfig.tileSize];
}

export default function WorldMap() {
  var client = getClient(),
    terrain = client && client.core ? client.core.terrain : null,
    //as wide as the screen leaves room for, at the most 320 CSS pixels
    size = useRef(
      Math.max(200, Math.min(320, window.innerWidth - 120)),
    ).current,
    [at, setAt] = useState(function () {
      var c = cameraTile(client);

      return c ? shown(c[0], c[1], OPEN_ZOOM) : shown(WORLD / 2, WORLD / 2, 0);
    }),
    [hover, setHover] = useState(null),
    [target, setTarget] = useState(null),
    [camera, setCamera] = useState(function () {
      return cameraTile(client);
    }),
    [asked, setAsked] = useState(""),
    [wrong, setWrong] = useState(false),
    debug = useGame(function (s) {
      return s.debug;
    }),
    canvas = useRef(null),
    //the map as worked out so far: PX by PX, a pixel a sample
    image = useRef(null),
    drag = useRef(null),
    //what draw goes by, as it is now - it is called from the work too
    latest = useRef(null);

  latest.current = {
    at: at,
    hover: hover,
    target: target,
    camera: camera,
  };

  function draw() {
    var c = canvas.current;

    if (!c) return;

    var dpr = window.devicePixelRatio || 1,
      w = LEFT + size + RIGHT,
      h = TOP + size + BOTTOM,
      g = c.getContext("2d"),
      s = latest.current,
      span = SPANS[s.at.zoom],
      x0 = s.at.x - span / 2,
      y0 = s.at.y - span / 2,
      ink = getComputedStyle(c).color,
      cities =
        client && client.core && client.core.cities
          ? client.core.cities.getCities()
          : [],
      i,
      t;

    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }

    function sx(x) {
      return LEFT + ((x - x0) / span) * size;
    }

    function sy(y) {
      return TOP + ((y0 + span - y) / span) * size;
    }

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    g.save();
    g.beginPath();
    g.rect(LEFT, TOP, size, size);
    g.clip();

    g.imageSmoothingEnabled = false;
    if (image.current) g.drawImage(image.current, LEFT, TOP, size, size);

    //the cities: a square each, and its name close enough in
    g.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
    g.textAlign = "left";
    g.textBaseline = "middle";
    for (i = 0; i < cities.length; i++) {
      var tile = cities[i].tile(),
        cx0 = sx(tile & 0xffff),
        cy0 = sy(tile >>> 16);

      g.fillStyle = "#fff";
      g.strokeStyle = "#1b2340";
      g.lineWidth = 1.5;
      g.fillRect(cx0 - 3, cy0 - 3, 6, 6);
      g.strokeRect(cx0 - 3, cy0 - 3, 6, 6);
      if (span <= 4096) {
        g.lineWidth = 3;
        g.strokeText(cities[i].name(), cx0 + 6, cy0);
        g.fillText(cities[i].name(), cx0 + 6, cy0);
      }
    }

    //the tile Go to asked for
    if (s.target) {
      g.strokeStyle = "#f0b23a";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(sx(s.target[0]), sy(s.target[1]), 7, 0, Math.PI * 2);
      g.stroke();
    }

    //the camera: where the middle of the screen is
    if (s.camera) {
      g.fillStyle = "#de5a46";
      g.strokeStyle = "#fff";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(sx(s.camera[0]), sy(s.camera[1]), 4.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }

    g.restore();

    g.strokeStyle = ink;
    g.globalAlpha = 0.5;
    g.lineWidth = 1;
    g.strokeRect(LEFT + 0.5, TOP + 0.5, size - 1, size - 1);
    g.globalAlpha = 1;

    //the tiles' x under it, y to the left of it
    var step = niceStep(span / 5);

    g.fillStyle = ink;
    g.strokeStyle = ink;
    g.font = "10px ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "top";
    for (t = Math.ceil(x0 / step) * step; t <= x0 + span; t += step) {
      g.fillRect(Math.round(sx(t)), TOP + size, 1, 4);
      g.fillText(
        figure(t),
        clamp(sx(t), LEFT + 8, LEFT + size),
        TOP + size + 5,
      );
    }
    g.textAlign = "right";
    g.textBaseline = "middle";
    for (t = Math.ceil(y0 / step) * step; t <= y0 + span; t += step) {
      g.fillRect(LEFT - 4, Math.round(sy(t)), 4, 1);
      g.fillText(figure(t), LEFT - 6, clamp(sy(t), TOP + 5, TOP + size - 4));
    }
  }

  //the ground of what is shown, worked out a few rows a frame - over what
  //was shown before, till each row's turn comes
  useEffect(
    function () {
      if (!terrain) return;

      var span = SPANS[at.zoom],
        x0 = at.x - span / 2,
        top = at.y + span / 2,
        step = span / PX,
        //samples a pixel, each way: the ground has nothing bigger than a
        //few hundred tiles to it (core/terrain calcZ), and one sample of
        //every so many tiles is all but noise - an average of a few shows
        //whether it is mostly land or mostly sea there
        n = step >= 128 ? 3 : step >= 32 ? 2 : 1,
        rows = Math.max(1, Math.floor(SAMPLES / (PX * n * n))),
        off = image.current,
        row = 0,
        frame,
        ctx,
        data;

      if (off === null) {
        off = image.current = document.createElement("canvas");
        off.width = off.height = PX;
      }

      ctx = off.getContext("2d");
      data = ctx.createImageData(PX, PX);

      function work() {
        var from = row,
          end = Math.min(PX, row + rows),
          i,
          a,
          b,
          sum;

        for (; row < end; row++)
          for (i = 0; i < PX; i++) {
            sum = 0;
            for (a = 0; a < n; a++)
              for (b = 0; b < n; b++)
                sum += terrain.getGridPointHeight(
                  Math.floor(x0 + (i + (a + 0.5) / n) * step),
                  Math.floor(top - (row + (b + 0.5) / n) * step),
                );
            colour(sum / (n * n), data.data, (row * PX + i) * 4);
          }

        ctx.putImageData(data, 0, 0, 0, from, PX, end - from);
        draw();

        if (row < PX) frame = requestAnimationFrame(work);
      }

      frame = requestAnimationFrame(work);

      return function () {
        cancelAnimationFrame(frame);
      };
    },
    [at.x, at.y, at.zoom],
  );

  //drawn again as anything on it changes
  useEffect(draw, [hover, target, camera]);

  //where the camera is, read again now and then - panned, it moves
  useEffect(function () {
    var every = setInterval(function () {
      var now = cameraTile(client),
        was = latest.current.camera;

      if (
        now &&
        (!was ||
          Math.abs(now[0] - was[0]) >= 0.5 ||
          Math.abs(now[1] - was[1]) >= 0.5)
      )
        setCamera(now);
    }, EVERY);

    return function () {
      clearInterval(every);
    };
  }, []);

  //the wheel zooms the map, not the page or the world under it
  useEffect(function () {
    var c = canvas.current;

    function wheel(e) {
      var t = tileAt(e);

      e.preventDefault();
      if (t) zoomAbout(t, e.deltaY < 0 ? 1 : -1);
    }

    c.addEventListener("wheel", wheel, { passive: false });

    return function () {
      c.removeEventListener("wheel", wheel);
    };
  }, []);

  //the tile under the pointer, and where on the map it is - or null off it
  function tileAt(e) {
    var r = canvas.current.getBoundingClientRect(),
      mx = e.clientX - r.left - LEFT,
      my = e.clientY - r.top - TOP,
      s = latest.current,
      span = SPANS[s.at.zoom];

    if (mx < 0 || my < 0 || mx > size || my > size) return null;

    return {
      x: s.at.x - span / 2 + (mx / size) * span,
      y: s.at.y + span / 2 - (my / size) * span,
      mx: mx,
      my: my,
    };
  }

  //zoomed in (1) or out (-1), the tile t staying where it is on the map -
  //or the middle of it, with no t
  function zoomAbout(t, by) {
    var s = latest.current.at,
      zoom = clamp(s.zoom + by, 0, SPANS.length - 1),
      span = SPANS[zoom];

    if (zoom === s.zoom) return;

    if (!t) setAt(shown(s.x, s.y, zoom));
    else
      setAt(
        shown(
          t.x - (t.mx / size - 0.5) * span,
          t.y + (t.my / size - 0.5) * span,
          zoom,
        ),
      );
  }

  //the camera put over tile x, y - near the edges, as near as it goes
  function jump(x, y) {
    if (!client || !client.camera) return;

    x = clamp(x, EDGE, WORLD - EDGE);
    y = clamp(y, EDGE, WORLD - EDGE);
    client.camera.cameraScript.lookAt(
      x * ClientConfig.tileSize,
      y * ClientConfig.tileSize,
    );
    setCamera([x, y]);
  }

  function go(e) {
    e.preventDefault();

    var m = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(
      asked,
    );

    if (!m) {
      setWrong(true);
      return;
    }

    var x = clamp(+m[1], 0, WORLD - 1),
      y = clamp(+m[2], 0, WORLD - 1),
      zoom = at.zoom === 0 ? GO_ZOOM : at.zoom;

    setWrong(false);
    setTarget([x, y]);
    setAt(shown(x, y, zoom));
  }

  function onPointerDown(e) {
    canvas.current.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      at: latest.current.at,
      moved: false,
    };
  }

  function onPointerMove(e) {
    var d = drag.current;

    setHover(tileAt(e));

    if (d === null) return;

    var dx = e.clientX - d.x,
      dy = e.clientY - d.y,
      span = SPANS[d.at.zoom];

    if (!d.moved && Math.hypot(dx, dy) < DRAG) return;

    d.moved = true;
    setAt(
      shown(
        d.at.x - (dx / size) * span,
        d.at.y + (dy / size) * span,
        d.at.zoom,
      ),
    );
  }

  function onPointerUp(e) {
    var d = drag.current,
      t;

    drag.current = null;

    if (d !== null && !d.moved && (t = tileAt(e))) jump(t.x, t.y);
  }

  var height =
    hover && terrain
      ? terrain.getGridPointHeight(
          clamp(Math.floor(hover.x), 0, WORLD - 1),
          clamp(Math.floor(hover.y), 0, WORLD - 1),
        )
      : null;

  return (
    <div
      className={cx(
        "card pointer-events-auto fixed top-32 z-40 max-h-[calc(100svh-14rem)] overflow-y-auto overscroll-contain text-xs",
        //beside the debug panel, when that is up too
        debug ? "left-[19.25rem] sm:left-[19.75rem]" : "left-2.5 sm:left-4",
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <span className="label">World map</span>
        <span className="text-[10px] font-semibold text-muted">
          {SPANS[at.zoom].toLocaleString()} tiles across
        </span>
        <button
          type="button"
          aria-label="Close"
          title="Close"
          onClick={function () {
            setWorldMap(false);
          }}
          className="-mr-1 ml-auto grid size-7 cursor-pointer place-items-center rounded-[3px] hover:bg-inset"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <canvas
        ref={canvas}
        style={{
          width: LEFT + size + RIGHT,
          height: TOP + size + BOTTOM,
        }}
        className="block cursor-crosshair touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={function () {
          drag.current = null;
        }}
        onPointerLeave={function () {
          setHover(null);
        }}
      />
      <div className="flex items-center gap-1 px-3 pt-1.5 font-mono text-[11px] text-muted">
        <span className="min-w-0 flex-1 truncate">
          {hover
            ? "x " +
              Math.floor(hover.x) +
              "  y " +
              Math.floor(hover.y) +
              "  height " +
              height
            : camera
              ? "camera  x " +
                Math.floor(camera[0]) +
                "  y " +
                Math.floor(camera[1])
              : ""}
        </span>
      </div>
      <div className="flex items-center gap-1 px-3 pt-1.5">
        <MapButton
          icon="minus"
          label="Show more"
          onClick={function () {
            zoomAbout(null, -1);
          }}
        />
        <MapButton
          icon="plus"
          label="Show less, closer"
          onClick={function () {
            zoomAbout(null, 1);
          }}
        />
        <button
          type="button"
          className="h-7 cursor-pointer rounded-[3px] px-2 font-extrabold hover:bg-inset"
          onClick={function () {
            setAt(shown(WORLD / 2, WORLD / 2, 0));
          }}
        >
          World
        </button>
        <button
          type="button"
          className="h-7 cursor-pointer rounded-[3px] px-2 font-extrabold hover:bg-inset"
          onClick={function () {
            if (camera)
              setAt(
                shown(camera[0], camera[1], at.zoom === 0 ? GO_ZOOM : at.zoom),
              );
          }}
        >
          Camera
        </button>
      </div>
      <form onSubmit={go} className="flex items-center gap-1.5 px-3 pt-1.5">
        <input
          value={asked}
          onChange={function (e) {
            setAsked(e.target.value);
            setWrong(false);
          }}
          placeholder="x, y"
          aria-label="Go to tile x, y"
          className={cx(
            "h-8 min-w-0 flex-1 rounded-[3px] bg-inset px-2 font-mono text-[12px] outline-none",
            wrong && "ring-2 ring-red",
          )}
        />
        <button
          type="submit"
          className="h-8 cursor-pointer rounded-[3px] bg-navy px-3 font-extrabold text-paper"
        >
          Go to
        </button>
      </form>
      <div className="px-3 pt-1.5 pb-2.5 text-[11px] text-muted">
        Drag to look about, wheel to zoom. Click to put the camera there.
      </div>
    </div>
  );
}

function MapButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-7 cursor-pointer place-items-center rounded-[3px] hover:bg-inset"
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

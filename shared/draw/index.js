/**
 * What is drawn, as typed arrays: a table of pictures by number, draw lists
 * that systems write rows into, and what of them is on the screen a frame -
 * culled by a world-to-screen matrix and sorted by layer, then depth. How it
 * gets onto the GPU stays the renderer's. The design is engine/docs/world.md,
 * Typed arrays (the renderer is handed typed draw lists).
 *
 *   var pictures = Pictures(), list = DrawList(), visible = Visible();
 *   var tree = pictures.add(32, 48, 16, 44);       //width, height, pivot
 *   list.add(x, y, z, tree, layer, tag);
 *   visible.cull(list, pictures, M, width, height, pad);
 *   visible.sort(D, layersCount);
 *   //draw visible.rows[visible.order[i]] at visible.sx/sy[visible.order[i]],
 *   //i from visible.layerStarts[l] to visible.layerStarts[l + 1]
 */
import { RadixSort, grow } from "../typed/index.js";

/**
 * Pictures by number: their size, their pivot (the spot drawn at the
 * position), and where they are (a page of an atlas and a place on it, the
 * renderer's to fill in). One with no size yet is culled by its spot alone,
 * and handed on: what to do with a picture not ready is the renderer's.
 */
export function Pictures(capacity) {
  var n = Math.max(capacity || 64, 1);

  var pictures = {
    count: 0,
    width: new Float32Array(n),
    height: new Float32Array(n),
    pivotX: new Float32Array(n),
    pivotY: new Float32Array(n),
    page: new Int32Array(n).fill(-1),
    u: new Float32Array(n),
    v: new Float32Array(n),

    add: function (width, height, pivotX, pivotY, page, u, v) {
      var id = pictures.count++;

      if (id >= pictures.width.length) enlarge(id + 1);
      pictures.set(id, width, height, pivotX, pivotY, page, u, v);

      return id;
    },

    set: function (id, width, height, pivotX, pivotY, page, u, v) {
      pictures.width[id] = width || 0;
      pictures.height[id] = height || 0;
      pictures.pivotX[id] = pivotX || 0;
      pictures.pivotY[id] = pivotY || 0;
      pictures.page[id] = page === undefined ? -1 : page;
      pictures.u[id] = u || 0;
      pictures.v[id] = v || 0;
    },
  };

  function enlarge(m) {
    ["width", "height", "pivotX", "pivotY", "u", "v"].forEach(function (k) {
      pictures[k] = grow(pictures[k], m);
    });

    var page = new Int32Array(Math.max(m, pictures.page.length * 2)).fill(-1);

    page.set(pictures.page);
    pictures.page = page;
  }

  return pictures;
}

/**
 * Rows of what a system has to draw: where (x, y, z, in the world), which
 * picture, its layer, how see-through (alpha, 1 by default), and a tag of
 * the system's own (a record's handle, a tile's index). add() -> its row.
 */
export function DrawList(capacity) {
  var n = Math.max(capacity || 64, 1);

  var list = {
    count: 0,
    x: new Float64Array(n),
    y: new Float64Array(n),
    z: new Float64Array(n),
    picture: new Uint32Array(n),
    layer: new Uint16Array(n),
    alpha: new Float32Array(n),
    tag: new Float64Array(n),

    add: function (x, y, z, picture, layer, tag) {
      var row = list.count++;

      if (row >= list.x.length) {
        ["x", "y", "z", "picture", "layer", "alpha", "tag"].forEach(
          function (k) {
            list[k] = grow(list[k], row + 1);
          },
        );
      }

      list.x[row] = x;
      list.y[row] = y;
      list.z[row] = z;
      list.picture[row] = picture;
      list.layer[row] = layer || 0;
      list.alpha[row] = 1;
      list.tag[row] = tag === undefined ? -1 : tag;

      return row;
    },

    clear: function () {
      list.count = 0;
    },
  };

  return list;
}

/*
 * Depth keys are made 16 bits over each layer's own range, and the layer
 * put above them: one 32-bit key, one stable radix sort. Rows with the same
 * key keep the order they were culled in, which is the list's.
 */
var KEY_MAX = 0xffff;

/**
 * What of draw lists is on the screen, a frame at a time: rows, list (which
 * list a row is of, in the order they were culled from), sx, sy (the
 * picture's top left on the screen, to the nearest pixel), count; and once
 * sorted, order (entries in the order they are drawn) and layerStarts.
 */
export function Visible(capacity) {
  var n = Math.max(capacity || 256, 1),
    radix = RadixSort(n),
    depth = new Float64Array(n),
    layers = new Uint16Array(n),
    keys = new Uint32Array(n),
    min = new Float64Array(16),
    max = new Float64Array(16);

  var visible = {
    count: 0,
    lists: 0,
    rows: new Uint32Array(n),
    list: new Uint8Array(n),
    sx: new Int32Array(n),
    sy: new Int32Array(n),
    order: new Uint32Array(n),
    layerStarts: new Uint32Array(17),

    //starts a frame; then cull() each list, then sort()
    clear: function () {
      visible.count = 0;
      visible.lists = 0;
    },

    /*
     * Adds the rows of list on the screen: M is the world-to-screen matrix
     * (16 numbers, column-major, as gl-matrix keeps them), width and height
     * the screen's, pad how far off it a picture is still drawn. How many
     * of the list's rows came in. Lists culled in a frame: 255 at most.
     */
    cull: function (list, pictures, M, width, height, pad) {
      var m0 = M[0],
        m1 = M[1],
        m4 = M[4],
        m5 = M[5],
        m8 = M[8],
        m9 = M[9],
        m12 = M[12],
        m13 = M[13],
        xs = list.x,
        ys = list.y,
        zs = list.z,
        pics = list.picture,
        pw = pictures.width,
        ph = pictures.height,
        px = pictures.pivotX,
        py = pictures.pivotY,
        index = visible.lists++,
        start = visible.count,
        at = start;

      pad = pad || 0;
      reserve(start + list.count);

      var rows = visible.rows,
        sxs = visible.sx,
        sys = visible.sy,
        which = visible.list,
        layerOf = list.layer;

      for (var row = 0, rowCount = list.count; row < rowCount; row++) {
        var p = pics[row],
          w = pw[p],
          x = xs[row],
          y = ys[row],
          z = zs[row],
          //to the nearest pixel, as the engine's own cull: cut towards 0, a
          //picture a hair under a whole pixel would leave a seam
          sx = Math.floor(m0 * x + m4 * y + m8 * z + m12 - px[p] + 0.5),
          sy = Math.floor(m1 * x + m5 * y + m9 * z + m13 - py[p] + 0.5);

        if (
          sx > width + pad ||
          sx + w < -pad ||
          sy > height + pad ||
          sy + ph[p] < -pad
        )
          continue;

        rows[at] = row;
        which[at] = index;
        sxs[at] = sx;
        sys[at] = sy;
        layers[at] = layerOf[row];
        at++;
      }

      visible.count = at;
      cullLists[index] = list;

      return at - start;
    },

    /*
     * Sorts what was culled: by layer (0 first), and within one by depth,
     * D · position, smaller first (D as CameraComponent#depthAxes).
     */
    sort: function (D, layersCount) {
      var count = visible.count,
        d0 = D[0],
        d1 = D[1],
        d2 = D[2],
        i;

      layersCount = layersCount || 1;
      if (min.length < layersCount) {
        min = new Float64Array(layersCount);
        max = new Float64Array(layersCount);
      }
      if (visible.layerStarts.length < layersCount + 1)
        visible.layerStarts = new Uint32Array(layersCount + 1);

      min.fill(Infinity);
      max.fill(-Infinity);

      for (i = 0; i < count; i++) {
        var list = cullLists[visible.list[i]],
          row = visible.rows[i],
          d = d0 * list.x[row] + d1 * list.y[row] + d2 * list.z[row],
          l = layers[i];

        depth[i] = d;
        if (d < min[l]) min[l] = d;
        if (d > max[l]) max[l] = d;
      }

      for (i = 0; i < count; i++) {
        l = layers[i];

        var range = max[l] - min[l],
          q = range > 0 ? ((depth[i] - min[l]) * (KEY_MAX / range)) | 0 : 0;

        if (q > KEY_MAX) q = KEY_MAX;
        keys[i] = ((l << 16) | q) >>> 0;
        visible.order[i] = i;
      }

      radix.sort(keys, visible.order, count);

      var starts = visible.layerStarts;

      starts.fill(0);
      for (i = 0; i < count; i++) starts[layers[i] + 1]++;
      for (l = 0; l < layersCount; l++) starts[l + 1] += starts[l];
    },

    //the draw list a visible entry is from
    listOf: function (entry) {
      return cullLists[visible.list[entry]];
    },
  };

  var cullLists = [];

  function reserve(m) {
    if (m <= visible.rows.length) return;

    m = Math.max(m, visible.rows.length * 2);
    visible.rows = grow(visible.rows, m);
    visible.list = grow(visible.list, m);
    visible.sx = grow(visible.sx, m);
    visible.sy = grow(visible.sy, m);
    visible.order = grow(visible.order, m);
    depth = grow(depth, m);
    layers = grow(layers, m);
    keys = grow(keys, m);
  }

  return visible;
}

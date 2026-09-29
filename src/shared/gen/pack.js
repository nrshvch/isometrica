/**
 * Where each of a set of pictures goes on one sheet: in rows, tallest first,
 * every row about as long as a square sheet of them would be wide, with GAP
 * pixels of nothing between any two so that no picture bleeds into the next
 * when it is drawn. The same for the sheets tools/packsprites.js writes and
 * the ones the game paints as it starts.
 */
export var GAP = 1;

/**
 * @param items {{name: string, width: number, height: number}[]}
 * @returns {{width: number, height: number, frames: Object}} frames, name ->
 *          {x, y, w, h}
 */
export function layout(items) {
  var area = 0,
    widest = 0;

  items.forEach(function (it) {
    area += (it.width + GAP) * (it.height + GAP);
    widest = Math.max(widest, it.width);
  });

  //by name among the same height, so that the same pictures always come
  //out the same
  var sorted = items.slice().sort(function (a, b) {
    return b.height - a.height || (a.name < b.name ? -1 : 1);
  });

  var rowWidth = Math.max(widest, Math.ceil(Math.sqrt(area))),
    frames = {},
    x = 0,
    y = 0,
    rowH = 0,
    w = 0;

  sorted.forEach(function (it) {
    if (x > 0 && x + it.width > rowWidth) {
      x = 0;
      y += rowH + GAP;
      rowH = 0;
    }

    frames[it.name] = { x: x, y: y, w: it.width, h: it.height };
    w = Math.max(w, x + it.width);
    rowH = Math.max(rowH, it.height);
    x += it.width + GAP;
  });

  return { width: w, height: y + rowH, frames: frames };
}

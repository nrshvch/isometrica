/**
 * Cuts the stones out of the pictures they were painted in, and paints each of
 * them the other way round as well.
 *
 * The stones in assets/sprites/scenery/stones were painted straight onto a
 * flat grass tile - the very one in assets/sprites/terrain/grass/2222.png,
 * pixel for pixel - with
 * their shadows laid over it as black at 20%. Where a picture has that grass,
 * there is nothing but ground; where it has that grass darkened the same in
 * every channel, there is shadow, and it becomes black as see-through as the
 * shadows were on the whole - one pixel off another only by rounding;
 * everything else is stone and stays as it is. So the stones can lie on any
 * ground, sloped or whatever grass it happens to be.
 *
 * The mirrored ones are flipped left to right, stones only: the light still
 * comes from the right, so their shadows are cast again to the left of them -
 * each stone's silhouette dragged SHADOW_LENGTH pixels along the ground, over
 * the tile and nowhere else, the way the painted ones lie.
 *
 * It paints into plain pictures, {width, height, data} with the pixels as
 * RGBA; the game paints them as it starts (client/generated).
 */
//how far a shadow may be off the darkening it is taken for, per channel - the
//painted ones were rounded to whole values
var SHADOW_TOLERANCE = 0.05;
//how far to the left a stone's shadow reaches, as far as the painted ones do
var SHADOW_LENGTH = 6;

function blank(w, h) {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
}

/**
 * How much a pixel of the picture darkens the ground under it: 0 where it is
 * the ground as it is, the same for all three channels where it is shadow, and
 * null where it is neither - that is a stone.
 */
function darkening(picture, ground, i) {
  var ratios = [0, 1, 2].map(function (c) {
      return picture.data[i + c] / Math.max(1, ground.data[i + c]);
    }),
    mean = (ratios[0] + ratios[1] + ratios[2]) / 3;

  if (
    ratios.some(function (r) {
      return Math.abs(r - mean) > SHADOW_TOLERANCE;
    }) ||
    mean > 1 + SHADOW_TOLERANCE
  )
    return null;

  return Math.max(0, 1 - mean);
}

/**
 * The picture with the ground taken out of it: stones as they were painted,
 * shadows black and as see-through as they darkened the grass on the whole.
 *
 * @returns {{image: Object, stone: Uint8Array, shade: number}} stone marks the
 *          stone pixels, and shade is the alpha of the shadows
 */
function cutOut(picture, ground) {
  var w = picture.width,
    h = picture.height,
    image = blank(w, h),
    stone = new Uint8Array(w * h),
    shadow = [],
    shade = 0,
    p,
    i,
    d;

  for (p = 0; p < w * h; p++) {
    i = p * 4;

    if (picture.data[i + 3] === 0) continue;

    //painted past the edge of the tile - there is no ground to be
    //anything but stone
    d = ground.data[i + 3] === 0 ? null : darkening(picture, ground, i);

    if (d === null) {
      stone[p] = 1;
      image.data.set(picture.data.subarray(i, i + 4), i);
    } else if (Math.round(d * 255) > 0) {
      shadow.push(p);
      shade += d;
    }
  }

  shade = shadow.length > 0 ? Math.round((shade / shadow.length) * 255) : 0;

  shadow.forEach(function (q) {
    image.data[q * 4 + 3] = shade;
  });

  return { image: image, stone: stone, shade: shade };
}

/**
 * The stones of a cut out picture flipped left to right, with their shadows
 * cast again on the ground to the left of them, as dark as the shadows were.
 */
function mirror(cut, ground) {
  var src = cut.image,
    w = src.width,
    h = src.height,
    image = blank(w, h),
    stone = new Uint8Array(w * h),
    x,
    y,
    k,
    p,
    i,
    j;

  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      p = y * w + x;
      j = y * w + (w - 1 - x);

      if (cut.stone[j] === 1) {
        stone[p] = 1;
        image.data.set(src.data.subarray(j * 4, j * 4 + 4), p * 4);
      }
    }
  }

  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      p = y * w + x;
      i = p * 4;

      //shadows fall on the tile only, and never over a stone
      if (stone[p] === 1 || ground.data[i + 3] === 0) continue;

      for (k = 1; k <= SHADOW_LENGTH && x + k < w; k++) {
        if (stone[p + k] === 1) {
          image.data[i + 3] = cut.shade;
          break;
        }
      }
    }
  }

  return image;
}

/**
 * Paints the stones one picture at a time, as they are asked for, cutting
 * each painted picture out only once for both ways round.
 *
 * @param pictures {Object} the painted pictures by name, "stone"
 * @param ground {Object} the grass tile they were painted on
 */
export function createPainter(pictures, ground) {
  var cuts = {};

  function cut(name) {
    var picture = pictures[name];

    if (picture === undefined) throw new Error("no such stones: " + name);

    if (cuts[name] === undefined) {
      if (picture.width !== ground.width || picture.height !== ground.height)
        throw new Error(
          name + " is not the size of the tile it was painted on",
        );

      //cut out of a copy, the picture itself is left as it is
      cuts[name] = cutOut(
        {
          width: picture.width,
          height: picture.height,
          data: Uint8ClampedArray.from(picture.data),
        },
        ground,
      );
    }

    return cuts[name];
  }

  return {
    /**
     * @param name {string} "stone", or "stone-m" for it the other way round
     */
    paint: function (name) {
      return /-m$/.test(name)
        ? mirror(cut(name.slice(0, -2)), ground)
        : cut(name).image;
    },
  };
}

/**
 * What generate paints, without painting it: the name and size of every
 * picture - each painted one as it is and the other way round, the size of
 * the tile they were painted on.
 *
 * @param pictures {Object} the painted pictures by name, "stone"
 * @param ground {Object} the grass tile they were painted on
 * @returns {Object} {w, h} by name, "stone" and "stone-m" for each
 */
export function describe(pictures, ground) {
  var sizes = {};

  Object.keys(pictures).forEach(function (name) {
    if (
      pictures[name].width !== ground.width ||
      pictures[name].height !== ground.height
    )
      throw new Error(name + " is not the size of the tile it was painted on");

    sizes[name] = sizes[name + "-m"] = { w: ground.width, h: ground.height };
  });

  return sizes;
}

/**
 * Cuts out every painted picture of stones and paints it the other way round.
 *
 * @param pictures {Object} the painted pictures by name, "stone"
 * @param ground {Object} the grass tile they were painted on
 * @returns {Object} the stones by name, "stone" and "stone-m" for each
 */
export function generate(pictures, ground) {
  var painter = createPainter(pictures, ground),
    out = {};

  Object.keys(pictures).forEach(function (name) {
    out[name] = painter.paint(name);
    out[name + "-m"] = painter.paint(name + "-m");
  });

  return out;
}

/**
 * An icon of the samples (art.js) as SVG, in colour or in one colour, from
 * the same drawing:
 *
 * - in colour, a sticker: every layer outlined in ink all round, its pieces
 *   in their colours, its tones over them - kept within its pieces - a
 *   thinner ink line where piece meets piece, and its lines and marks;
 * - in one colour, currentColor: the pieces solid, cut apart where they
 *   meet, the windows and the lenses and the lines and the ink marks cut
 *   out, and a gap round every layer over the one under it - to be outlined
 *   and lit by the page (icon-float).
 *
 * ids, for the masks and clips, start with the id given, so that one page
 * can show many.
 */
import { INK } from "./art.js";

//how far the ink reaches out round a layer, and how thick a line between
//its pieces is - on the 64 artboard
var OUT = 3,
  SEAM = 1.8;

function path(d, attrs) {
  return '<path d="' + d + '"' + (attrs || "") + "/>";
}

function strokes(lines, colour) {
  return lines
    .map(function (l) {
      return path(
        l[0],
        ' fill="none" stroke="' +
          (colour || l[2] || INK) +
          '" stroke-width="' +
          l[1] +
          '" stroke-linecap="round" stroke-linejoin="round"' +
          (l[3] ? ' stroke-dasharray="' + l[3] + '"' : ""),
      );
    })
    .join("");
}

//the colours as at night: painted darker and bluer, what is glass lit
var LIT = { "#8fd4f7": "#ffd76a", "#e2f6ff": "#fff4c2" };

function night(c) {
  var m = /^#([0-9a-f]{6})$/i.exec(c);

  if (c === INK || !m) return c;
  if (LIT[c]) return LIT[c];

  var v = parseInt(m[1], 16);

  return (
    "rgb(" +
    Math.round((v >> 16) * 0.5 + 6) +
    "," +
    Math.round(((v >> 8) & 255) * 0.54 + 10) +
    "," +
    Math.round((v & 255) * 0.72 + 30) +
    ")"
  );
}

function day(c) {
  return c;
}

function colourLayer(layer, id, tint) {
  var pieces = (layer.pieces || []).map(function (p) {
      return [p[0], tint(p[1]), p[2]];
    }),
    clip = id + "c";

  layer = {
    shade: (layer.shade || []).map(function (p) {
      return [p[0], tint(p[1])];
    }),
    lines: (layer.lines || []).map(function (l) {
      return [l[0], l[1], l[2] ? tint(l[2]) : l[2], l[3]];
    }),
    marks: (layer.marks || []).map(function (m) {
      return [m[0], tint(m[1])];
    }),
  };

  return (
    '<clipPath id="' +
    clip +
    '">' +
    pieces
      .map(function (p) {
        return path(p[0]);
      })
      .join("") +
    "</clipPath>" +
    '<g fill="' +
    INK +
    '" stroke="' +
    INK +
    '" stroke-width="' +
    OUT * 2 +
    '" stroke-linejoin="round">' +
    pieces
      .map(function (p) {
        return path(p[0]);
      })
      .join("") +
    "</g>" +
    pieces
      .map(function (p) {
        return path(p[0], ' fill="' + p[1] + '"');
      })
      .join("") +
    '<g clip-path="url(#' +
    clip +
    ')">' +
    (layer.shade || [])
      .map(function (s) {
        return path(s[0], ' fill="' + s[1] + '"');
      })
      .join("") +
    "</g>" +
    '<g fill="none" stroke="' +
    INK +
    '" stroke-width="' +
    SEAM +
    '" stroke-linejoin="round">' +
    pieces
      .map(function (p) {
        return path(p[0]);
      })
      .join("") +
    "</g>" +
    strokes(layer.lines || []) +
    (layer.marks || [])
      .map(function (m) {
        return path(m[0], ' fill="' + m[1] + '"');
      })
      .join("")
  );
}

function monoLayer(layer) {
  var pieces = layer.pieces || [];

  return (
    '<g fill="black" stroke="black" stroke-width="' +
    OUT * 2 +
    '" stroke-linejoin="round">' +
    pieces
      .map(function (p) {
        return path(p[0]);
      })
      .join("") +
    "</g>" +
    pieces
      .map(function (p) {
        return path(
          p[0],
          ' fill="' + (p[2] === "hole" ? "black" : "white") + '"',
        );
      })
      .join("") +
    '<g fill="none" stroke="black" stroke-width="' +
    SEAM * 1.25 +
    '" stroke-linejoin="round">' +
    pieces
      .map(function (p) {
        return path(p[0]);
      })
      .join("") +
    "</g>" +
    strokes(layer.lines || [], "black") +
    (layer.marks || [])
      .filter(function (m) {
        return m[1] === INK;
      })
      .map(function (m) {
        return path(m[0], ' fill="black"');
      })
      .join("")
  );
}

/**
 * @param art {Object[]} the icon's layers (art.js)
 * @param mono {boolean} in one colour, currentColor - or else in colour
 * @param id {string} what its masks' and clips' ids start with
 * @param [dark] {boolean} in colour, as at night
 */
export function render(art, mono, id, dark) {
  var body;

  if (mono)
    body =
      '<mask id="' +
      id +
      'm" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">' +
      '<rect width="64" height="64" fill="black"/>' +
      art.map(monoLayer).join("") +
      "</mask>" +
      '<rect width="64" height="64" fill="currentColor" mask="url(#' +
      id +
      'm)"/>';
  else
    body = art
      .map(function (layer, i) {
        return colourLayer(layer, id + i, dark ? night : day);
      })
      .join("");

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    body +
    "</svg>"
  );
}

//how far apart a layer drawn for one colour stands from those under it
var GAP = 3;

/**
 * An icon drawn for one colour (mono.js), in currentColor: every layer its
 * solid, its holes, the lines cut through it and the ones drawn on it - and
 * a gap round it, cut out of the layers under it, where it says so.
 */
export function renderMono(art, id) {
  var body = art
    .map(function (layer) {
      var solid = layer.solid || [];

      return (
        (layer.gap
          ? '<g fill="black" stroke="black" stroke-width="' +
            GAP * 2 +
            '" stroke-linejoin="round">' +
            solid
              .map(function (d) {
                return path(d);
              })
              .join("") +
            "</g>"
          : "") +
        '<g fill="white" fill-rule="evenodd">' +
        solid
          .map(function (d) {
            return path(d);
          })
          .join("") +
        "</g>" +
        '<g fill="black" fill-rule="evenodd">' +
        (layer.holes || [])
          .map(function (d) {
            return path(d);
          })
          .join("") +
        "</g>" +
        (layer.cuts || [])
          .map(function (c) {
            return path(
              c[0],
              ' fill="none" stroke="black" stroke-width="' +
                c[1] +
                '" stroke-linejoin="round" stroke-linecap="' +
                (c[2] ? "butt" : "round") +
                '"' +
                (c[2] ? ' stroke-dasharray="' + c[2] + '"' : ""),
            );
          })
          .join("") +
        (layer.strokes || [])
          .map(function (c) {
            return path(
              c[0],
              ' fill="none" stroke="white" stroke-width="' +
                c[1] +
                '" stroke-linejoin="round" stroke-linecap="round"',
            );
          })
          .join("")
      );
    })
    .join("");

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<mask id="' +
    id +
    'm" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">' +
    '<rect width="64" height="64" fill="black"/>' +
    body +
    "</mask>" +
    '<rect width="64" height="64" fill="currentColor" mask="url(#' +
    id +
    'm)"/></svg>'
  );
}

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

function colourLayer(layer, id) {
  var pieces = layer.pieces || [],
    clip = id + "c";

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
 */
export function render(art, mono, id) {
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
        return colourLayer(layer, id + i);
      })
      .join("");

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    body +
    "</svg>"
  );
}

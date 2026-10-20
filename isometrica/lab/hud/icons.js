/**
 * The game's own icons, where Lucide has none fit: drawn the way Lucide's
 * are, to stand among them - on a 24 grid, within 2 of its edge, lines 2
 * wide with round ends and joins, no fills, a corner rounded by 1 to 3.
 */
import { createLucideIcon } from "lucide-react";

function icon(name, node) {
  return createLucideIcon(
    name,
    node.map(function (n, i) {
      return [n[0], Object.assign({ key: name + i }, n[1])];
    }),
  );
}

//a road going off ahead, its middle line dashed
export var Road = icon("road", [
  ["path", { d: "M4 21 9 3" }],
  ["path", { d: "M20 21 15 3" }],
  ["path", { d: "M12 4v2" }],
  ["path", { d: "M12 10v3" }],
  ["path", { d: "M12 17v4" }],
]);

//a bulldozer from the side, going right: its tracks round two wheels, the
//cab over the back of them, the blade held out ahead, its edge to the ground
export var Bulldozer = icon("bulldozer", [
  ["circle", { cx: "4", cy: "18", r: "2" }],
  ["circle", { cx: "14", cy: "18", r: "2" }],
  ["path", { d: "M4 16h10" }],
  ["path", { d: "M4 20h10" }],
  ["path", { d: "M5 16v-3a1 1 0 0 1 1-1h9v4" }],
  ["path", { d: "M7 12V6a1 1 0 0 1 1-1h2.5a1 1 0 0 1 .95.68L13.5 12" }],
  ["path", { d: "M16 18h3" }],
  ["path", { d: "M19 11v6a3 3 0 0 0 3 3" }],
]);

//a plot of land, as Lucide's land-plot has it, a sign up on it for sale
export var LandSale = icon("land-sale", [
  ["rect", { x: "5", y: "2", width: "14", height: "7", rx: "1.5" }],
  ["path", { d: "M12 9v3" }],
  [
    "path",
    {
      d: "m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12",
    },
  ],
  ["path", { d: "m6.49 12.85 11.02 6.3" }],
  ["path", { d: "M17.51 12.85 6.5 19.15" }],
]);

import Config from "../config";
import engine from "engine";
import View from "../view";

function Script() {
  engine.Component.call(this);
}

Script.prototype = Object.create(engine.Component.prototype);

Script.prototype.setHiliteData = function (hiliteData) {
  var r = this.gameObject.renderer,
    t = this.gameObject.transform;

  r.x = hiliteData.x;
  r.y = hiliteData.y;
  r.fillColor = hiliteData.fillColor;
  r.borderColor = hiliteData.borderColor;

  if (hiliteData.borderWidth !== undefined)
    r.borderWidth = hiliteData.borderWidth;

  r.borderDash = hiliteData.borderDash || null;

  //which way it points as drawn, the world turned (see client/view)
  r.arrow = hiliteData.arrow
    ? View.vector(hiliteData.arrow[0], hiliteData.arrow[1])
    : null;
  r.square = hiliteData.square === true;

  if (hiliteData.markerColor !== undefined)
    r.markerColor = hiliteData.markerColor;

  var terrain = vkaria.core.world.terrain;
  var type = terrain.getTerrainType(r.x, r.y);

  //its corners as the tile is drawn, the world turned (see client/view)
  var d = View.point(r.x, r.y),
    gps = [
      View.gridHeight(terrain, d[0], d[1]),
      View.gridHeight(terrain, d[0] + 1, d[1]),
      View.gridHeight(terrain, d[0], d[1] + 1),
      View.gridHeight(terrain, d[0] + 1, d[1] + 1),
    ];
  var zStep = Config.tileZStep;

  //water is drawn flat at its surface, but shaping the ground means shaping
  //the bottom - so a hilite that asks for it follows the ground underneath
  if (type === 0 && hiliteData.underwater === true) type = -1;

  //where the tile itself is drawn (see client Terrain) - worked out rather
  //than read off it, since a hilite may well go on a tile that is not drawn:
  //one reaching past the edge of what is loaded, or left behind while the
  //map was panned away
  t.setPosition(
    d[0] * Config.tileSize,
    type === 0 ? 0 : gps[2] * zStep,
    d[1] * Config.tileSize,
  );

  if (type === 0) {
    r.points[0][1] = 0;
    r.points[1][1] = 0;
    r.points[2][1] = 0;
    r.points[3][1] = 0;
  } else {
    r.points[0][1] = (gps[0] - gps[2]) * zStep;
    r.points[1][1] = (gps[2] - gps[2]) * zStep;
    r.points[2][1] = (gps[3] - gps[2]) * zStep;
    r.points[3][1] = (gps[1] - gps[2]) * zStep;
  }
};

export default Script;

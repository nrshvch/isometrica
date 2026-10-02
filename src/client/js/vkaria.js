//TODO fix dissapearing saved buildings
//TODO fix road build on slopes
//TODO path finding using waypoints on tiles.

//    var Core = require("core/main"),
import engine from "engine";
import BuildMan from "./buildman";
import TilesMan from "./tilesman";
import HiliteMan from "./hiliteman";
import PathMan from "./pathfinding/pathman";
import CameraScript from "./components/camerascript";
import RenderLayer from "client/renderlayer";
import Terrain from "./terrain";
import EnvMan from "./envman";
import ChunkMan from "./chunkman";
import Cityman from "./cityman";
import Roadman from "./roadman";
import ServiceMan from "./serviceman";
import Landman from "./landman";
import Terrainman from "./terrainman";
import CameraControl from "./cameracontrol";
import Player from "./player";
import CameraMan from "./cameraman";
import Carman from "./carman";
import SpriteCache from "./spritecache";
import Config from "./config";
import View from "./view";

function Vkaria(core, ui, callback) {
  // Vkaria is not trully isometric, it's dimetric with 2:1 ratio (Transport Tycoon used this).
  // It means, that when point goes about 1px by X, it moves 1/2 pixel by Y.
  // We can calculate camera angle around X axis like this: Math.asin(1/2)*180/Math.PI = 30deg, where 1/2 is our
  // x to y ratio.
  // Distance between tiles in 3D space can be calculated like this:
  // 1/cos(45)*TILE_WIDTH/2 = 45.255 , where 45deg angle is rotation about Y axis.

  //Tile Z is amount of how much units tile should be elevated in one step by z axis.
  //it's calculated: tileZStep = x/cos(30deg); where x is height of elevation step on image, in pixels,
  //and 30deg angle - is pitch angle of camera

  //register itself in global namespace
  window.isometrica = window.vkariaApp = window.vkaria = this;

  //start game logic
  this.core = core; //new Core.CoreInterface();   //rename to core
  this.ui = ui;

  //TODO there should be renderer layers and logical layers, and tags too
  //configure layers (render layers)
  vkaria.layers = RenderLayer;
  engine.Config.layersCount = Object.keys(RenderLayer).length;
  engine.Config.noLayerDepthSortingMask = 3;
  engine.Config.noLayerClearMask = 0;

  //init engine
  this.game = new engine.Game();

  //every picture there is, by name - see prepare. What is on screen is kept
  //on a few big canvases, and what has gone unseen longest is put away from
  //there first, going by the frames the game counts
  this.sprites = new SpriteCache(this.game.time);
  //what was worked out painting the pictures the game paints for itself
  this.generated = null;

  this.hiliteMan = new HiliteMan(this);
  this.buildman = new BuildMan(this);
  this.tilesman = new TilesMan(this);
  this.terrain = new Terrain(this);
  this.envman = new EnvMan(this);
  this.chunkman = new ChunkMan(this);
  this.cityman = new Cityman(this);
  this.roadman = new Roadman(this);
  this.serviceman = new ServiceMan(this);
  this.landman = new Landman(this);
  this.terrainman = new Terrainman(this);
  this.pathman = new PathMan();
  this.carman = new Carman(this);
  this.cameraControl = new CameraControl(this);
  this.cameraman = new CameraMan(this);

  this.player = new Player(this);
}

/**
 * Gets every picture ready to be drawn by name, and starts the game once it
 * is: the hand-drawn ones are listed in gfx/manifest.json and load as they
 * are first drawn; the ones the game paints for itself - the ground, the
 * cars, the stones - are listed with their sizes by what each generator
 * described at build time, and are painted as they are first drawn, off the
 * main thread (client/generator). Nothing is painted before the game starts.
 */
Vkaria.prototype.prepare = function (callback) {
  var self = this;

  this.sprites
    .load()
    .then(
      function () {
        self.generated = self.sprites.generated;
      },
      //the game goes on without whatever is missing, and draws nothing for it
      function (e) {
        console.error("Sprites not ready:", e);
      },
    )
    .then(function () {
      callback && callback();
    });
};

/**
 * Turns the world round under the camera by so many quarter turns, clockwise
 * as seen from above for more than 0 (see client/view) - about the ground in
 * the middle of the screen, which stays there. Not while an action owns the
 * world: what it has drawn on the ground stays where it was drawn.
 *
 * @param by {number}
 */
Vkaria.prototype.turnView = function (by) {
  if (this.ui.gameScreen().worldScreen().busy()) return;

  var transform = this.camera.transform,
    pos = transform.getPosition(),
    ts = Config.tileSize,
    world = View.unpoint(pos[0] / ts, pos[2] / ts);

  View.setTurns(View.turns() + by);

  var at = View.point(world[0], world[1]);

  transform.setPosition(at[0] * ts, pos[1], at[1] * ts);
};

Vkaria.prototype.start = function () {
  this.camera = new engine.Camera("mainCamera");
  this.camera.addComponent(new CameraScript());
  this.game.scene.addGameObject(this.camera);

  this.game.run();
};

Vkaria.prototype.startServices = function () {
  this.pathman.start();
  this.buildman.start();
  this.tilesman.start();
  this.terrain.init();
  this.chunkman.init();
  this.envman.init();

  //everything that watches building views comes up before anything that can
  //make one. tilesman streams chunks the moment the camera moves, and the
  //camera moves while the client is still starting - cityman puts it on the
  //city it just loaded - so a listener that starts after that misses the
  //whole city. They all catch up on what is already there as well, so the
  //order below is no longer the only thing holding this together.
  this.roadman.init();
  this.serviceman.init();
  this.landman.init();

  //moves the camera onto a loaded city, which streams that city's chunks in
  this.cityman.init();

  //and this puts up the views for a city standing in chunks that were loaded
  //before anybody was listening for them
  this.buildman.init();

  this.cameraControl.init();

  this.carman.init();
};

/**
 * engine.Game instance
 * @type {Game}
 */
Vkaria.prototype.game = null;

export default Vkaria;

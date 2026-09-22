//TODO fix dissapearing saved buildings
//TODO fix road build on slopes
//TODO path finding using waypoints on tiles.

//    var Core = require("core/main"),
import engine from "engine/main";
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
    this.core = core;//new Core.CoreInterface();   //rename to core
    this.ui = ui;

    //TODO there should be renderer layers and logical layers, and tags too
    //configure layers (render layers)
    vkaria.layers = RenderLayer;
    engine.Config.layersCount = Object.keys(RenderLayer).length;
    engine.Config.noLayerDepthSortingMask = 3;
    engine.Config.noLayerClearMask = 0;

    //assets
    this.assets = new engine.AssetManager();
    this.sprites = new SpriteCache(this.assets);

    //init engine
    this.game = new engine.Game();

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

Vkaria.prototype.prepare = function(callback){
    //preload assets and, when done, start game
    var self = this;

    //todo: use promises
    //прелоадинг ресурсов не нужен, т.к. идея прелоадинга идёт в разрез с идеей того, чтобы загружать ресурсы по мере необходимисти, а не все сразу.
    //Try to load spritesheet. If it is not available, then start game anyway, it will then use sprites each separately.
    //FF won't run game before any resource is ready. Empty "new Image()" shim is not helpful.
    this.assets.getAsset("gfx/spritesheet.json", engine.AssetManager.Resource.ResourceTypeEnum.json).done(function (resourceJSON) {
        if (resourceJSON.state === resourceJSON.constructor.ResourceStateEnum.ready) {
            self.assets.getAsset("gfx/spritesheet.png", engine.AssetManager.Resource.ResourceTypeEnum.image).done(function (resourceImage) {
                self.sprites.setSpritesheet(resourceJSON.data.frames, resourceImage.data);
                //self.start();
                callback && callback();
            });
        } else {
            //self.start();
            callback && callback();
        }
    });
};

Vkaria.prototype.start = function () {
    this.camera = new engine.Camera("mainCamera");
    this.camera.addComponent(new CameraScript());
    this.game.scene.addGameObject(this.camera);

    this.game.run();
};

Vkaria.prototype.startServices = function(){
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

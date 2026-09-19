import engine from "engine/main";
import LandBlockRenderer from "../components/landblockrenderer";

/**
 * One block of land offered for sale: an outlined, tinted patch of ground.
 *
 * @param terrain {Terrain} core terrain, for grid point heights
 * @param block {Object} block descriptor from CityService.Area
 */
function LandBlock(terrain, block) {
    engine.GameObject.call(this, "landBlock");

    this.block = block;
    this.areaRenderer = this.addComponent(new LandBlockRenderer(terrain, block));
}

LandBlock.prototype = Object.create(engine.GameObject.prototype);

LandBlock.prototype.block = null;
LandBlock.prototype.areaRenderer = null;

/**
 * Takes the block off screen without dropping it, for when another action is
 * using the world view.
 *
 * @param enabled {boolean}
 */
LandBlock.prototype.renderersEnabled = function (enabled) {
    this.areaRenderer.enabled = enabled;
};

export default LandBlock;

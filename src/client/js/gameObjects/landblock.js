import engine from "engine/main";
import LandBlockRenderer from "../components/landblockrenderer";
import RenderLayer from "../renderlayer";

/**
 * One block of land offered for sale: an outlined, tinted patch of ground with
 * its price written across the middle of it.
 *
 * The price is a child of the block, so it is placed wherever the block is and
 * goes when the block goes.
 *
 * @param terrain {Terrain} core terrain, for grid point heights
 * @param block {Object} block descriptor from CityService.Area
 */
function LandBlock(terrain, block) {
    engine.GameObject.call(this, "landBlock");

    this.block = block;
    this.areaRenderer = this.addComponent(new LandBlockRenderer(terrain, block));

    var label = new engine.GameObject("landPrice"),
        text = label.addComponent(new engine.TextRenderer());

    //written the way everything else over the terrain is - see citylabel and
    //the floating costs - only in the colour of money
    text.layer = RenderLayer.overlayLayer;
    text.style = "bold 16px Courier New";
    text.color = "rgb(255,220,0)";
    text.strokeStyle = "black";
    text.lineWidth = 4;
    text.text = "";

    this.transform.addChild(label.transform);
    label.transform.setLocalPosition(0, 0, 0);

    this.priceRenderer = text;
}

LandBlock.prototype = Object.create(engine.GameObject.prototype);

LandBlock.prototype.block = null;
LandBlock.prototype.areaRenderer = null;
LandBlock.prototype.priceRenderer = null;

/**
 * @param text {string} what the block costs, as the player should read it
 */
LandBlock.prototype.setPrice = function (text) {
    this.priceRenderer.text = text;
};

/**
 * Takes the block off screen without dropping it - while one block's purchase
 * is being confirmed, the others step aside.
 *
 * @param enabled {boolean}
 */
LandBlock.prototype.renderersEnabled = function (enabled) {
    this.areaRenderer.enabled = enabled;
    this.priceRenderer.enabled = enabled;
};

export default LandBlock;

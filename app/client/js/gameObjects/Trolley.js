import engine from "engine/main";
import TrolleyScript from "../components/entity";
import SmokeSource from "../components/smokesource";
import RenderLayer from "client/renderlayer";

function Trolley() {
    engine.GameObject.call(this);

    var sprite = this.sprite = new engine.SpriteRenderer();
    sprite.layer = RenderLayer.vehiclesLayer;

    sprite.setSprite(vkaria.sprites.getSprite("trolley0.png"));

    sprite.pivotX = 16;
    sprite.pivotY = 16;


    this.addComponent(sprite);
    this.entity = this.addComponent(new TrolleyScript);


    var g = new engine.GameObject();
    this.transform.addChild(g.transform);
    g.transform.setLocalPosition(0,0,0);
    g.addComponent(new SmokeSource());
}
Trolley.prototype = Object.create(engine.GameObject.prototype);

export default Trolley;

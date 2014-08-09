define(function (require) {
    var engine = require("engine");
    var Bren = require("../components/cityborderrenderer");
        //CityScript = require("../cityscript");

    function CityLabel(label){
        engine.GameObject.call(this, "city");

        var text = this.addComponent(new engine.TextRenderer());
        text.layer = vkaria.layers.overlayLayer;
        text.text = label;
        text.style = "normal 16px arial";


        var b = new engine.GameObject("border");
        b.addComponent(new Bren());
        this.transform.addChild(b.transform);
        b.transform.setLocalPosition(0,0,0);


        //this.cityScript = this.addComponent(new CityScript(x,y));
    }

    CityLabel.prototype = Object.create(engine.GameObject.prototype);

    return CityLabel;
});
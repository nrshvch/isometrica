define(function (require) {
    var engine = require("engine");
        //CityScript = require("../cityscript");

    function CityLabel(label){
        engine.GameObject.call(this, "city");

        var text = this.addComponent(new engine.TextRenderer());
        text.layer = vkaria.layers.overlayLayer;;
        text.text = label;
        text.style = "normal 16px arial";

        //this.cityScript = this.addComponent(new CityScript(x,y));
    }

    CityLabel.prototype = Object.create(engine.GameObject.prototype);

    return CityLabel;
});
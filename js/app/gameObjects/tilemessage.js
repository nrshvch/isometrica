define(function (require) {
    var engine = require("engine"),
        EvaporatingText = require("../components/EvaporatingText");
        //CityScript = require("../cityscript");

    function TileMessage(text, color){
        engine.GameObject.call(this, "tileMessage");



        this.addComponent(new EvaporatingText(text, color));

        //this.cityScript = this.addComponent(new CityScript(x,y));
    }

    TileMessage.prototype = Object.create(engine.GameObject.prototype);

    return TileMessage;
});
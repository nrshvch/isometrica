import Backbone from "backbone";

//a city id in the address bar, as in /#/pA4b1c
var CITY_ID = /^\/?([0-9A-Za-z]{6})\/?$/;

function cityId(path) {
    var match = CITY_ID.exec(path || "");
    return match === null ? null : match[1];
}

var Router = Backbone.Router.extend({
    initialize: function(options){
        this.ui = options.ui;
    },
    routes: {
        "*path": "root"
    },
    root: function(path){
        var id = cityId(path);

        //changing the id in the address bar asks for another city, and the
        //world is only ever put together once, on the way up - so the page
        //goes up again on the city that was asked for
        if (this.ui.client() !== null && id !== this.ui.cityId())
            return this.ui.reopen(id);

        //which city to open is settled before the game starts, so it is put
        //away here and picked up by the game screen on its way up
        this.ui.cityId(id);
        this.ui.navigate("world");
    }
});

Router.cityId = cityId;

export default Router;

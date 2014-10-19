define(function (require) {
    var Backbone = require("backbone");

    var Router = Backbone.Router.extend({
        initialize: function(options){
            this.ui = options.ui;
        },
        routes: {
            "build/:id": "build",
            "catalogue(/:cat)(/:id)" : "catalogue",
            "(world)(/:nav)": "world"
        },
        build: function(bid){
            this.ui.show("game");
            this.ui.gameScreen().execute("build", arguments);
        },
        world: function(nav){
            this.ui.show("game");
            this.ui.gameScreen().execute("world", arguments);
        },
        catalogue: function(catId, buildingId){
            this.ui.show("game");
            this.ui.gameScreen().execute("catalogue", arguments);
        }
    });

    return Router;
});
define(function (require) {
    var Backbone = require("backbone");

    var Router = Backbone.Router.extend({
        initialize: function(options){
            this.ui = options.ui;
        },
        routes: {
            "build/:id": "build",
            "catalogue(/:cat)(/:id)" : "catalogue",
            "city(/:id)(/:tab)" : "city",
            "(world)(/:nav)": "world",
            "destroy" : "destroy"
        },
        build: function(){
            this.ui.show("game");
            this.ui.gameScreen().execute("build", arguments);
        },
        world: function(){
            this.ui.show("game");
            this.ui.gameScreen().execute("world", arguments);
        },
        catalogue: function(){
            this.ui.show("game");
            this.ui.gameScreen().execute("catalogue", arguments);
        },
        destroy: function(){
            this.ui.show("game");
            this.ui.gameScreen().execute("destroy");
        },
        city: function(){
            this.ui.show("game");
            this.ui.gameScreen().execute("city", arguments)
        }
    });

    return Router;
});
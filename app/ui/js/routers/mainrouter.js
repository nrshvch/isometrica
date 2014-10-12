define(function (require) {
    var Backbone = require("backbone");

    var Router = Backbone.Router.extend({
        initialize: function(options){
            this.ui = options.ui;
        },
        routes: {
            "game/build/:id": "build",
            "game/buildings": "catalogue",
            "game/buildings/:cat": "category",
            "game/buildings/:cat/:id" : "building",
            "(game)(/world)(/:nav)": "world",
        },
        world: function(nav){
            this.ui.show("game");
            this.ui.gameScreen().init(function(gs){
                gs.show("world");
                gs.worldScreen().show(nav || "main");
            });
        },
        catalogue: function(){
            this.ui.show("game");
            this.ui.gameScreen().init(function(gs){
                gs.show("catalogue");
            });
        },
        category: function(catId){
            this.ui.show("game");
            this.ui.gameScreen().init(function(gs) {
                gs.show("category").show(catId);
            });
        }
        /*
        default: function(){
            this.world();
        },
        buildings: function(cat, id){
            this.ui.show("game");
            this.ui.game().show("buildings");
            //this.ui.game().buildings().show(cat, id);
            //this.ui.game().show("buildings");
            //this.ui.show("game");
            //this.ui.show("game").show("buildings").show(cat, id);
            //this.ui.show("game", ["buildings",cat,id]);
        },
        build: function(id){

        },
        world: function(nav){
            var world = this.ui.show("game").show("world").show(nav || "main");
        }*/
    });

    return Router;
});
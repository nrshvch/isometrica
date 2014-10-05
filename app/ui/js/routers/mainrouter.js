define(function (require) {
    var Backbone = require("backbone");

    var Router = Backbone.Router.extend({
        initialize: function(options){
            this.ui = options.ui;
        },
        routes: {
            "": "default",
            "(game(/world))": "default",
            "game/buildings": "buildings"
        },
        default: function(){
            this.ui.show("game").show("world").show("main");
        },
        buildings: function(){
            this.ui.show("game").show("buildings");
        }
    });

    return Router;
});
define(function(require){
   var Backbone = require("backbone");
    var templates = require("../templates");
    var template = templates["buildingcategorylistitem"];

    return Backbone.View.extend({
        initialize: function(options){
            this.options = options || {};

            var ui = this.options.ui;
            //ui.router.on("route")

            this.setElement(template());
        }
    });
});
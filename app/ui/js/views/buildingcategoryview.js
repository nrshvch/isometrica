/**
 * Created by denis on 10/6/14.
 */
define(function(require){
    var Backbone = require("backbone");
    var templates = require("../templates");
    var template = templates["buildings"];

    var View = Backbone.View.extend({
        initialize: function(options){
            this.ui = options.ui;
            this.setElement(template());
        },
        show: function(catId){
            console.log("show category", catId);
        }
    });

    return View;
});

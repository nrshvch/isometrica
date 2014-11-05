define(function(require){
    var Backbone = require("backbone");

    return Backbone.View.extend({
        tagName: "span",
        initialize: function(options){
            this.options = options || {};
        }
    });
});
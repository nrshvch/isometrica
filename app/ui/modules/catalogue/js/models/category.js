define(function(require){
   var Backbone = require("backbone");
    var Buildings = require("../collections/buildings");

    return Backbone.Model.extend({
        initialize: function(){
            this.buildings = new Buildings()
        },
        defaults: function(){
            return {
                code: -1,
                displayName: "Unnamed"
            }
        }
    });
});
define(function(require){
   var Backbone  = require("backbone");

    return Backbone.Model.extend({
        defaults: function(){
            return {
                icon: null,
                value: "-",
                title: ""
            }
        }
    });
});
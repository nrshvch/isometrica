define(function(require){
   var Backbone = require("backbone");

    return Backbone.Model.extend({
       defaults: function(){
           return {
               name: "Unnamed",
               code: -1
           }
       }
    });
});
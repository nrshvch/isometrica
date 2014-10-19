define(function(require){
   var Backbone = require("backbone");
    var Building = require("../models/building");

    return Backbone.Collection.extend({
       model: Building,
    });
});
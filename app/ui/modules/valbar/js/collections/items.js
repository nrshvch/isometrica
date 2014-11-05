define(function(require){
    var Backbone  = require("backbone");
    var Item = require("../models/item");

    return Backbone.Collection.extend({
        model: Item
    });
});
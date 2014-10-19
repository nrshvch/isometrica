define(function(require){
    var Backbone = require("backbone");
    var Category = require("../models/category");

    return Backbone.Collection.extend({
       model: Category
    });
});
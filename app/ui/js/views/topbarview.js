define(function(require){
  var Backbone = require("backbone");
  var templates = require("../templates");
  var template = templates["topbar"];

  var View = Backbone.View.extend({
    initialize: function(options){
      this.setElement(template());
    }
  });

  return View;
});

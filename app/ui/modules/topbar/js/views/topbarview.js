define(function(require){
  var Backbone = require("backbone");
  var templates = require("ui/js/templates");
  var template = templates["topbar/topbar"];

  var View = Backbone.View.extend({
    initialize: function(options){
      this.setElement(template());
    }
  });

  return View;
});

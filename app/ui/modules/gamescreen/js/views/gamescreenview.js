define(function(require) {
  var Backbone = require("backbone");
  var templates = require("ui/js/templates");
  var template = templates["gamescreen/gamelayout"];

  var View = Backbone.View.extend({
    initialize: function(options) {
      this.setElement(template());
      this._$head = $(".head-slot", this.el);
      this._$body = $(".body-slot", this.el);
    },
    head: function(view){
      this._$head.empty();
      this._$head.append(view.el);
    },
    body: function(view){
      this._$body.empty();
      this._$body.append(view.el);
    }
  });
  return View;
});

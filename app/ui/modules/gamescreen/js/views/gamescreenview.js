import Backbone from "backbone";
import __templateSource from "../../templates/gamelayout.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var template = Handlebars.compile(__templateSource);

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
export default View;

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
  //what was in a slot is only detached: the views are kept and put back in
  //time and again - the same one straight back, opening the city screen
  //from the top bar while it is open - and taken out with empty() they
  //would lose every listener bound in them
  head: function(view){
    this._$head.children().detach();
    this._$head.append(view.el);
  },
  body: function(view){
    this._$body.children().detach();
    this._$body.append(view.el);
  }
});
export default View;

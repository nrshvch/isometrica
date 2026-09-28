import Backbone from "backbone";
import __templateSource from "../../templates/info.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var template = Handlebars.compile(__templateSource);

export default Backbone.View.extend({
  initialize: function () {
    this.setElement(template(this.model.toJSON()));

    //the model is worked out again every tick the city updates
    this.listenTo(this.model, "change", function () {
      this.render();
    });
  },
  render: function () {
    this.$el.html($(template(this.model.toJSON())).html());

    return this;
  },
});

import Backbone from "backbone";
import __templateSource from "../templates/splash.hbs?raw";
import Handlebars from "handlebars";
//the game's version, as its package.json has it
import { version } from "../../../../../package.json";

var template = Handlebars.compile(__templateSource);

var View = Backbone.View.extend({
  initialize: function (options) {
    this.options = options || {};
    this.setElement(document.createDocumentFragment());
  },
  render: function () {
    this.$el.append(template({ version: version }));
    return this;
  },
});

export default View;

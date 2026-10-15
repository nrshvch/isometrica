import Backbone from "backbone";
import __templateSource from "../templates/splash.hbs?raw";
import Handlebars from "handlebars";

var template = Handlebars.compile(__templateSource);

var View = Backbone.View.extend({
  initialize: function (options) {
    this.options = options || {};
    this.setElement(document.createDocumentFragment());
  },
  render: function () {
    //the release's version, or "dev" and the commit (vite.config.js)
    this.$el.append(template({ version: __VERSION__ }));
    return this;
  },
});

export default View;

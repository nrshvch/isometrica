import Backbone from "backbone";
import __templateSource from "../../templates/map.hbs?raw";
import Handlebars from "handlebars";

var template = Handlebars.compile(__templateSource);



export default Backbone.View.extend({
    initialize: function (options) {
        this.setElement(template());
    },
    render: function () {

    },
});

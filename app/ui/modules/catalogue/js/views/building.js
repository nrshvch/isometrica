/**
 * Created by denis on 10/6/14.
 */
import Backbone from "backbone";
import __templateSource from "../../templates/building.hbs?raw";
import Handlebars from "handlebars";

var template = Handlebars.compile(__templateSource);

var View = Backbone.View.extend({
    initialize: function (options) {
        var fragment = document.createDocumentFragment();
        this.setElement(fragment);
    },
    render: function () {
        this.$el.append(template({
            building: this.model.toJSON()
        }));
        return this;
    }
});

export default View;

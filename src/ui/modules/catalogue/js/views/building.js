/**
 * Created by denis on 10/6/14.
 */
import Backbone from "backbone";
import __templateSource from "../../templates/building.hbs?raw";
import Handlebars from "handlebars";

var template = Handlebars.compile(__templateSource);

var View = Backbone.View.extend({
    initialize: function (options) {
        this.catalogue = options.catalogue;

        var fragment = document.createDocumentFragment();
        this.setElement(fragment);
    },
    render: function () {
        var self = this;

        this.$el.append(template({
            building: this.model.toJSON()
        }));

        // this view's root is a DocumentFragment: once it's appended into the
        // catalogue container its children are moved out and become the real
        // subtree, so events bound via Backbone's delegated `events` hash on
        // the (now empty) fragment would never fire. Bind directly instead.
        this.$(".button.back").on("click", function () {
            self.catalogue.execute();
        });
        this.$(".button.build").on("click", function () {
            self.catalogue.ui.navigate("build", [self.model.get("code")]);
        });

        return this;
    }
});

export default View;

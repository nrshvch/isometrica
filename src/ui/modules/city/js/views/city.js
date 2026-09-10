import Backbone from "backbone";
import __templateSource from "../../templates/city.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var cityTemplate = Handlebars.compile(__templateSource);

export default Backbone.View.extend({
    tagName: "span",
    events: {
        "click .tab": function (e) {
            var id = $(e.target).attr("data-tab");
            this.show(id);
        },
        "click .button.close": function () {
            this.ui.navigate("world");
        }
    },
    initialize: function (options) {
        this.ui = options.ui;
        this.tabs = {};
    },
    render: function () {
        // this view is a cached singleton (see city.js Module#mainView) that
        // gets detached and re-appended each time the dialog is opened;
        // GameScreenView#body() removes the previous screen with jQuery's
        // .empty(), which strips all bound listeners from it (including
        // Backbone's delegated `events`) even though we're about to reuse
        // it, so they need to be rebound on every render.
        this.delegateEvents();

        this.$el.html(cityTemplate({
            tabs: this.tabs
        }));
        for (var name in this.tabs) {
            var view = this.tabs[name];
            var el = $(".tab-content[data-tab=" + name + "]", this.$el);
            el.empty();
            el.append(view.el);
        }
        return this;
    },
    show: function (name) {
        if(this.tabs[name] === undefined)return;

        this.tabs[name].render();
        $(".tab, .tab-content", this.$el).removeClass("active");
        $(".tab[data-tab=" + name + "], .tab-content[data-tab=" + name + "]", this.$el).addClass("active");
    },
    addTab: function (name, view) {
        this.tabs[name] = view;
    }
});

define(function (require) {
    var Backbone = require("backbone");
    var cityTemplate = require("hbs!../../templates/city");

    return Backbone.View.extend({
        tagName: "span",
        events: {
            "click .tab": function (e) {
                var id = $(e.target).attr("data-tab");
                this.show(id);
            }
        },
        initialize: function (options) {
            this.ui = options.ui;
            this.tabs = {};
        },
        render: function () {
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
            this.ui.navigate("city/0/"+name, false);
        },
        addTab: function (name, view) {
            this.tabs[name] = view;
        }
    });
});
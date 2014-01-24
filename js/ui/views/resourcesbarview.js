define(function (require) {
    require("backbone");

    var templateText = require("text!templates/resourcesbar.html"),
        ResourceCode = require("lib/resourcecode"),
        template = $.parseHTML(templateText),
        itemTemplate = $(".item", template),
        Numeral = require("numeral");

    $(".items", template).empty();

    var View = Backbone.View.extend({
        initialize: function (options) {
            this.render();
            if(options){
                options.resources && this.setResources(options.resources);
                this.hideZeros = options.hideZeros || false;
                this.hideMask = options.hideMask || 0;
            }
        },
        render: function () {
            var node = $(template).clone();
            this.setElement(node);
        },
        setResources: function (resources) {
            for (var key in ResourceCode) {
                var index = ResourceCode[key];

                if (this.hideMask & 1 << index || (this.hideZeros && resources[index] === 0))
                    continue;

                if (this._nodeMask & 1 << index) {
                    $(".value", this[key]).text(Numeral(resources[index]).format("0a"));
                    $(this[key]).attr("title", Math.round(resources[index])+" "+key);
                } else {
                    this._nodeMask |= 1 << index;

                    var tmpl = $(itemTemplate).clone();
                    tmpl.addClass(key);
                    this[key] = tmpl;

                    $(".value", tmpl).text(Numeral(resources[index]).format("0a"));
                    $(tmpl).attr("title", Math.round(resources[index])+" "+key);
                    $(".icon", tmpl).attr("src", "img/" + key + "_icon_16.png");

                    $(".items", this.$el).append(tmpl);
                }
            }
        },
        hideMask: 0, //binary mask, indicating which resources to hide.
        //each bit corresponds to resource index.
        _nodeMask: 0,
        hideZeros: false
    });

    return View;
});
define(function (require) {
    require("backbone");

    var templateText = require("text!templates/resourcesbar.html");
    /**
     * @type {ResourceCode}
     */
    var ResourceCode = require("core/resourcecode");
    var template = $.parseHTML(templateText),
        itemTemplate = $(".item", template),
        Numeral = require("numeral");

    $(".items", template).empty();

    var View = Backbone.View.extend({
        initialize: function (options) {
            this.render();
            if (options) {
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
            var key, index;
            for (var name in ResourceCode) {
                key = ResourceCode[name];
                index = View.ResourceIndex[key];

                if (this.hideMask & 1 << index || (this.hideZeros && resources[key] === 0))
                    continue;

                if (this._nodeMask & 1 << index) {
                    $(".value", this[key]).text(Numeral(resources[key]).format("0a"));
                    $(this[key]).attr("title", Math.round(resources[key]) + " " + key);
                } else {
                    this._nodeMask |= 1 << index;

                    var tmpl = $(itemTemplate).clone();
                    tmpl.addClass(key);
                    this[key] = tmpl;

                    $(".value", tmpl).text(Numeral(resources[key]).format("0a"));
                    $(tmpl).attr("title", Math.round(resources[key]) + " " + key);
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

    var idxs = {};
    idxs[ResourceCode.money] = 0;
    idxs[ResourceCode.food] = 1;
    idxs[ResourceCode.water] = 2;
    idxs[ResourceCode.electricity] = 3;
    idxs[ResourceCode.oil] = 4;
    idxs[ResourceCode.wood] = 5;
    idxs[ResourceCode.stone] = 6;
    idxs[ResourceCode.iron] = 7;
    idxs[ResourceCode.glass] = 8;

    View.ResourceIndex = idxs;

    return View;
});
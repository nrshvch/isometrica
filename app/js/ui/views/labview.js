//TODO research time should decrease while researching
define(function (require) {
    var Backbone = require("backbone"),
        templateText = require("text!templates/laboratoryviewtemplate.html"),
        template = $.parseHTML(templateText),
        ResearchState = require("core/researchstate"),
        ResourcesBarView = require("ui/views/resourcesbarview");

    var FormatTimeLeft = function(msInput){
        var ms, s, min, h;

        h = (msInput / 1200000) | 0;

        msInput -= h * 1200000;

        min = (msInput / 60000) | 0;

        msInput -= min * 60000;

        s = (msInput / 1000) | 0;

        return h+"h "+min+"min "+s+"s";
    };

    var View = Backbone.View.extend({
        events: {
            "click .researchBtn": "beginResearch"
        },
        initialize: function (options) {
            this.mainView = options.mainView;
            this.render();

            this._dirData = null;

            var self = this;

            var api = vkaria.core;

            api.addEventListener(ResponseCode.researchStart, function (response) {
                self._dirData[response.direction] = response;
            });

            api.addEventListener(ResponseCode.researchComplete, function (response) {
                self._dirData[response.direction] = response;
                self._update();
            });

            api.getResearchData(function (response) {
                self._dirData = response;
                self._update();
            });

            this.intervalId = setInterval(function () {
                self._routine();
            }, 40);
        },
        render: function () {
            this.setElement($(template).clone());
        },
        beginResearch: function (e) {
            var code = $(e.target).attr("researchCode");
            vkaria.core.research(code, function (response) {
                console.log(response);
            });
        },
        _routine: function () {
            for (var key in this._dirData) {
                var data = this._dirData[key];

                if (!data)
                    continue;

                if (data.state === ResearchState.running) {
                    var progress = 1 - (data.endTime - Date.now()) / data.time;

                    $(".labDirection[researchCode=" + data.direction + "] .progress", this.$el).css("width", 100 * progress + "%");
                }
            }
        },
        _update: function () {
            for (var key in this._dirData) {
                var data = this._dirData[key];

                $(".labDirection[researchCode=" + key + "] .progress", this.$el).css("width", data.progress + "%");
                $(".labDirection[researchCode=" + key + "] .lvl span", this.$el).text(data.level);
                $(".labDirection[researchCode=" + key + "] .time span", this.$el).text(FormatTimeLeft(data.time));
            }
        },
        remove: function () {
            clearInterval(this.intervalId);
            Backbone.View.prototype.remove.call(this);
        }
    });

    return View;
});
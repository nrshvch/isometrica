define(function (require) {
    var Backbone = require("backbone");
    var template = require("hbs!../../templates/topbar");

    var Events = require("events");
    var Numeral = require("numeral");

    function onTimeAdvance(s, a, d) {
        d.renderDate();
    }

    function onCityRename(s,a,d){
        d.renderName();
    }

    function onCityUpdate(s,a,d){
        d.render();
    }

    var View = Backbone.View.extend({
        initialize: function (options) {
            this.onDispose = Events.event("dispose");

            this.options = options || {};

            this.setElement(template());

            this.city = options.app.client.player.city();

            this.time = options.app.client.core.time;

            var tmTkn = Events.on(this.time, this.time.constructor.events.advance, onTimeAdvance, this);

            var rnmTkn = this.city.rename().on(onCityRename, this);

            var updTkn = this.city.update().on(onCityUpdate, this);

            this.onDispose().once(function(s,a,self){
                Events.off(self.time, self.time.constructor.events.advance, tmTkn);
                self.city.rename().off(rnmTkn);
                self.city.update().off(updTkn);
            }, this);

            //render all
            this.render();
        },
        renderDate: function () {
            $(".date", this.$el).text(this.time.toMDY());
            return this;
        },
        renderName: function(){
            $(".city-name", this.$el).text(this.city.name());
        },
        renderMoney: function(){
            var money = this.city.resources.getResources()[Isometrica.Core.ResourceCode.money];
            $(".money", this.$el).text(Numeral(money).format("0a"));
        },
        renderPopulation: function(){
            var pop = this.city.population;
            $(".population", this.$el).text(pop.getPopulation() + " / " + pop.getCapacity());
        },
        render: function(){
            this.renderDate();
            this.renderName();
            this.renderPopulation();
            this.renderMoney();
        },
        dispose: function(){
            this.onDispose(this, null);
        }
    });

    return View;
});

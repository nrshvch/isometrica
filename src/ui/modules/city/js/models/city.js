import Backbone from "backbone";
import ValbarItems from "ui/modules/valbar/js/collections/items";
import Events from "events";

export default Backbone.Model.extend({
    initialize: function(attributes, options) {
        this.onDispose = Events.event("dispose");

        this.resources =  new ValbarItems();

        //bind resource update to icon-value bar of resources
        var city = this.city = options.city;
        var models = {};

        var token = city.update().on(function(s,a,d){
            var r = city.resources.getResources();
            for(var key in r) {
                if (typeof models[key] === "undefined")
                    models[key] = d.resources.add({
                        icon: key,
                        value: r[key]
                    });
                else
                    models[key].set("value", r[key]);
            }

            //population
            d.set("pop", city.population.getPopulation());
            d.set("maxPop", city.population.getCapacity());
        }, this);

        this.set("tile", city.tile());

        this.onDispose().once(function(s,a,d){
            city.update().off(token);
        });


    },
    dispose: function(){
      this.onDispose(this, null);
    },
    defaults: {
        id: -1,
        name: "Unnamed"
    }
});

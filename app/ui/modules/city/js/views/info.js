define(function (require) {
    var Backbone = require("backbone");
    var templates = require("ui/js/templates");
    var template = templates["city/info"];
    var ResourceBarView = require("ui/modules/valbar/js/views/view");

    return Backbone.View.extend({
        initialize: function (options) {
            this.setElement(template(this.model.toJSON()));
            var resBar = new ResourceBarView({
                collection: this.model.resources
            });
            $(".available-resources", this.$el).append(resBar.el);
            this.listenTo(this.model, "change", function(){
                this.render();
            });


            //vp cam
            var client = options.cityView.game.client;
            var cam = client.cameraman.createCamera();
            var cityId = this.model.city.id();
            var go = client.cityman.getCityGameObject(cityId);
            var pos = go.transform.getPosition();
            cam.transform.setPosition(pos[0], pos[1], pos[2]);
            var viewport = client.game.graphics.createViewport();
            viewport.setCamera(cam);
            $(".bird-eye-container", this.$el).append(viewport.canvas);
            viewport.setSize(400, 400);
        },
        render: function(){
            $(".pop", this.$el).text(this.model.city.population.getPopulation());
            $(".maxPop", this.$el).text(this.model.city.population.getCapacity());

            return this;
        }
    });
});
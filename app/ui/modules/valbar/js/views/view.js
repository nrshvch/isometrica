define(function(require){
    var Backbone  = require("backbone");
    var template = require("hbs!../../templates/valbar");


    function onChange(){
        this.render();
    }

    function onAdd(item){
        this.listenTo(item, "change", onChange);
        this.render();
    }

    function onRemove(item){
        this.stopListening(item);
        this.render();
    }

    return Backbone.View.extend({
        tagName: "span",
        initialize: function(){
            var collection = this.collection;
            collection.each(function(item){
                this.listenTo(item, "change", onChange);
            }, this);
            this.listenTo(collection, "add", onAdd);
            this.listenTo(collection, "remove", onRemove);
            this.render();
        },
        render: function(){
            this.$el.html(template({
                items: this.collection.toJSON()
            }));
        }
    });
});
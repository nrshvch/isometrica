define(function(require) {
    var Backbone = require("backbone");
   
   var template = require("text!templates/windowview.html");

    var WindowView = Backbone.View.extend({
        events: {
            "click .closeButton": "remove"
        },
        initialize: function() {
            this.render();
        },
        render: function() {
            this.setElement($.parseHTML(template));
        },
        setView: function(view) {
            this.view = view;
            $(".body", this.el).append(view.el);
        },
        setTitle: function(title) {
            $(".titleBar", this.$el).text(title);
        },
        setSize: function(w,h){
            this.$el.css({
                width: w,
                height: h,
                marginLeft: -1*(w/2),
                marginTop: -1*(h/2)
            })
        },
        remove: function() {
            this.view.remove();
            Backbone.View.prototype.remove.call(this);
        },
                close: function(){
            this.remove();
                }
    });

    return WindowView
});

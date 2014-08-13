define(function(require){
    var Backbone = require("backbone");
   
   var template = require("text!templates/messageview.html");

    var MessageView = Backbone.View.extend({
        events: {
            "click .button": function () {
                this.mainView.window.remove();
            }
        },
        initialize: function (options) {
            this.text = options.text;
            this.mainView = options.mainView;
            this.render();
        },
        render: function () {
            this.setElement($.parseHTML(template));
            $(".text", this.$el).text(this.text);
        },
                remove: function(){
                    Backbone.View.prototype.remove.call(this);
            
                }
    });

    return MessageView;
});

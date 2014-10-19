define(function (require) {
    var Backbone = require("backbone");

    return Backbone.Model.extend({
        defaults: function(){
          return {
              onSubmit: function(){},
              onDiscard: function(){},
              onRotate: function(){},
              rotation: true,
              canRotate: true,
              canSubmit: true,
              canDiscard: true
          }
        },
        submit: function () {
            this.onSubmit();
        },
        discard: function () {
            this.onDiscard();
        },
        rotate: function () {
            this.onRotate();
        }
    });
});
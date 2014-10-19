define(function(require){
   var ReactiveProperty = require("reactive-property");

    function WorldAction(){
        this.rotation = ReactiveProperty(false);
        this.canRotate = ReactiveProperty(true);
        this.canSubmit = ReactiveProperty(true);
        this.canDiscard = ReactiveProperty(true);
    }

    WorldAction.prototype.onSubmit = function(){};
    WorldAction.prototype.onDiscard = function(){};
    WorldAction.prototype.onRotate = function(){};

    WorldAction.prototype.submit = function(){
        this.onSubmit();
    };

    WorldAction.prototype.discard = function(){
        this.onDiscard();
    };

    WorldAction.prototype.rotate = function(){
        this.onRotate();
    };

    return WorldAction;
});
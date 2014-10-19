define(function(require){
    var View = require("./view");

    function Splash(){
    }


    Splash.prototype.show = function(){
        return new View().render();
    };

    return Splash;
});

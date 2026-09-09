import View from "./view";

function Splash(){
}


Splash.prototype.show = function(){
    return new View().render();
};

export default Splash;

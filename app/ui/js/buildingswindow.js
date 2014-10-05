/**
 * Created by denis on 10/6/14.
 */
define(function(require){
    var BuildingsWindowView = require("./views/buildingswindowview");

   function Module(){
       this.view = new BuildingsWindowView({
           controller: this
       });
   }

    return Module;
});

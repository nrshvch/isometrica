/**
 * Created by denis on 10/6/14.
 */
define(function(require){
    var BuildingsWindowView = require("./views/buildingswindowview");

   function Module(ui){
       this.view = new BuildingsWindowView({
           controller: this
       });

       ui.router.on("route:catalogue", function(){
           console.log("CATALOGUE!");
       }, this);

       ui.router.on("route:category", function(catId){
          console.log("CATEGORY!", catId);
       }, this);

       ui.router.on("route:building", function(id){
           console.log("Building!", id);
       }, this);
   }

    return Module;
});

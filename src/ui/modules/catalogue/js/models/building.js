import Backbone from "backbone";

export default Backbone.Model.extend({
   defaults: function(){
       return {
           name: "Unnamed",
           code: -1
       }
   }
});

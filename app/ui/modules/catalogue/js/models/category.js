import Backbone from "backbone";
import Buildings from "../collections/buildings";

export default Backbone.Model.extend({
    initialize: function(){
        this.buildings = new Buildings()
    },
    defaults: function(){
        return {
            code: -1,
            displayName: "Unnamed"
        }
    }
});

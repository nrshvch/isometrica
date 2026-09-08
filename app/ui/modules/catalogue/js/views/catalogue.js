import Backbone from "backbone";

export default Backbone.View.extend({
    tagName: "span",
    initialize: function(options){
        this.options = options || {};
    }
});

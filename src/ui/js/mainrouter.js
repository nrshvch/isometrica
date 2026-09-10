import Backbone from "backbone";

var Router = Backbone.Router.extend({
    initialize: function(options){
        this.ui = options.ui;
    },
    routes: {
        "*path": "root"
    },
    root: function(){
        this.ui.navigate("world");
    }
});

export default Router;

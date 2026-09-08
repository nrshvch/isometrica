import Backbone from "backbone";
import Building from "../models/building";

export default Backbone.Collection.extend({
   model: Building,
});

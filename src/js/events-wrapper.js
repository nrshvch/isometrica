//This wrapper is neccessary in order to provide compatibility across all my code, because at different times I've used different approaches of managing events
//
//The wrapper itself is built inside src/js/vendor/amd-loader.js (and registered
//there under the AMD id "events"), because the vendor engine artifact needs the
//exact same wrapper for its own internal `require("events")` calls, and that
//can't import this file without a circular dependency. This file just exposes
//that same object as the src's regular "events" module.
import {amd} from "./vendor/amd-loader.js";

export default amd("events");

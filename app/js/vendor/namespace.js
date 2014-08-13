/**
 * Created by User on 04.08.2014.
 */
define(function(require){
    // a convenience function for parsing string namespaces and
// automatically generating nested namespaces
    function extend( ns, ns_string ) {
        var parts = ns_string.split("."),
            parent = ns,
            pl;

        pl = parts.length;

        for ( var i = 0; i < pl; i++ ) {
            // create a property if it doesn't exist
            if ( typeof parent[parts[i]] === "undefined" ) {
                parent[parts[i]] = {};
            }

            parent = parent[parts[i]];
        }

        return parent;
    }

    function namespace(nsString, f){
        var ns = extend(window, nsString);

        if(f !== undefined)
            f.call(ns, ns, global);

        return ns;
    }

    return namespace;
});
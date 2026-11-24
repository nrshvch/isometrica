// namespace - entry point
// A convenience function for parsing string namespaces and automatically
// generating nested namespaces on the global object (window in a page).
define(function () {
    function extend(ns, nsString) {
        var parts = nsString.split(".");
        var parent = ns;

        for (var i = 0; i < parts.length; i++) {
            // create a property if it doesn't exist
            if (typeof parent[parts[i]] === "undefined") {
                parent[parts[i]] = {};
            }

            parent = parent[parts[i]];
        }

        return parent;
    }

    return function namespace(nsString, f) {
        var ns = extend(globalThis, nsString);

        if (f !== undefined) {
            f.call(ns, ns, globalThis);
        }

        return ns;
    };
});

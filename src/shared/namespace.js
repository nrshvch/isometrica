// a convenience function for parsing string namespaces and
// automatically generating nested namespaces
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

export default function namespace(nsString, f) {
    var ns = extend(window, nsString);

    if (f !== undefined) {
        f.call(ns, ns, window);
    }

    return ns;
}

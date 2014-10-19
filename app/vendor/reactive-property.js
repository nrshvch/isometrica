//add comments, auto-doc, add build with events included, add nested property change listening
(function(global, Events) {
    function reactiveProperty (defaultValue, validation) {
        var value = defaultValue;

        function property(newValue) {
            if(newValue === undefined)
                return value;

            if(validation !== undefined && !validation(newValue))
                return;

            var oldValue = value;
            value = newValue;

            Events.fire(property, "change", {
                oldValue: oldValue,
                newValue: value
            });
        }

        property.onChange = function (listener, immediate) {
            Events.on(property, "change", listener, property);

            if(immediate === true)
                Events.fire(property, "change", value);
        };

        return property;
    }

    return this.ReactiveProperty = reactiveProperty;
})(this, Events);
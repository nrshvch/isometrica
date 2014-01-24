define(function (require) {
    function Enumerator(){
        throw "Use Enumerator.create";
    }

    Enumerator.create = function(keyValuePairs){
        var arr = [];
        var enm = Object.create(null);

        //copy values in arr
        for (key in keyValuePairs)
            if (keyValuePairs.hasOwnProperty(key)){
                arr.push(keyValuePairs[key]);

                enm[key] = keyValuePairs[key];
            }

        //check duplicate values/indexes
        arr.forEach(function(el, pos, arr){
            if(arr.indexOf(el) !== pos)
                throw "Enumerator had duplicate index";
        });

        return enm;
        //return keyValuePairs;
    };

    return Enumerator;
});
define(function (require) {
    function Enumerator(){
        throw "Use Enumerator.create";
    }

    /**
     * @param keyValuePairs
     * @returns {@enum}
     */
    /*
    Enumerator.create = function(keyValuePairs){
        var arr = [];
        var enm = Object.create(null);

        enm['properties'] = {};

        Object.defineProperty(enm, 'properties',{
           enumerable: false
        });

        //copy values in arr
        for (key in keyValuePairs)
            if (keyValuePairs.hasOwnProperty(key)){
                arr.push(keyValuePairs[key]);

                enm[key] = keyValuePairs[key];
                enm.properties[keyValuePairs[key]] = {
                    name: key,
                    index: keyValuePairs[key]
                }
            }

        //check duplicate values/indexes
        arr.forEach(function(el, pos, arr){
            if(arr.indexOf(el) !== pos)
                throw "Enumerator had duplicate index";
        });

        return enm;
        //return keyValuePairs;
    };       */
                          /*
    Enumerator.parse = function(enumerator, value){
        if(typeof value === "number" || !isNaN(parseInt(value, 10))){
            if(value in enumerator.properties)
                return enumerator.properties[value].name;
        }else if(typeof value === "string"){
            if(value in enumerator)
                return value;
        }

        return null;
    };                      */

    Enumerator.parse = function(enumerator, value){
        if(typeof value === "number" || !isNaN(parseInt(value, 10))){
            for(var key in enumerator){
                if(enumerator[key] === value)
                    return key;
            }
        }

        return null;
    };

    return Enumerator;
});
/*
 var SizeEnum = {
 SMALL: 1,
 MEDIUM: 2,
 LARGE: 3,
 properties: {
 1: {name: "small", value: 1, code: "S"},
 2: {name: "medium", value: 2, code: "M"},
 3: {name: "large", value: 3, code: "L"}
 }
 };*/
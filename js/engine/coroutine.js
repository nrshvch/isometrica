/**
 * Created by User on 28.07.2014.
 */
define(function(require){
    var namespace = require("namespace");
    var Coroutine = namespace("Isometrica.Engine.Coroutine");

    var coroutineId = 0;
    var coroutines = {};

    /**
     *
     * @param routine
     * @param {...*} Optional parameters that will be passed to routine
     * @returns {number}
     */
    Coroutine.startCoroutine = function(routine){
        var cid = coroutineId++;
        var args = Array.prototype.slice.call(arguments,1);
        var timerHandler = function(){
            var delay = routine.apply(this,args);
            if(delay >= 0)
                coroutines[cid] = setTimeout(timerHandler,delay);
        };
        timerHandler();

        return cid;
    };

    Coroutine.stopCoroutine = function(coroutineId){
        clearTimeout(coroutines[coroutineId]);
        delete coroutines[coroutineId];
    };

    return Coroutine;
});

/**
 * Created by User on 28.07.2014.
 */
define(function(require){
    var Coroutine = namespace("Isometrica.Engine.Coroutine");

    function CoroutineIterator(routine, args){
        this.next = function(){
            return routine(args);
        }
    }

    var coroutineId = 0;
    var coroutines = {};

    Coroutine.startCoroutine = function(routine, args){
        var coroutine = new CoroutineIterator(routine, args);
        var cid = coroutineId++;
        var timerHandler = function(){
            var delay = coroutine.next();
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

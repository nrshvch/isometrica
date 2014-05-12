define(function(require){
    var Time = {
        now: -1
    };

    var intervalId = -1;
    if(intervalId == -1){
        setInterval(function(){
            Time.now = Date.now();
        },40);
    }

    return Time;
});

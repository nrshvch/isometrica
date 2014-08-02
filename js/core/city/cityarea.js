/**
 * Created by User on 29.07.2014.
 */
define(function (require) {
    namespace("Isometrica.Core.City").Area = Area;

    function Area(city){
        this.influenceZone = {};
        this.territoty = {};
    }



    return Area;
});
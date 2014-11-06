var gulp = require('gulp');
var ts = require('gulp-typescript');
var rename = require("gulp-rename");
var merge = require('merge-stream');
var eventStream = require('event-stream');

gulp.task('default', function () {
    //gulp.watch('app/ui/**/*.ts', ['ts:ui']);
});

//gulp.task('ts:ui', function() {
//    var modules = gulp.src("app/ui/**/*.ts").
//        pipe(ts({
//            declarationFiles: true,
//            noExternalResolve: true,
//            module: "amd"
//        }));
//
//    return eventStream.merge(
//        modules.dts.pipe(gulp.dest("app/ui/ts/definitions")),
//
//        modules.js.pipe(rename(function(path){
//            path.dirname = String(path.dirname).replace("ts","js");
//        })).pipe(gulp.dest("app/ui"))
//    );
//});

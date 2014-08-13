module.exports = function(grunt){
    grunt.initConfig({
        requirejs: {
            compile: {
                options: {
                    baseUrl: "./app",
                    name: "js/main",
                    out: "dist/main.js",
                    mainConfigFile: 'app/js/main.js',
                    preserveLicenseComments: false
                }
            }
        }
    });

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  
  // Default task(s).
  grunt.registerTask('default', ['requirejs']);

}
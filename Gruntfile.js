module.exports = function (grunt) {
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
        },
        less: {
            development: {
                options: {
                    compress: true,
                    yuicompress: true,
                    optimization: 2
                },
                files: {
                    "./app/ui/css/main.css": "./app/ui/less/main.less"
                }
            }
        },
        handlebars: {
            compile: {
                options: {
                    namespace: "Templates",
                    amd: true,
                    processName: function (filePath) {
                        var file = filePath.replace(/.*\/(\w+)\.hbs/, '$1');
                        return file;
                    }
                },
                files: {
                    "./app/ui/js/templates.js": "./app/ui/templates/*.hbs"
                }
            }
        },
        watch: {
            styles: {
                files: ['./app/ui/less/**/*.less'], // which files to watch
                tasks: ['less'],
                options: {
                    nospawn: true
                }
            },
            templates: {
                files: "./app/ui/templates/*.hbs",
                tasks: 'handlebars',
                options: {
                    nospawn: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-handlebars');

    // Default task(s).
    grunt.registerTask('default', ['watch']);
    grunt.registerTask('build', ['requirejs']);

};

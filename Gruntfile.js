module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-handlebars');
    grunt.loadNpmTasks('grunt-spritesmith');
    grunt.loadNpmTasks('grunt-template');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks("grunt-gm");
    grunt.loadNpmTasks("grunt-contrib-imagemin");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.initConfig({
        optimize: "none",//"uglify2",
        requirejs: {
            main: {
                options: {
                    optimize: "<%= optimize %>",
                    baseUrl: "./app/js",
                    name: "main",
                    out: "dist/js/main.js",
                    mainConfigFile: 'app/js/config.js',
                    map: {
                        "*": {
                            //"config":"config2.js"
                        }
                    },
                    preserveLicenseComments: false
                }
            },
            ui: {
                options: {
                    optimize: "<%= optimize %>",
                    baseUrl: "./app",
                    name: "ui/js/main",
                    out: "./dist/ui/js/main.js",
                    mainConfigFile: 'app/js/config.js',
                    preserveLicenseComments: false
                }
            },
            game: {
                options: {
                    optimize: "<%= optimize %>",
                    baseUrl: "./app",
                    name: "client/main",
                    out: "./dist/client/js/main.js",
                    mainConfigFile: 'app/js/config.js',
                    preserveLicenseComments: false
                }
            }
        },
        less: {
            dev: {
                files: {
                    "./app/ui/css/main.css": "./app/ui/less/main.less"
                }
            },
            dist: {
                options: {
                    cleancss: true,
                    compress: true,
                    yuicompress: true,
                    optimization: 2
                },
                files: {
                    "./dist/ui/css/main.css": "./app/ui/less/main.less"
                }
            }
        },
        handlebars: {
            compile: {
                options: {
                    namespace: "Templates",
                    amd: true,
                    processName: function (filePath) {
                        var file = filePath.replace(/\.\/app\/ui\/modules\/(.*)\/templates\/(\w+)\.hbs/, '$1/$2');
                        return file;
                    }
                },
                files: {
                    "./app/ui/js/templates.js": "./app/ui/**/*.hbs"
                }
            }
        },
        sprite: {
            dev: {
                src: './app/client/assets/images/**/*.png',
                destImg: './app/gfx/spritesheet.png',
                destCSS: './app/gfx/spritesheet.json',
                'cssFormat': 'json',
                engine: "pngsmith",
                // OPTIONAL: Map variable of each sprite
                'cssVarMap': function (sprite) {
                    // `sprite` has `name`, `image` (full path), `x`, `y`
                    //   `width`, `height`, `total_width`, `total_height`
                    // EXAMPLE: Prefix all sprite names with 'sprite-'
                    //sprite.name = sprite.source_image;
                },
                algorithm: "binary-tree",
                cssTemplate: function (params) {
                    var sourceItems = params.items;
                    var items = {
                        frames: {}
                    }, item, name, frames = items.frames;
                    for (var key in sourceItems) {
                        item = sourceItems[key];
                        name = item.source_image.replace("./app/client/assets/images/", "");
                        frames[name] = {
                            frame: {
                                x: item.x,
                                y: item.y,
                                w: item.width,
                                h: item.height
                            }
                        }
                    }
                    return JSON.stringify(items);
                }
            },
            dist: {
                src: './app/client/assets/images/**/*.png',
                destImg: './dist/gfx/spritesheet.png',
                destCSS: './dist/gfx/spritesheet.json',
                'cssFormat': 'json',
                engine: "pngsmith",
                // OPTIONAL: Map variable of each sprite
                'cssVarMap': function (sprite) {
                    // `sprite` has `name`, `image` (full path), `x`, `y`
                    //   `width`, `height`, `total_width`, `total_height`
                    // EXAMPLE: Prefix all sprite names with 'sprite-'
                    //sprite.name = sprite.source_image;
                },
                algorithm: "binary-tree",
                cssTemplate: function (params) {
                    var sourceItems = params.items;
                    var items = {
                        frames: {}
                    }, item, name, frames = items.frames;
                    for (var key in sourceItems) {
                        item = sourceItems[key];
                        name = item.source_image.replace("./app/client/assets/images/", "");
                        frames[name] = {
                            frame: {
                                x: item.x,
                                y: item.y,
                                w: item.width,
                                h: item.height
                            }
                        }
                    }
                    return JSON.stringify(items);
                }
            },
            "css-icons": {
                src: "./.tmp/icons/*.png",
                destImg: "./app/ui/sprites/icons.png",
                destCSS: "./app/ui/less/game-ui/icons/sprite.less",
                cssFormat: "less",
                engine: "pngsmith",
                cssTemplate: "grunt-templates/icons.mustache",
                imgPath: "../sprites/icons.png"
            }
        },
        gm: {
            "icons": {
                options: {
                    skipExisting: false,
                    stopOnError: false,
                },
                files: [
                    {
                        cwd: './app/ui/icons',
                        dest: '.tmp/icons',
                        expand: true,
                        filter: 'isFile',
                        src: "*.png",
                        options: {
                            skipExisting: true,
                            stopOnError: true
                        },
                        tasks: [
                            {
                                scale: [64]
                            }
                        ]
                    }
                ]
            }
        },
        imagemin: {
          dist: {
              options: {
                optimizationLevel: 7
              },
              files: [{
                  expand: true,                  // Enable dynamic expansion
                  cwd: "dist",
                  src: ['**/*.{png,jpg,gif}'],   // Actual patterns to match
                  dest: 'dist'                  // Destination path prefix
              }]
          }
        },
        uglify: {
          dist: {
              mangle: true,
              compress: {
                  sequences: true,
                  dead_code: true,
                  conditionals: true,
                  booleans: true,
                  unused: true,
                  if_return: true,
                  join_vars: true,
                  drop_console: true
              },
              files: [{
                  expand: true,
                  cwd: "dist",
                  src: ["**/*.js"],
                  dest: "dist"
              }]
          }
        },
        'template': {
            'dist': {
                'options': {
                    'data': {
                        'title': 'Isometrica'
                    }
                },
                'files': {
                    'dist/index.html': ['./app/index.tpl']
                }
            }
        },
        clean: {
            "dist": ["./dist"],
            "tmp": ["./.tmp"]
        },
        copy: {
            dist: {
                files: [
                    {expand: true, cwd: './app/bower_components/requirejs', src: ['require.js'], dest: './dist/js'},
                    {expand: true, cwd: './app/ui/fonts', src: ['**'], dest: './dist/ui/fonts'},
                    {expand: true, cwd: './app/ui/css/img', src: ['**'], dest: './dist/ui/css/img'},
                    {expand: true, cwd: './app/ui/img', src: ['**'], dest: './dist/ui/img'},
                    {expand: true, cwd: './app/ui/sprites', src: ['**'], dest: './dist/ui/sprites'},
                ]
            }
        },
        watch: {
            less: {
                files: ['./app/ui/**/*.less'], // which files to watch
                tasks: ['less:dev'],
                options: {
                    nospawn: true
                }
            },
            templates: {
                files: "./app/ui/modules/*/templates/*.hbs",
                tasks: 'handlebars',
                options: {
                    nospawn: true
                }
            },
            sprites: {
                files: "./app/client/assets/images/**/*",
                tasks: "sprite:dev"
            },
            icons: {
                files: "./app/ui/icons/**/*",
                tasks: "icons"
            }
        }
    });

    // Default task(s).
    grunt.registerTask('default', ['watch']);
    grunt.registerTask('build', ["clean:dist", 'requirejs', "template:dist", "sprite:dist", "less:dist", "uglify:dist","copy", "imagemin:dist"]);
    grunt.registerTask("icons", ["clean:tmp", "gm:icons", "sprite:css-icons"]);

};

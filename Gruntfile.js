module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: ['dist'],
        concat: {
            options: {
                separator: '\n'
            },
            dist: {
                src: [
                    'src/rpc.js',
                    'src/rpc.json.js',
                    'src/rpc.deferred.js',
                    'src/rpc.service.js',
                    'src/rpc.rest.js',
                    'src/rpc.jsonrpc.js'
                ],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: createBanner()
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
//        qunit: {
//            files: ['test/**/*.html']
//        },
        jshint: {
            files: ['gruntfile.js', 'src/**/*.js', 'test/*.js'],

            options: {
                jshintrc: ".jshintrc",
                // options here to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true
                }
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint', 'qunit']
        },
        copy: {
            main: {
                files: [
                    {src: ['SMDLibrary/*'], dest: 'dist/'}
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
//    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');


    function stripDirectory( file ) {
        return file.replace( /.+\/(.+?)>?$/, "$1" );
    }

    function createBanner( files ) {
        // strip folders
        var fileNames = files && files.map( stripDirectory );
        return "/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - " +
            "<%= grunt.template.today('isoDate') %>\n" +
            "<%= pkg.homepage ? '* ' + pkg.homepage + '\\n' : '' %>" +
            (files ? "* Includes: " + fileNames.join(", ") + "\n" : "")+
            "* Copyright <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>;" +
            " Licensed <%= _.pluck(pkg.licenses, 'type').join(', ') %> */\n";
    }



    grunt.registerTask('test', ['jshint']);

    grunt.registerTask('default', ['clean', 'jshint', 'concat', 'uglify', 'copy']);

};
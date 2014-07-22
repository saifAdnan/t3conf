/**
 * Config dependencies
 * @type {function(): config|exports}
 */
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var uglify = require('gulp-uglifyjs');
var minifyCSS = require('gulp-minify-css');


var uglifyConfig = {
        ext: 'html js css',
        ignores: ['public/dist/*.*'],
        files: {
            ng: [
                'public/js/angular/*.js',
                'public/js/angular/controllers/*.*',
                'public/js/angular/services/*.*',
                'public/js/angular/directives/*.*'
            ],
            css: [
                'public/css/*.*'
            ]
        }
};

gulp.task('uglify', function() {
    gulp.src(uglifyConfig.files.ng)
        .pipe(uglify('ng.min.js', {
            outSourceMap: false
        }))
        .pipe(gulp.dest('public/dist/'));
});

gulp.task('minify', function() {
    gulp.src('public/css/custom.css')
        .pipe(minifyCSS({keepBreaks:true}))
        .pipe(gulp.dest('public/dist/'))
});

gulp.task('default', function () {
    nodemon({ script: 'app.js', ext: uglifyConfig.ext , ignore: uglifyConfig.ignores })
        .on('crash', function () {
            var timeout = 3000;
            var self = this;

            console.log('Restart after ' + timeout / 1000 + ' seconds');

            setTimeout(function() {
                self.emit('restart');
                console.log('restarted after crash!');
            }, timeout);
        })
        .on('start', ['uglify', 'minify'])
        .on('change', ['uglify', 'minify'])
        .on('restart', function () {
            console.log('restarted!');
        });
});
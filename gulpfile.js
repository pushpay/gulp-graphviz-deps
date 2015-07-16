var gulp = require('gulp');
var tsc = require('gulp-tsc');
var mocha = require('gulp-mocha');
var fs = require('fs');
var shell = require('gulp-shell');

gulp.task('default', ['compile']);

gulp.task('compile', function() {
    return gulp.src('index.ts')
        .pipe(tsc({
            tmpdir: 'tmp',
            target: 'ES5',
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('compile-tests', ['compile'], function() {
    return gulp.src('tests.ts')
        .pipe(tsc({
            out: 'tests.js',
            tmpdir: 'tmp',
            target: 'ES5',
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('test', ['compile-tests'], function() {
    return gulp.src('tests.js', {
            read: false
        })
        .pipe(mocha());
});

gulp.task('watch-test', ['suppress-errors'], function() {
    return gulp.watch(['index.ts', 'tests.ts'], {
        debounceDelay: 2000
    }, ['test']);
});


gulp.task('inception', ['compile'], function() {
    var myGraphViz = require('./index.js')();
    fs.writeFileSync('inception.txt', myGraphViz);
    console.log('Wrote my own dependencies as a graphviz document to inception.txt. I am about to try running dot over this file, if dot is not in the path this will fail');

    return gulp.src('inception.txt')
        .pipe(shell('dot inception.txt -O -Tpng -Tsvg'));
});





gulp.task('suppress-errors', function() {
    function monkeyPatchPipe(o) {
        while (!o.hasOwnProperty('pipe')) {
            o = Object.getPrototypeOf(o);
            if (!o) {
                return;
            }
        }
        var originalPipe = o.pipe;
        var newPipe = function() {
            var result = originalPipe.apply(this, arguments);

            if (!result.pipe['monkey patched for suppress-errors']) {
                monkeyPatchPipe(result);
            }

            return result.on('error', function(err) {
                console.log(err);
                this.emit('end');
            });
        };
        newPipe['monkey patched for suppress-errors'] = true;
        o.pipe = newPipe;
    }
    monkeyPatchPipe(gulp.src(''));
});
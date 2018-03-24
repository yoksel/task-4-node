'use strict';
const gulp = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const csso = require('gulp-csso');
const rename = require('gulp-rename');
const autoprefixer = require('autoprefixer');
const concat = require('gulp-concat');
const sequence = require('run-sequence');
const rimraf = require('rimraf');
const nodemon = require('gulp-nodemon');
const path = require('path');
const babel = require('gulp-babel');

gulp.task('clean', function (done) {
  rimraf('./public', done);
});

gulp.task('js', () => {
  gulp.src([
    'sources/js/**/*.js'
  ])
    .pipe(concat('common.js'))
    .pipe(babel())
    .pipe(gulp.dest('./public/assets/js'));
});

gulp.task('style', () => {
  gulp.src('sources/scss/styles.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(postcss([autoprefixer()]))
    .pipe(gulp.dest('./public/assets/css'))
    .pipe(csso())
    .pipe(rename('styles.min.css'))
    .pipe(gulp.dest('./public/assets/css'));
});

gulp.task('build', function (done) {
  sequence(
    'clean',
    'style',
    'js',
    done
  );
});

gulp.task('start', ['build'], function () {
  var called = false;

  return nodemon({
    script: 'app.js',
    ext: 'js html scss hbs',
    ignore: ['public'],

    tasks: function (changedFiles) {
      var tasks = [];

      changedFiles.forEach(function (file) {
        // Listen to only files from sources folder
        console.log(path.dirname(file));
        if (path.dirname(file).indexOf('sources') < 0) {
          return;
        }

        const ext = path.extname(file);

        const extToTasks = {
          '.js': ['js'],
          '.scss': ['style']
        };

        if (extToTasks[ext]) {
          tasks = tasks.concat(tasks, extToTasks[ext]);
        }
      });

      return tasks;
    }
  });
});

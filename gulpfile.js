const gulp = require('gulp');
const ts = require('gulp-typescript');
const webpack = require('webpack-stream');

gulp.task('common', () => {
  return gulp.src('common/**/*.ts')
    .pipe(ts())
    .pipe(gulp.dest('common'));
});

gulp.task('browser-client', ['common'], () => {
  return gulp.src(['browser-client/*.tsx', 'browser-client/*.ts'])
    .pipe(ts(require('./tsconfig').compilerOptions))
    .pipe(gulp.dest('browser-client'));
});

gulp.task('browser-bundled', ['browser-client'], () => {
  return gulp.src('browser-client/app.js')
    .pipe(webpack({
      output: {
        filename: 'bundled.js'
      }
    }))
    .pipe(gulp.dest('browser-client/public'));
})

gulp.task('watch', ['default'], () => {
  gulp.watch(['common/**/*.ts', 'browser-client/*.tsx', 'browser-client/*.ts'], ['browser-bundled']);
});

gulp.task('default', ['browser-bundled']);

gulp-graphviz-deps
=======

Generates a [*graphviz*](http://www.graphviz.org/) document of your gulp tasks' dependencies

Usage
-----


```js
var gulp = require('gulp');
var deps = require('gulp-graphviz-deps');

// Add a task to render the output
gulp.task('deps', function(){console.log(deps());});

// Add some tasks
gulp.task('default', ['build']);
gulp.task('build', ['build-js', 'build-css']);
gulp.task('build-js', function() {})
gulp.task('build-css', ['build-sprites'], function() {})
gulp.task('build-sprites', function() {})

```

Now run `gulp deps`, and you'll see this:

```plain
digraph Dependencies
{
    graph [rankdir=LR,tooltip=" "]

    "build" [style="filled",fillcolor="white"]
      "build" -> "build-js"
      "build" -> "build-css"

    "build-css" [fillcolor="#118EC4",style="filled"]
      "build-css" -> "build-sprites"

    "build-js" [fillcolor="#FEDA3E",style="filled"]

    "build-sprites" [style="filled",fillcolor="white"]

    "default" [shape="doublecircle",style="filled",fillcolor="white"]
      "default" -> "build"
}
```

This is [*graphviz*](http://www.graphviz.org/) code. Running the graphviz tool `dot` over this file will produce a graphical representation of this dependency graph.


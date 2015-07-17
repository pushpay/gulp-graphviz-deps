///<reference path="typings/mocha/mocha.d.ts"/>
///<reference path="index.ts"/>

var gvd = require('./index');

describe("Graph production tests", function () {
	testCase("basic example", gulp => {
		gulp.task('x', function() {});
		gulp.task('y', function() {});
		gulp.task('z', function() {});
	},
		`digraph Dependencies
{
    graph [rankdir="LR",tooltip=" "]

    "x" [fillcolor="white",style="filled"]

    "y" [fillcolor="white",style="filled"]

    "z" [fillcolor="white",style="filled"]
}`);

	testCase("basic example with dependencies", gulp => {
		gulp.task('x', ['y', 'z'], function() {});
		gulp.task('y', function() {});
		gulp.task('z', function() {});
	},
		`digraph Dependencies
{
    graph [rankdir="LR",tooltip=" "]

    "x" [fillcolor="white",style="filled"]
      "x" -> "y"
      "x" -> "z"

    "y" [fillcolor="white",style="filled"]

    "z" [fillcolor="white",style="filled"]
}`);



	testCase("styling some keywords (builtin)", gulp => {
		gulp.task('default', ['build']);
		gulp.task('build', ['build-js', 'build-css']);
		gulp.task('build-js', function () { })
		gulp.task('build-css', ['build-sprites'], function () { })
		gulp.task('build-sprites', function () { })
	},
		`digraph Dependencies
{
    graph [rankdir="LR",tooltip=" "]

    "build" [fillcolor="white",style="filled"]
      "build" -> "build-js"
      "build" -> "build-css"

    "build-css" [fillcolor="#118EC4",style="filled"]
      "build-css" -> "build-sprites"

    "build-js" [fillcolor="#FEDA3E",style="filled"]

    "build-sprites" [fillcolor="white",style="filled"]

    "default" [fillcolor="white",shape="doublecircle",style="filled"]
      "default" -> "build"
}`);

testCase("implicit dependencies with watch", gulp => {
		gulp.task('watch', function () { gulp.watch('*.*', ['build','build-js']) ; gulp.watch( '*.*', ['build-css'] ); });
		gulp.task('default', ['build']);
		gulp.task('build', ['build-js', 'build-css']);
		gulp.task('build-js', function () { })
		gulp.task('build-css', ['build-sprites'], function () { })
		gulp.task('build-sprites', function () { })
	},
		`digraph Dependencies
{
    graph [rankdir="LR",tooltip=" "]

    "build" [fillcolor="white",style="filled"]
      "build" -> "build-js"
      "build" -> "build-css"

    "build-css" [fillcolor="#118EC4",style="filled"]
      "build-css" -> "build-sprites"

    "build-js" [fillcolor="#FEDA3E",style="filled"]

    "build-sprites" [fillcolor="white",style="filled"]

    "default" [fillcolor="white",shape="doublecircle",style="filled"]
      "default" -> "build"

    "watch" [fillcolor="white",shape="rarrow",style="filled"]
      "watch" -> "build" [color="#999999",style="dashed"]
      "watch" -> "build-js" [color="#999999",style="dashed"]
      "watch" -> "build-css" [color="#999999",style="dashed"]
}`);

testCase("implicit dependencies with runsequence", gulp => {
		var runSequence = x=>{};
		gulp.task('slow', function () { runSequence( ['build-sprites', 'build-css', 'build-js', 'build'] ); });
		gulp.task('default', ['build']);
		gulp.task('build', ['build-js', 'build-css']);
		gulp.task('build-js', function () { })
		gulp.task('build-css', ['build-sprites'], function () { })
		gulp.task('build-sprites', function () { })
	},
		`digraph Dependencies
{
    graph [rankdir="LR",tooltip=" "]

    "build" [fillcolor="white",style="filled"]
      "build" -> "build-js"
      "build" -> "build-css"

    "build-css" [fillcolor="#118EC4",style="filled"]
      "build-css" -> "build-sprites"

    "build-js" [fillcolor="#FEDA3E",style="filled"]

    "build-sprites" [fillcolor="white",style="filled"]

    "default" [fillcolor="white",shape="doublecircle",style="filled"]
      "default" -> "build"

    "slow" [fillcolor="white",style="filled"]
      "slow" -> "build-sprites" [color="#ff9999",style="dashed"]
      "slow" -> "build-css" [color="#ff9999",style="dashed"]
      "slow" -> "build-js" [color="#ff9999",style="dashed"]
      "slow" -> "build" [color="#ff9999",style="dashed"]
}`);


	testCase("broken dependencies", gulp => {
		gulp.task('x', ['y', 'missing'], function() {});
		gulp.task('y', function() {});
		gulp.task('z', function() {});
	},
		`digraph Dependencies
{
    graph [rankdir="LR",tooltip=" "]

    "x" [fillcolor="white",style="filled"]
      "x" -> "y"
      "x" -> "missing"

    "y" [fillcolor="white",style="filled"]

    "z" [fillcolor="white",style="filled"]

    "missing" [fillcolor="red",style="filled"]
}`);


});



class MockGulp {
	tasks = <gulp.Tasks>{};

	task(name: string, depOrFn: string[]| gulp.ITaskCallback, fn?: gulp.ITaskCallback) {
		var dep = [];

		if (typeof depOrFn === "function") {
			fn = <gulp.ITaskCallback>depOrFn;
		}
		else {
			dep = <string[]>depOrFn;
		}

		this.tasks[name] = {
			name: name,
			dep: dep,
			fn: fn
		};

	}

	watch: any;

}

function testCase(name: string, setup: (gulp: MockGulp) => void, expected: string) {
	expected = expected.trim();
	it(name, () => {
		var gulp = new MockGulp();
		setup(gulp);


		var result = gvd({ showTaskCodeAsTooltip: false }, gulp);


		if (result !== expected) {
			console.error("Unexpected result:");
			console.error("");
			console.error(result);
			throw new Error("Unexpected result");
		}
	})
}

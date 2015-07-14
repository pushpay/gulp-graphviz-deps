///<reference path="typings/mocha/mocha.d.ts"/>
///<reference path="index.ts"/>

var gvd = require('./index');

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

}

function testCase(name: string, setup: (gulp: MockGulp) => void, expected: string) {
	expected = expected.trim();
	it(name, () => {
		var gulp = new MockGulp();
		setup(gulp);


		var result = gvd({ codeTooltip: false }, gulp);


		if (result !== expected) {
			console.error("Unexpected result:");
			console.error("");
			console.error(result);
			throw new Error("Unexpected result");
		}
	})
}


describe("Graph production tests", function () {
	testCase("basic example", gulp => {
		gulp.task('x', function() {});
		gulp.task('y', function() {});
		gulp.task('z', function() {});
	},
		`digraph Dependencies
{
    graph [rankdir=LR,tooltip=" "]

    "x" [style="filled",fillcolor="white"]

    "y" [style="filled",fillcolor="white"]

    "z" [style="filled",fillcolor="white"]
}`);

	testCase("basic example with dependencies", gulp => {
		gulp.task('x', ['y', 'z'], function() {});
		gulp.task('y', function() {});
		gulp.task('z', function() {});
	},
		`digraph Dependencies
{
    graph [rankdir=LR,tooltip=" "]

    "x" [style="filled",fillcolor="white"]
      "x" -> "y"
      "x" -> "z"

    "y" [style="filled",fillcolor="white"]

    "z" [style="filled",fillcolor="white"]
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
}`);
});


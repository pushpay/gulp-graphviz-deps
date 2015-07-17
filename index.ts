///<reference path="typings/node/node.d.ts"/>
///<reference path="typings/gulp/gulp.d.ts"/>
import gulp = require("gulp");

//An object model that renders nicely into GraphViz format
module GvModels {

	export class GraphComponent {

		props: Props = {}

		propsString(): string {
			var propNames = Object.getOwnPropertyNames(this.props);
			if (!propNames.length) {
				return "";
			}
			var kvp = propNames
				.sort((a, b) => a.localeCompare(b))
				.map(x => `${x}="${this.props[x]}"`);

			return ` [${kvp.join(",") }]`;
		}

		toString(): string {
			return "";
		}
	}

	export class Graph extends GraphComponent {
		components: GraphComponent[] = [];

		addComponents(a: GraphComponent[]) {
			a.forEach(x => this.components.push(x));
		}

		toString(): string {
			return `digraph Dependencies
{
    graph${this.propsString() }
${this.components.join("\n") }
}`;
		}
	}

	export class Node extends GraphComponent {
		constructor(public name: string) {
			super();
		}
		toString(): string {
			return `\n    "${this.name}"${this.propsString() }`;
		}
	}

	export class Edge extends GraphComponent {
		constructor(public from: string, public to: string) {
			super();
		}

		toString(): string {
			return `      "${this.from}" -> "${this.to}"${this.propsString() }`;
		}
	}

	export interface Props {
		[s: string]: string
	}
}



//copies any properties that target doesn't have from src to target, won't overwrite existing properties
function apply(src, target): void {
	Object.getOwnPropertyNames(src)
		.filter(x => !target.hasOwnProperty(x))
		.forEach(x => target[x] = src[x]);
}

var baseStyles: Styles = { style: "filled", fillcolor: "white" };

function buildNode(task: gulp.Task, options: Options) {
	var node = new GvModels.Node(task.name);

	if (options.showTaskCodeAsTooltip) {
		node.props["tooltip"] = task.fn.toString().replace(/\r?\n/g, "&#10;").replace(/"/g, "\\\"");
	}

	options.styleRules
		.filter(r => r.matcher.test(task.name))
		.forEach(r => apply(r.styles, node.props));

	apply(baseStyles, node.props);
	return node;
}

function findImplicitDependencies(task: gulp.Task, implicitDependencyMatcherRules: StyleRule[]): GvModels.Edge[] {
	var results: GvModels.Edge[] = [];
	var oneLineFn = task.fn && task.fn.toString().replace(/\s+/g, " ");
	implicitDependencyMatcherRules.forEach(r => {
		r.matcher.lastIndex = 0;
		var m: string[];
		while ((m = r.matcher.exec(oneLineFn)) !== null) {
			m.splice(0, 1);
			var [match] = m.filter(x => !!x).reverse();
			var deps = eval("[" + match + "]");
			deps.forEach(d => {
				var edge = new GvModels.Edge(task.name, d);
				apply(r.styles, edge.props);
				results.push(edge);
			});
			if (!r.matcher.global) {
				break;
			}
		}
	});
	return results;
}

function findBrokenDependencies(currentComponents: GvModels.GraphComponent[], style: Styles): GvModels.Node[]{
	var nodeTargetMap = {};
	//collect all the "to" names of every edge
	currentComponents.forEach(x => {
		if (x instanceof GvModels.Edge) {
			nodeTargetMap[x.to] = true;
		}
	});

	//remove the ones that exist
	currentComponents.forEach(x => {
		if (x instanceof GvModels.Node) {
			delete nodeTargetMap[x.name];
		}
	});

	//map the remainer into styled nodes
	return Object.getOwnPropertyNames(nodeTargetMap).map(x => {
		var node = new GvModels.Node(x);
		apply(style, node.props);
		apply(baseStyles, node.props);
		return node;
	});
}

function processTasks(tasks: gulp.Task[], options: Options): GvModels.Graph {
	var graph = new GvModels.Graph();
	apply(options.graphStyles, graph.props);
	tasks.forEach(task => {
		graph.components.push(buildNode(task, options));

		if (task.dep) {
			graph.addComponents(task.dep.map(d => new GvModels.Edge(task.name, d)));
		}

		graph.addComponents(findImplicitDependencies(task, options.implicitDependencies));
	});

	graph.addComponents(findBrokenDependencies(graph.components, options.missingDependencyStyles));
	return graph;
}

interface Options {
	showTaskCodeAsTooltip?: boolean;
	styleRules?: StyleRule[];
	implicitDependencies?: StyleRule[];
	missingDependencyStyles?: Styles;
	graphStyles?: Styles;
}

interface StyleRule {
	matcher: RegExp;
	styles: Styles;
}

interface Styles {
	[s: string]: string;
}

var defaults: Options = {
	showTaskCodeAsTooltip: true,
	styleRules: [
		{ matcher: /default/, styles: { shape: "doublecircle" } },
		{ matcher: /watch/, styles: { shape:"rarrow" } },
		{ matcher: /js|script|compile/, styles: { fillcolor: "#FEDA3E" } },
		{ matcher: /css|style|less|sass/, styles: { fillcolor: "#118EC4"} },
		{ matcher: /test|spec|unit/, styles: { fillcolor: "#B29259", shape:"tab" } }
	],
	implicitDependencies: [
		{ matcher: /gulp.watch\(\s*[^;]*?\[([^;]+)\]\s*\)/g, styles: { color: "#999999", style: "dashed"  } },
		{ matcher: /runSequence\(\s*\[([^;]+)\]\s*\)/g, styles: { color: "#ff9999", style: "dashed"  } }
	],
	missingDependencyStyles: { fillcolor: "red" },
	graphStyles: { rankdir:"LR", tooltip:" "}
}

export = function (options: Options = {}, gulpOverride?: gulp.Gulp): string {
	apply(defaults, options);

	var g = gulpOverride || gulp;
	var t = g.tasks;
	var taskArray = Object.getOwnPropertyNames(t).map(x => t[x]).sort((a, b) => a.name.localeCompare(b.name));
	
	var o = processTasks(taskArray, options);
	return o.toString();
};


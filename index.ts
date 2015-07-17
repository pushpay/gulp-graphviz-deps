///<reference path="typings/node/node.d.ts"/>
///<reference path="typings/gulp/gulp.d.ts"/>
import gulp = require("gulp");

module Infrastructure {
	export interface Props {
		[s: string]: string
	}

	export class GraphComponent {
		constructor() {
			this.props = {};
		}

		props: Props

		propsString(): string {
			var propNames = Object.getOwnPropertyNames(this.props);
			if (!propNames.length) {
				return "";
			}
			return ` [${propNames.map(x => `${x}="${this.props[x]}"`).join(",") }]`;
		}

		toString(): string {
			return "";
		}
	}

	export class Node extends GraphComponent {
		constructor(public name: string) {
			super()
		}
		toString(): string {
			return `\n    "${this.name}"${this.propsString() }`;
		}
	}

	export class Edge extends GraphComponent {
		constructor(public from: string, public to: string) {
			super()
		}

		toString(): string {
			return `      "${this.from}" -> "${this.to}"${this.propsString() }`;
		}
	}

	export class Graph {
		constructor() {
			this.components = [];
		}

		components: GraphComponent[];

		toString(): string {
			return `digraph Dependencies
{
    graph [rankdir=LR,tooltip=" "]
${this.components.join("\n") }
}`;
		}
	}
}

interface StyleRule {
	matcher: RegExp;
	styles: any;
}

interface Options {
	codeTooltip: boolean;
	styleRules: StyleRule[];
	implicitDependencies : StyleRule[];
	missingDependencyStyles: any;
}

//copies any properties that target doesn't have from src to target, won't overwrite existing properties
function apply(src, target): void {
	Object.getOwnPropertyNames(src)
		.filter(x => !target.hasOwnProperty(x))
		.forEach(x => target[x] = src[x]);
}


function processTasks(tasks: gulp.Task[], options: Options): Infrastructure.Graph {
	var graph = new Infrastructure.Graph();
	tasks.forEach(task => {
		//this node
		var node = new Infrastructure.Node(task.name);

		if (options.codeTooltip) {
			node.props["tooltip"] = task.fn.toString().replace(/\r?\n/g, "&#10;").replace(/"/g, "\\\"");
		}

		options.styleRules
			.filter(r => r.matcher.test(task.name))
			.forEach(r => apply(r.styles, node.props));

		apply({style: "filled",fillcolor: "white"}, node.props);

		graph.components.push(node);

		//edges from this node
		task.dep && task.dep.forEach(d => {
			var edge = new Infrastructure.Edge(task.name, d);
			graph.components.push(edge);
		});

		//implicit dependencies

		var oneLineFn = task.fn && task.fn.toString().replace(/\s+/g, " ");

		options.implicitDependencies
			.forEach(r => {
				r.matcher.lastIndex = 0;
				var m : string[];
				while ((m = r.matcher.exec(oneLineFn)) !== null) {
					m.splice(0,1);
					var [match] = m.filter(x=>!!x).reverse();
					var deps = eval("["+match+"]");
					deps.forEach(d=>{
						var edge = new Infrastructure.Edge(task.name, d);
						apply(r.styles, edge.props);
						graph.components.push(edge);
					});
					if(!r.matcher.global){
						break;
					}
				}
				
			});
	});

	//Dependencies that don't exist
	var targets = {};
	graph.components.forEach(x => {
		if(x instanceof Infrastructure.Edge){
			targets[x.to] = true;
		}
	});
	graph.components.forEach(x => {
		if(x instanceof Infrastructure.Node){
			delete targets[x.name];
		}
	});

	Object.getOwnPropertyNames(targets).forEach(x => {
		var node = new Infrastructure.Node(x);
		apply(options.missingDependencyStyles, node.props);
		apply({ style: "filled", fillcolor: "white" }, node.props);

		graph.components.push(node);
	});


	return graph;
}

var defaults: Options = {
	codeTooltip: true,
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
	missingDependencyStyles: { fillcolor: "red" }
}

export = function (options: Options = <any>{}, gulpOverride?: gulp.Gulp): string {
	apply(defaults, options);

	var g = gulpOverride || gulp;
	var t = g.tasks;
	var taskArray = Object.getOwnPropertyNames(t).map(x => t[x]).sort((a, b) => a.name.localeCompare(b.name));
	
	var o = processTasks(taskArray, options);
	return o.toString();
};


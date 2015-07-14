///<reference path="typings/node/node.d.ts"/>
///<reference path="typings/gulp/gulp.d.ts"/>
import gulp = require('gulp');

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
			return ` [${propNames.map(x => `${x}="${this.props[x]}"`).join(',') }]`;
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
			node.props["tooltip"] = task.fn.toString().replace(/\r?\n/g, '&#10;').replace(/"/g, '\\"');
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

		//todo: implicit dependencies like watch and runSequence
	});

	//todo: dependencies that don't exist

	return graph;
}

var defaults: Options = {
	codeTooltip: true,
	styleRules: [
		{ matcher: /default/, styles: { shape: "doublecircle" } },
		{ matcher: /watch/, styles: { shape:'rarrow' } },
		{ matcher: /js|script|compile/, styles: { fillcolor: '#FEDA3E' } },
		{ matcher: /css|style|less|sass/, styles: { fillcolor: '#118EC4'} },
		{ matcher: /test|spec|unit/, styles: { fillcolor: '#B29259', shape:'tab' } }
	]
}

export = function (options: Options = <any>{}, gulpOverride?: gulp.Gulp): string {
	apply(defaults, options);

	var g = gulpOverride || gulp;
	var t = g.tasks;
	var taskArray = Object.getOwnPropertyNames(t).map(x => t[x]).sort((a, b) => a.name.localeCompare(b.name));
	
	var o = processTasks(taskArray, options);
	return o.toString();
};

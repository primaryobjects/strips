/*
Example Planning Graph - AI Planning with STRIPS and PDDL.
Builds a planning graph for a given domain and problem. Renders the graph using d3.js and saves to a file graph.svg.
Run using: node graph

Copyright (c) 2018 Kory Becker
http://primaryobjects.com/kory-becker

License MIT
*/
var graphPlan = require('./strips/graphplan');
var util = require('util');
var fs = require('fs');
var d3 = require('d3');
var jsdom = require('jsdom');
var xmldom = require('xmldom');

// Load the domain and problem.
graphPlan.load('./examples/dinner/domain.pddl', './examples/dinner/problem.pddl', function(domain, problem) {
    var graph = graphPlan.graph(domain, problem);
    //graphPlan.solve(domain, problem);

    var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="http://cdnjs.cloudflare.com/ajax/libs/d3/2.8.1/d3.v2.min.js"></script></body></html>'; // html file skull with a container div for the d3 dataviz
    jsdom.env({ features : { QuerySelector : true }, html : htmlStub, done : function(errors, window) {
        // Process the html document, like if we were at client side.

        // Display an image of the planning graph at layer 0.
        //drawTree(graphPlan.tree(graph), window);
        drawGraph(graphPlan.nodes(graph), window);
    }});
});

function drawTree(treeData, window) {
    var el = window.document.querySelector('#dataviz-container');

    var margin = {top: 20, right: 120, bottom: 20, left: 120}, width = 960 - margin.right - margin.left, height = 500 - margin.top - margin.bottom;
    var i = 0;
    var tree = d3.layout.tree().size([height, width]);
    var diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
    var svg = d3.select(el).append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var root = treeData[0];

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
    links = tree.links(nodes);

    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = d.depth * 180; });

    // Declare the nodes.
    var node = svg.selectAll("g.node").data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter the nodes.
    var nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", function(d) { 
    return "translate(" + d.y + "," + d.x + ")"; });

    nodeEnter.append("circle")
    .attr("r", 10)
    .style({ "fill": "#fff", stroke: 'steelblue', 'stroke-width': '3px' });

    nodeEnter.append("text")
    .attr("x", function(d) { 
    return d.children || d._children ? -13 : 13; })
    .attr("dy", ".35em")
    .attr("text-anchor", function(d) { 
    return d.children || d._children ? "end" : "start"; })
    .text(function(d) { return d.name; })
    .style({"fill-opacity": 1, 'fill': '#000'});

    // Declare the links.
    var link = svg.selectAll("path.link")
    .data(links, function(d) { return d.target.id; });

    // Enter the links.
    link.enter().insert("path", "g").style({"fill-opacity": 1, 'fill': 'none', stroke: '#ccc', 'stroke-width': '2px'}).attr("d", diagonal);

    saveGraph(d3, el, 'graph.svg');
}

function drawGraph(treeData, window) {
    var el = window.document.querySelector('#dataviz-container');
    var width = 800;
    var height = 1200;
    var isHorizontal = true;

    var force = d3.layout.force()
        .gravity(.05)
        .charge(-500)
        .size([width, height]);

    var svg = d3.select(el).append("svg:svg")
        .attr("width", width)
        .attr("height", height);

    var nodes = treeData.nodes,
        links = treeData.links;

    nodes.forEach(function(d, i) {
        d.x = width/2 + i;
        d.y = 100*d.depth + 100;
    });

    // Set root node position.
    nodes[0].fixed = true;
    nodes[0].x = width / 3;
    nodes[0].y = 50;

    force.nodes(nodes)
        .links(links)
        .start();

    var link = svg.selectAll("line")
        .data(links)
        .enter()
        .insert("svg:line")
        .attr("class", "link")
        .style('stroke', '#ccc');

    // Create node group.
    var gnodes = svg.selectAll('g.gnode')
     .data(nodes)
     .enter()
     .append('g')
     .classed('gnode', true);

    // Create nodes.
    var node = gnodes
        .append("circle")
        .attr("r", 8)
        .attr("class", "node")
        .style("fill", '#fff')
        .style("stroke", 'steelblue')
        .call(force.drag);

    // Create text on node groups.
    gnodes.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function(d) { return d.name })
        .style('font-family', 'arial')
        .style('font-size', '14px')
        .style('fill', '#000');

    // Display mutexes.
    gnodes.append("text")
        .attr("dx", 20)
        .attr("dy", 12)
        .style('font-family', 'arial')
        .style('font-size', '10px')
        .style('fill', '#f00')
        .text(d => { return formatMutex(d).map(mutex => mutex.name).join(', ') });

    force.on("tick", function(e) {
        var ky = e.alpha;
        
        links.forEach(function(d, i) {
          d.target.y += (d.target.depth * 100 - d.target.y) * 5 * ky;
        });

        nodes.forEach(function(d, i) {
            if(d.children) {
                if(i>0) {
                    var childrenSumX = 0;
                    d.children.forEach(function(d, i) {
                        childrenSumX += d.x;
                    });
                    var childrenCount = d.children.length;
                    d.x += ((childrenSumX/childrenCount) - d.x) * 5 * ky;
                }
                else {
                    d.x += (width/2 - d.x) * 5 * ky;
                };
            };
        });

        link.attr("x1", function(d) { return isHorizontal ? d.source.y : d.source.x; })
            .attr("y1", function(d) { return isHorizontal ? d.source.x : d.source.y; })
            .attr("x2", function(d) { return isHorizontal ? d.target.y : d.target.x; })
            .attr("y2", function(d) { return isHorizontal ? d.target.x : d.target.y; });

        gnodes.attr("transform", function(d) { 
            return 'translate(' + [isHorizontal ? d.y : d.x, isHorizontal ? d.x : d.y] + ')'; 
        });
    });

    for (var i = 10000; i > 0; --i) force.tick();
    force.stop();

    saveGraph(d3, el, 'graph.svg');
}

function saveGraph(d3, el, fileName) {
    // Save a d3 graph to an svg file.
    var svgGraph = d3.select(el).select('svg').html();
    //var svgXML = (new xmldom.XMLSerializer()).serializeToString(svgGraph);
    svgXML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">' + svgGraph + '</svg>';

    fs.writeFile(fileName, svgXML, err => { if (err) console.error(err); });

    console.log('Saved ' + fileName);
}

var formatMutex = function(action) {
    var formatted = [];

    if (action.mutex) {
        action.mutex.forEach(mutex => {
            // If this is a literal, include the operation (and, not).
            var op = mutex.operation;
            if (!op && mutex.precondition && mutex.precondition[0].action == mutex.action) {
                op = mutex.precondition[0].operation;
            }

            var name = mutex.name || ((mutex.op ? mutex.op + ' ' : '') + mutex.action +
                (mutex.parameters ? '-' + mutex.parameters.map(parameter => {
                    // Substitute parameters with map values.
                    return mutex.map ? mutex.map[parameter.parameter] : parameter.parameter;
                }).join(' ') : ''));

            if (name[name.length - 1] === '-') {
                name = (op ? op + ' ' : '') + mutex.action + 
                    (mutex.parameters ? '-' + mutex.parameters.map(parameter => {
                        // Substitute parameters with map values.
                        return mutex.map ? mutex.map[parameter] : parameter;
                    }).join(' ') : '');
            }

            formatted.push({ op: op, action: mutex.action, parameters: mutex.parameters, map: mutex.map, name: name, reason: mutex.reason });
        });
    }

    return formatted;
};

var displayMutex = function(action, isNoop) {
    console.log('Action: ' + (isNoop ? (action.precondition[0].operation + ' ' + action.action) : action.action));
    console.log('Mutexes:');

    formatMutex(action).forEach(mutex => {
        console.log('- ' + (mutex.op ? mutex.op + ' ' : '') + mutex.action + ' (' + mutex.reason + ')');
    });

    console.log('');
};

function printMutex(graph) {
    var index = 0;

    for (var i in graph) {
        var layer = graph[i];

        console.log('--- P' + index);
        console.log('');

        // Filter literals (noops) and actions.
        var noops = [];
        var actions = [];
        layer.forEach(function(item) {
            if (item.type == 'noop') {
                noops.push(item);
            }
            else {
                actions.push(item);
            }
        });

        // Display literals.
        layer.filter(item => item.type === 'noop').forEach(action => {
            displayMutex(action, true);
        });

        // If this is the final literal layer (P1), don't print out empty actions.
        if (i < graph.length - 1) {
	        console.log('--- A' + index);
	        console.log('');

	        // Display actions.
	        layer.filter(item => item.type !== 'noop').forEach(action => {
	            displayMutex(action);
	        });
    	}

        index++;
    }
};
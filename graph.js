/*
Example Planning Graph - AI Planning with STRIPS and PDDL.
Builds a planning graph for a given domain and problem. Renders the graph using d3.js and saves to a file graph.svg.
Run using: node --harmony graph

Copyright (c) 2015 Kory Becker
http://primaryobjects.com/kory-becker

License MIT
*/
var strips = require('strips');
var util = require('util');
var fs = require('fs');
var d3 = require('d3');
var jsdom = require('jsdom');
var xmldom = require('xmldom');

// Load the domain and problem.
strips.load('./examples/dinner/domain.pddl', './examples/dinner/problem.pddl', function(domain, problem) {
    var graph = strips.graph(domain, problem);

    var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="js/d3.v3.min.js"></script></body></html>'; // html file skull with a container div for the d3 dataviz
    jsdom.env({ features : { QuerySelector : true }, html : htmlStub, done : function(errors, window) {
        // Process the html document, like if we were at client side.

        // Display an image of the planning graph at layer 0.
        //drawTree(getTreeData(graph, 0), window);
        drawGraph(getGraphData(graph, 0), window);
    }});
});

//
// Utility methods for d3.js, to convert strips json into d3.js format and plot graphs.
//
function getTreeData(graph, layerIndex) {
    // Convert the graph into a d3 tree format, so we can plot the graph.
    var treeData = [ { name: 'root', parent: 'null' }];
    var parent = [];

    var i = layerIndex; // layer of graph to print
    var layer = graph[i];
    var actionHash = {};
    var actionHash2 = {};
    
    for (var j in layer) {
        var action = layer[j];

        // Format action name: 'cook x y z'.
        var name = action.action + '-';
        for (var k in action.parameters) {
            name += action.parameters[k].parameter + ' ';
        }

        // Start action node.
        var node = { name: name, parent: null, children: [] };
        var p0 = null;
        var p1 = null;

        // P0
        for (var k in action.precondition) {
            var act = action.precondition[k];

            var name = (act.operation || 'and') + '-' + act.action + '-';
            for (var l in act.parameters) {
                name += act.parameters[l] + ' ';
            }

            p0 = actionHash[name];
            if (!p0) {
                // New parent node.
                p0 = { name: name, parent: treeData[0].name, children: [ node ] };
                parent.push(p0);

                actionHash[name] = p0;
            }
            else {
                // This is a child node of the parent.
                p0.children.push(node);
            }   
                         
            node.parent = p0.name;
        }

        // P1
        for (var k in action.effect) {
            var act = action.effect[k];

            var name = (act.operation || 'and') + '-' + act.action + '-';
            for (var l in act.parameters) {
                name += act.parameters[l] + ' ';
            }

            p1 = { name: name, parent: node.name, children: [] };
            node.children.push(p1);
        }
    }

    treeData[0].children = parent;

    return treeData;
}

function getGraphData(graph, layerIndex) {
    // Convert the graph into a d3 force format, so we can plot the graph.
    var data = { nodes: [ { name: 'root', depth: 0 }], links: [] };
    var node2Hash = {};
    var node3Hash = {};

    var tree = getTreeData(graph, layerIndex);

    // Convert the d3 tree data format into a nodes/links force format.
    for (var i in tree[0].children) {
        var node = tree[0].children[i];

        data.nodes.push({ name: node.name, depth: 1 });
        var parentIndex = data.nodes.length - 1;
        data.links.push({ source: 0, target: parentIndex, depth: 1 });

        for (var j in node.children) {
            var node2 = node.children[j];

            if (node2.name.indexOf('noop') != -1 || !node2Hash[node2.name]) {
                data.nodes.push({ name: node2.name, depth: 2 });
                data.links.push({ source: parentIndex, target: data.nodes.length - 1, depth: 2 });

                // Remember this node along with its index, in case we need to link to it again.
                node2Hash[node2.name] = data.nodes.length - 1;
            }
            else {
                // This node already exists, so link to it.
                data.links.push({ source: parentIndex, target: node2Hash[node2.name], depth: 2 });
            }

            var parentIndex2 = data.nodes.length - 1;

            for (var k in node2.children) {
                var node3 = node2.children[k];

                if (node3.name.indexOf('noop') != -1 || !node3Hash[node3.name]) {
                    data.nodes.push({ name: node3.name, depth: 3 });
                    data.links.push({ source: parentIndex2, target: data.nodes.length - 1, depth: 3 });

                    // Remember this node along with its index, in case we need to link to it again.
                    node3Hash[node3.name] = data.nodes.length - 1;
                }
                else {
                    // This node already exists, so link to it.
                    data.links.push({ source: parentIndex2, target: node3Hash[node3.name], depth: 3 });
                }
            }            
        }
    }

    return data;
}

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
        .style('font', '8px sans-serif')
        .style('color', '#000');

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
    var svgGraph = d3.select(el).select('svg').attr('xmlns', 'http://www.w3.org/2000/svg');
    var svgXML = (new xmldom.XMLSerializer()).serializeToString(svgGraph[0][0]);
    
    fs.writeFile(fileName, svgXML);

    console.log('Saved ' + fileName);
}
// Run using: node --harmony graph
var strips = require('./strips/strips');
var util = require('util');
var fs = require('fs');
var d3 = require('d3');
var jsdom = require('jsdom');
var xmldom = require('xmldom');

var lastActionCount = 0;

// Load the domain and problem.
strips.load('./examples/dinner/domain.pddl', './examples/dinner/problem.pddl', function(domain, problem) {
    var graph = strips.graph(domain, problem, true);

    // Convert the graph into a d3 tree format, so we can plot the graph.
    var treeData = [ { name: 'root', parent: 'null' }];
    var parent = [];

    var i = 0; // layer of graph to print
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
            var ok = false;
            if (!p0) {
                ok = true;
                p0 = { name: name, parent: treeData[0].name, children: [ node ] };
                actionHash[name] = p0;
            }
            else {
                p0.children.push(node);
            }   
                         
            node.parent = p0.name;

            if (ok) {
                parent.push(p0);
            }
        }

        // P1
        for (var k in action.effect) {
            var act = action.effect[k];

            var name = (act.operation || 'and') + '-' + act.action + '-';
            for (var l in act.parameters) {
                name += act.parameters[l] + ' ';
            }

            /*p1 = actionHash2[name];
            var ok = false;
            if (!p1) {
                ok = true;*/
                p1 = { name: name, parent: node.name, children: [] };
                /*actionHash2[name] = p1;
            }
            else {
                // This node has multiple parents!!
                p1.parent = [ p1.parent, node ];
            }

            if (ok) {*/
                node.children.push(p1);
            //}
        }
    }

    treeData[0].children = parent;

    //console.log(util.inspect(treeData, true, 100, true));
    console.log(util.inspect(graph, true, 100, true));

    var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="js/d3.v3.min.js"></script></body></html>'; // html file skull with a container div for the d3 dataviz
    jsdom.env({ features : { QuerySelector : true }, html : htmlStub, done : function(errors, window) {
        // Process the html document, like if we were at client side.
        //drawTree(treeData, window);
        drawGraph(window);
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

    var svgGraph = d3.select(el).select('svg').attr('xmlns', 'http://www.w3.org/2000/svg');
    var svgXML = (new xmldom.XMLSerializer()).serializeToString(svgGraph[0][0]);
    fs.writeFile('graph.svg', svgXML);
}

function drawGraph(window) {
    var el = window.document.querySelector('#dataviz-container');
    var margin = {top: 20, right: 120, bottom: 20, left: 120}, width = 960 - margin.right - margin.left, height = 500 - margin.top - margin.bottom;
    var isHorizontal = true;
    var i = 0;
    var tree = d3.layout.tree().size([height, width]);
    var diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
    var svg = d3.select(el).append("svg");

    var json = {
  "nodes": [
    {"name": "d3"},
    {"name": "d3.svg"},
    {"name": "d3.svg.area"},
    {"name": "d3.svg.line"},
    {"name": "d3.scale"},
    {"name": "d3.scale.linear"},
    {"name": "d3.scale.ordinal"}
  ],
  "links": [
    {"source": 0, "target": 1},
    {"source": 1, "target": 2},
    {"source": 1, "target": 3},
    {"source": 0, "target": 4},
    {"source": 4, "target": 5},
    {"source": 4, "target": 6}
  ]
};

    svg.append("svg:defs")
        .selectAll("marker")
        .data(["end"]) 
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    var force = d3.layout.force()
        .nodes(json.nodes)
        .links(json.liks)
        .gravity(0.05)
        .distance(100)
        .charge(-300)
        .size([960, 500]);

    var link = svg.selectAll(".link")
        .data(json.links)
        .enter().append("line")
        .attr("class", "link")
        .style('stroke', '#ccc');

    var node = svg.selectAll(".node")
        .data(json.nodes)
        .enter().append("g")
        .attr("r", 6 - .75)
        .attr("class", "node")
        .style("fill", function(d) { return d3.scale.category20()(d.group); })
        .style("stroke", function(d) { return d3.rgb(d3.scale.category20()(d.group)).darker(); });

    node.append('circle')
        .attr("r", 10 - .75)
        .attr("class", "node")
        .style("fill", '#fff')
        .style("stroke", 'steelblue');

    node.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function(d) { return d.name })
        .style('font', '8px sans-serif')
        .style('color', '#000');

    force.on("tick", function(e) {
        var k = 6 * e.alpha;

        json.links.forEach(function(d, i) {
            d.source.y -= k;
            d.target.y += k;
        });

        link.attr("x1", function(d) { return (isHorizontal ? d.source.y : d.source.x); })
        .attr("y1", function(d) { return (isHorizontal ? d.source.x : d.source.y); })
        .attr("x2", function(d) { return (isHorizontal ? d.target.y : d.target.x); })
        .attr("y2", function(d) { return (isHorizontal ? d.target.x : d.target.y); });

        node.attr("transform", function(d) { return "translate(" + (isHorizontal ? d.y : d.x) + "," + (isHorizontal ? d.x : d.y) + ")"; });
    });

    force.nodes(json.nodes).links(json.links).start();
    for (var i = 1000; i > 0; --i) force.tick();
    force.stop();

    var svgGraph = d3.select(el).select('svg').attr('xmlns', 'http://www.w3.org/2000/svg');
    var svgXML = (new xmldom.XMLSerializer()).serializeToString(svgGraph[0][0]);
    fs.writeFile('graph.svg', svgXML);
}

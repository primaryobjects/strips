var strips = require('./strips');
var util = require('util');
var combinatorics = require('./js-combinatorics/combinatorics.js').Combinatorics;

/*
AI Planning with GraphPlan.

Copyright (c) 2018 Kory Becker
http://primaryobjects.com/kory-becker

License MIT
*/

GraphPlanManager = {
    // Set to true to display status information on the console while searching for a solution.
    verbose: false,
    // Set to redirect output to different stream, uses console.log() by default.
    output: function(text) { console.log(text); },

    load: function(domainPath, problemPath, callback, isCode) {
        return strips.load(domainPath, problemPath, callback, isCode);
    },

    graph: function(domain, problem, min = 1, max = 1) {
        // Get a planning graph.
        var graph = strips.graph(domain, problem, min, max);
        
        // Mark mutex relationships.
        return GraphPlanManager.markMutex(graph);
    },

    tree: function(graph, layerIndex = 0) {
        // Convert the graph into a tree format, consisting of a root and children.
        var treeData = [ { name: 'root', parent: 'null' }];
        var parent = [];

        var i = layerIndex; // layer of graph to print
        var layer = graph[i];
        var actionHash = {};
        var actionHash2 = {};
        
        for (var j in layer) {
            var action = layer[j];

            // Format action name: 'cook x y z'.
            var name = (action.type === 'noop' ? 'noop-' : '') + action.action + (action.parameters ? '-' : '');
            name += action.parameters ? action.parameters.map(parameter => { return parameter.parameter; }).join(' ') : '';

            // Start action node.
            var node = { name: name, parent: null, children: [], mutex: action.mutex };
            var p0 = null;
            var p1 = null;

            // P0
            for (var k in action.precondition) {
                var act = action.precondition[k];
                if (act.action) {
                    var name = (act.operation || 'and') + '-' + act.action + '-';
                    name += act.parameters ? act.parameters.join(' ') : ''

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
            }

            // P1
            for (var k in action.effect) {
                var act = action.effect[k];

                var name = (act.operation || 'and') + '-' + act.action + '-';
                name += act.parameters ? act.parameters.join(' ') : '';

                p1 = { name: name, parent: node.name, children: [], mutex: act.mutex };
                node.children.push(p1);
            }
        }

        treeData[0].children = parent;

        return treeData;
    },

    nodes: function(graph, layerIndex = 0) {
        // Convert the graph into a flat array format, consisting of nodes and links connected by index values.
        // Each node has a depth value and an index value (with 0 corresponding to the root node).
        // Each link has a source index, target index, and depth value.
        var index = 0;
        var data = { nodes: [ { name: 'root', index: index++, depth: 0 }], links: [] };
        var node2Hash = {};
        var node3Hash = {};

        var tree = GraphPlanManager.tree(graph, layerIndex);

        // Convert the d3 tree data format into a nodes/links force format.
        for (var i in tree[0].children) {
            var node = tree[0].children[i];

            var baseNode = { name: node.name, mutex: node.mutex, index: index++, depth: 1 };
            data.nodes.push(baseNode);

            var parentIndex = data.nodes.length - 1;
            data.links.push({ source: 0, target: parentIndex, depth: 1 });

            for (var j in node.children) {
                var node2 = node.children[j];

                baseNode.mutex = baseNode.mutex || node2.mutex;

                if (node2.name.indexOf('noop') != -1 || !node2Hash[node2.name]) {
                    data.nodes.push({ name: node2.name, mutex: node2.name.indexOf('noop') === -1 ? node2.mutex : null, index: index++, depth: 2 });
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
                        data.nodes.push({ name: node3.name, mutex: node3.mutex, index: index++, depth: 3 });
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
    },

    solve: function(domain, problem) {
        var isDone = false;
        var min = 1;
        var max = 1;

        // Load goal states.
        var goals = [];
        for (var i in problem.states[1].actions) {
            var action = problem.states[1].actions[i];
            action.operation = action.operation || 'and';

            var name = (action.type === 'noop' ? 'noop' : action.operation) + '-' + action.action + (action.parameters ? '-' : '');
            name += action.parameters.join(' ');
            action.key = name;

            goals.push({ key: action.key, action: action, solved: false });
        }

        while (!isDone) {
            GraphPlanManager.verbose && GraphPlanManager.output('Processing graph at layer ' + min);

            var isSatisfied = true;

            // Get a planning graph.
            var graph = GraphPlanManager.graph(domain, problem, min, max);

            // Convert the graph into a node/link format.
            var data = GraphPlanManager.nodes(graph, min - 1);

            // Get the literals from the last layer. (P1)
            var literals = data.nodes.filter(node => node.depth === 3);

            // Get the available actions for each goal. (A1)
            var actions = goals.map(goal => {
                // Find the matching literal for this goal.
                var literal = literals.find(literal => literal.name === goal.action.key && literal.depth === 3);

                // Find all links that lead to this literal.
                var links = data.links.filter(link => link.target === literal.index && link.depth === literal.depth);

                // Find all actions (A1) that this link points to. These are available actions that lead to this literal.
                return links.map(link => {
                    var action = data.nodes.find(node => node.index === link.source);
                    
                    if (action.mutex) {
                        action.mutex = action.mutex.map(mutex => {
                            mutex.key = mutex.action;

                            // Include the parameters from the parent literal as the name for this mutex.
                            var index = literal.name.lastIndexOf('-');
                            mutex.key += literal.name.substring(index);

                            return mutex;
                        });
                    }

                    action.goal = goal.action.key;

                    return action;
                });
            });

            GraphPlanManager.verbose && GraphPlanManager.output('Available actions');
            GraphPlanManager.verbose && GraphPlanManager.output(actions);

            // Select a combination of actions that we can take.
            var cmb = combinatorics.cartesianProduct(...actions);
            while (combo = cmb.next()) {
                GraphPlanManager.verbose && GraphPlanManager.output('Trying');
                GraphPlanManager.verbose && GraphPlanManager.output(combo);

                isSatisfied = true;

                // If any of these actions are mutex, we fail.
                for (var i=0; i<combo.length; i++) {
                    var action1 = combo[i];
                    var isMutex = false;

                    var mutexNames1 = action1.mutex ? action1.mutex.map(mutex => { return mutex.key; }) : [];

                    for (var j = i + 1; j<combo.length; j++) {
                        var action2 = combo[j];
                        var mutexNames2 = action2.mutex ? action2.mutex.map(mutex => { return mutex.key; }) : [];

                        // Is action2 in mutex with action1?
                        var isMutex1 = mutexNames1.find(name => name === action2.name);

                        // Is action1 in mutex with action2?
                        var isMutex2 = mutexNames2.find(name => name === action1.name);

                        var isMutex = isMutex1 || isMutex2;
                        if (isMutex) {
                            // This combination fails due to a mutex between these two actions.
                            GraphPlanManager.verbose && GraphPlanManager.output('Failed due to mutex between ' + action1.name + ' and ' + action2.name);
                            break;
                        }
                        else {
                            // Not a mutex, so far so good.
                            GraphPlanManager.verbose && GraphPlanManager.output('No mutex between ' + action1.name + ' and ' + action2.name);
                        }
                    }

                    if (isMutex) {
                        GraphPlanManager.verbose && GraphPlanManager.output('Failed to satisfy goal ' + action1.goal);
                        isSatisfied = false;
                        break;
                    }
                    else {
                        // Action satisfied.
                        GraphPlanManager.verbose && GraphPlanManager.output('Satisfied goal ' + action1.goal + ' with ' + action1.name);

                        var index = goals.findIndex(goal => goal.key === action1.goal);
                        goals[index].solved = true;
                    }
                }

                if (isSatisfied) {
                    // This combo works, stop searching combos.
                    GraphPlanManager.verbose && GraphPlanManager.output('All goals satisfied.');
                    GraphPlanManager.verbose && GraphPlanManager.output(combo);

                    // Update names of noops to use their original action name.
                    actions = combo.map(action => {
                        action.key = action.name;
                        return action;
                    });

                    // Find all links that lead to each action. These will be our new sub-goals.
                    literals = actions.map(action => {
                        var links = data.links.filter(link => link.target === action.index && link.depth === 2);

                        // Find all literals (P0) that this link points to. These are available literals that lead to this action.
                        return links.map(link => {
                            var literal = data.nodes.find(node => node.index === link.source);

                            if (literal.mutex) {
                                literal.mutex = literal.mutex.map(mutex => {
                                    mutex.key = mutex.action;
                                    return mutex;
                                });
                            }

                            literal.goal = action.key;
                            literal.key = literal.name;

                            return literal;
                        });
                    });

                    if (min > 1) {
                        goals = [];
                        literals.forEach(literal => {
                            goals.push({ key: literal[0].key, action: literal[0], solved: false });
                        });

                        GraphPlanManager.verbose && GraphPlanManager.output('Sub-goals added.');
                        GraphPlanManager.verbose && GraphPlanManager.output(goals);
                    }
                    
                    break;
                }
            }

            if (isSatisfied) {
                // Move back a layer and satisfy the sub-goals.
                min--;
                max--;
            }
            else {
                min++;
                max++;
            }

            isDone = min <= 0 || min >= 3;
        }
    },

    markMutex: function(graph) {
        // Mark all mutexes in the graph.
        var layerIndex = 0;
        graph[layerIndex] = GraphPlanManager.markMutexLayer(graph[layerIndex]);

        while (++layerIndex < graph.length) {
            // Carry forward mutexes from literals on P1 to next layer (which starts on P1).
            for (var i in graph[layerIndex - 1]) { // 7
                for (var ii in graph[layerIndex - 1][i].effect) {
                    var literal1 = graph[layerIndex - 1][i].effect[ii];

                    // Find the P1 noop action that matches this index.
                    for (var j in graph[layerIndex]) { // 12
                        // Ignore 'done' object.
                        if (graph[layerIndex][j].precondition) {
                            if (graph[layerIndex][j].type == 'noop' && graph[layerIndex][j].action == literal1.action && graph[layerIndex][j].precondition[0].operation == literal1.operation && JSON.stringify(graph[layerIndex][j].precondition[0].parameters) == JSON.stringify(literal1.parameters)) {
                                // Found the matching literal. Now copy the mutexs.
                                graph[layerIndex][j].precondition = JSON.parse(JSON.stringify(graph[layerIndex][j].precondition));
                                graph[layerIndex][j].precondition.mutex = literal1.mutex;
                                graph[layerIndex][j].effect = JSON.parse(JSON.stringify(graph[layerIndex][j].effect));
                                
                                // Shouldn't need to do this?
                                if (graph[layerIndex][j].precondition.mutex) {
                                    graph[layerIndex][j].mutex = JSON.parse(JSON.stringify(graph[layerIndex][j].precondition.mutex));
                                }
                            }
                        }
                    }
                }
            }

            graph[layerIndex] = GraphPlanManager.markMutexLayer(graph[layerIndex]);
        }

        return graph;
    },

    markMutexLayer: function(actions) {
        // Mark all mutexes on the given layer.
        // Create a hash entry for each action, for fast lookup.
        var effectHash = {};
        for (var i in actions) {
            var action = actions[i];

            // Ensure precondition and effect are not copies, but separate memory objects.
            //action.precondition = JSON.parse(JSON.stringify(action.precondition));
            action.effect = JSON.parse(JSON.stringify(action.effect));

            for (var j in action.effect) {
                var effect = action.effect[j];

                // Set the effect as the hash key and its parent action as the value.
                effectHash[JSON.stringify(effect)] = effectHash[JSON.stringify(effect)] || [];
                effectHash[JSON.stringify(effect)].push(action);
            }
        }

        // Calculate mutex relationships on the layer.
        actions = GraphPlanManager.markActionsInconsistentEffects(actions, effectHash);
        actions = GraphPlanManager.markActionsInterference(actions, effectHash);
        actions = GraphPlanManager.markLiteralsNegation(actions, effectHash);
        actions = GraphPlanManager.markLiteralsInconsistentSupport(actions, effectHash);

        // Cleanup, remove mutexHash from actions.
        for (var i in actions) {
            for (var j in actions[i].effect) {
                delete actions[i].effect[j].mutexHash;
            }

            delete actions[i].mutexHash;
        }

        return actions;        
    },

    markActionsInconsistentEffects: function(actions, effectHash) {
        // Calculates mutex relationships amongst actions: effect of one action is negation of effect of another.
        // Go through each effect and check if an opposite effect exists. If so, the actions are mutex.
        // Check if an opposite effect exists for each effect.
        for (var i in actions) {
            var action = actions[i];

            if (action.type != 'noop') {
                for (var j in action.effect) {
                    var effect = action.effect[j];
                    
                    // Does an opposite effect exist?
                    var oppositeEffect = JSON.parse(JSON.stringify(effect));
                    oppositeEffect.operation = effect.operation == 'not' ? 'and' : 'not';

                    var mutexAction = effectHash[JSON.stringify(oppositeEffect)];
                    for (var k in mutexAction) {
                        var subMutexAction = mutexAction[k];

                        // Found an opposite. The action at the hash value is a mutex with the current action and vice-versa.
                        action.mutex = action.mutex || [];
                        action.mutexHash = action.mutexHash || {};
                        var obj = { action: subMutexAction.action, precondition: subMutexAction.precondition, effect: subMutexAction.effect, reason: 'inconsistentEffect' };
                        var objStr = JSON.stringify(obj);
                        if (!action.mutexHash[objStr]) {
                            action.mutex.push(obj);
                            action.mutexHash[objStr] = 1;
                        }

                        subMutexAction.mutex = subMutexAction.mutex || [];
                        subMutexAction.mutexHash = subMutexAction.mutexHash || {};
                        obj = { action: action.action, precondition: action.precondition, effect: action.effect, reason: 'inconsistentEffect' };
                        objStr = JSON.stringify(obj);
                        if (!subMutexAction.mutexHash[objStr]) {
                            subMutexAction.mutex.push(obj);
                            subMutexAction.mutexHash[objStr] = 1;
                        }
                    }
                }
            }
        }

        return actions;
    },

    markActionsInterference: function(actions, effectHash) {
        // Calculates mutex relationships amongst actions: one action deletes the precondition of the other.
        // Go through each precondition and check if an opposite effect exists that is not from our own action. If so, the actions are mutex.
        // Now check if an opposite effect exists for each precondition.
        for (var i in actions) {
            var action = actions[i];

            if (action.type != 'noop') {
                for (var j in action.precondition) {
                    var precondition = action.precondition[j];
                    
                    // Does an opposite effect exist?
                    var oppositeEffect = JSON.parse(JSON.stringify(precondition));
                    oppositeEffect.operation = precondition.operation == 'not' ? 'and' : 'not';

                    var mutexAction = effectHash[JSON.stringify(oppositeEffect)];
                    for (var k in mutexAction) {
                        var subMutexAction = mutexAction[k];
                        if (subMutexAction != action) {
                            // Found an opposite (not us). The action at the hash value is a mutex with the current action and vice-versa.
                            action.mutex = action.mutex || [];
                            action.mutexHash = action.mutexHash || {};
                            var obj = { action: subMutexAction.action, precondition: subMutexAction.precondition, effect: subMutexAction.effect, reason: 'interference' };
                            var objStr = JSON.stringify(obj);
                            if (!action.mutexHash[objStr]) {
                                action.mutex.push(obj);
                                action.mutexHash[objStr] = 1;
                            }

                            subMutexAction.mutex = subMutexAction.mutex || [];
                            subMutexAction.mutexHash = subMutexAction.mutexHash || {};
                            obj = { action: action.action, precondition: action.precondition, effect: action.effect, reason: 'interference' };
                            objStr = JSON.stringify(obj);
                            if (!subMutexAction.mutexHash[objStr]) {
                                subMutexAction.mutex.push(obj);
                                subMutexAction.mutexHash[objStr] = 1;
                            }
                        }
                    }
                }
            }
        }

        return actions;        
    },

    markActionsCompetingNeeds: function(actions) {
        // Calculates mutex relationships amongst actions: the actions have preconditions that are mutex at level i-1.
    },

    markLiteralsNegation: function(actions, effectHash) {
        // Calculates mutex relationships amongst literals: if they are negations of one another. For noops, this sets mutexes on the literal precondition and effect (P0, P1) since they are the same. For actions, it sets it just on the effect.
        for (var i in actions) {
            var action = actions[i];

            for (var j in action.effect) {
                var effect = action.effect[j];
                
                // Does an opposite effect exist?
                var oppositeEffect = JSON.parse(JSON.stringify(effect));
                oppositeEffect.operation = effect.operation == 'not' ? 'and' : 'not';

                var mutexAction = effectHash[JSON.stringify(oppositeEffect)];
                for (var k in mutexAction) {
                    var subMutexAction = mutexAction[k];
                    // Found an opposite. The action at the hash value is a mutex with the current action and vice-versa.
                    effect.mutex = effect.mutex || [];
                    effect.mutexHash = effect.mutexHash || {};
                    var obj = { action: oppositeEffect.action, operation: oppositeEffect.operation, parameters: oppositeEffect.parameters, reason: 'negation' };
                    var objStr = JSON.stringify(obj);
                    if (!effect.mutexHash[objStr]) {
                        effect.mutex.push(obj);
                        effect.mutexHash[objStr] = 1;
                    }
                }
            }
        }

        return actions;
    },

    isActionMutex: function(action1, action2) {
        // Check if action2 exists within action1.mutex.
        for (var i in action1.mutex) {
            var action = action1.mutex[i];

            // Clean up before equality test.
            action = JSON.parse(JSON.stringify(action));
            for (var j in action.precondition) {
                delete action.precondition[j].mutex;                            
                delete action.precondition[j].mutexHash;
            }
            for (var j in action.effect) {
                delete action.effect[j].mutex;                            
                delete action.effect[j].mutexHash;
            }

            action2 = JSON.parse(JSON.stringify(action2));
            for (var j in action2.precondition) {
                delete action2.precondition[j].mutex;                            
                delete action2.precondition[j].mutexHash;
            }
            for (var j in action2.effect) {
                delete action2.effect[j].mutex;                            
                delete action2.effect[j].mutexHash;
            }
            delete action2.mutex;
            delete action2.mutexHash;

            if ((action.action == action2.action && JSON.stringify(action.precondition) == JSON.stringify(action2.precondition) && JSON.stringify(action.effect) == JSON.stringify(action2.effect)) ||
                (action.action == action2.action && action.operation == action2.operation && JSON.stringify(action.parameters) == JSON.stringify(action2.parameters)) ||
                (action2.type == 'noop' && action.action == action2.action && action.operation == action2.precondition[0].operation && JSON.stringify(action.parameters) == JSON.stringify(action2.precondition[0].parameters))) {
                return true;
            }
        }

        return false;
    },

    markLiteralsInconsistentSupport: function(actions, effectHash) {
        // Take 2 literals (A, B). Find their parent actions. If each action in A is mutex with every single action in B, then the literals are mutex too.
        for (var i in actions) {
            var action = actions[i];

            // Step 1: Get the first literal.
            for (var j in action.effect) {
                var literal1 = action.effect[j];

                for (var i2 in actions) {
                    if (i2 == i) continue;
                    var action2 = actions[i2];

                    // Step 2: Get the second literal.
                    for (var j2 in action2.effect) {
                        var literal2 = action2.effect[j2];

                        // Step 3: Find the parent actions.
                        var literal1b = JSON.parse(JSON.stringify(literal1));
                        delete literal1b.mutex;
                        delete literal1b.mutexHash;                        
                        var parentActions1 = effectHash[JSON.stringify(literal1b)];
                        var literal2b = JSON.parse(JSON.stringify(literal2));
                        delete literal2b.mutex;
                        delete literal2b.mutexHash;                        
                        var parentActions2 = effectHash[JSON.stringify(literal2b)];

                        // Step 4: Check if each action in A is mutex with every single action in B.
                        var isMutex = true;
                        
                        for (var k in parentActions1) {
                            var parentAction1 = parentActions1[k];

                            for (var l in parentActions2) {
                                var parentAction2 = parentActions2[l];

                                // Test mutex. Must be true for all of parentActions2.
                                if (!GraphPlanManager.isActionMutex(parentAction1, parentAction2)) {
                                    isMutex = false;
                                }
                            }
                        }

                        if (isMutex) {
                            // literal1 is mutex with literal2.
                            literal1.mutex = literal1.mutex || [];
                            literal1.mutexHash = literal1.mutexHash || {};

                            var mutex = { action: literal2.action, operation: literal2.operation, parameters: literal2.parameters, reason: 'inconsistentSupport' };
                            var mutexStr = JSON.stringify(mutex);
                            if (!literal1.mutexHash[mutexStr]) {
                                literal1.mutex.push(mutex);
                                literal1.mutexHash[mutexStr] = 1;
                            }
                        }
                    }
                }
            }
        }

        return actions;
    }
};

module.exports = GraphPlanManager;
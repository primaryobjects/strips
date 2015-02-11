var fs = require('fs');
var PEG = require("pegjs");
var util = require('util');
var combinatorics = require('./js-combinatorics/combinatorics.js').Combinatorics;

/*
AI Planning with STRIPS and PDDL.

Copyright (c) 2015 Kory Becker
http://primaryobjects.com/kory-becker

License MIT
*/

StripsManager = {
    // Set to true to use permutationCombination() instead of baseN() for parameter values. It will be faster, but might miss some solutions.
    fast: false,
    // Set to true to display status information on the console while searching for a solution.
    verbose: false,
    // PEG.js grammar for domain.
    grammarDomainPath: __dirname + '/grammar/grammar-domain.txt',
    // PEG.js grammer for problem.
    grammarProblemPath: __dirname + '/grammar/grammar-problem.txt',

    loadGrammar: function(grammarFileName, codeFileName, callback) {
        // Applies a PEG.js grammar against a code file and returns the parsed JSON result.
        fs.readFile(grammarFileName, 'utf8', function(err, grammar) {
            if (err) throw err;
         
            var parser = PEG.buildParser(grammar);
         
            fs.readFile(codeFileName, 'utf8', function(err, code) {
                if (err) throw err;

                if (callback) {
                    callback(parser.parse(code));
                }
            });
        });
    },

    loadDomain: function(filePath, callback) {
        // Applies the PEG.js grammar for a STRIPS PDDL domain file and returns the parsed JSON result.
        StripsManager.loadGrammar(StripsManager.grammarDomainPath, filePath, function(result) {
            if (callback) {
                callback(result);
            }
        });
    },

    loadProblem: function(filePath, callback) {
        // Applies the PEG.js grammar for a STRIPS PDDL problem file and returns the parsed JSON result.
        StripsManager.loadGrammar(StripsManager.grammarProblemPath, filePath, function(result) {
            // Populate list of parameter values.
            var values = {};
            for (var i in result.states) {
                var state = result.states[i];
                for (var j in state.actions) {
                    var action = state.actions[j];

                    // Collect all unique parameter values.
                    for (var k in action.parameters) {
                        values[action.parameters[k]] = 1;
                    }
                }
            }

            // Set parameter values list on result.
            result.values = {};
            for (var key in values) {
                // Look-up type for this value in the objects declaration.
                var type = null;

                for (var i in result.objects) {
                    for (var j in result.objects[i].parameters) {
                        var parameter = result.objects[i].parameters[j];
                        if (parameter == key) {
                            type = result.objects[i].type;
                            break;
                        }
                    }

                    if (type)
                        break;
                }

                result.values[type] = result.values[type] || [];
                result.values[type].push(key);
            }

            if (callback) {
                callback(result);
            }
        });
    },
    
    load: function(domainPath, problemPath, callback) {
        // Load the domain and actions.
        StripsManager.loadDomain(domainPath, function(domain) {
            // Load the problem.
            StripsManager.loadProblem(problemPath, function(problem) {
                // Give a copy of the possible parameter values to the domain.
                domain.values = problem.values;

                if (domain.requirements.indexOf('typing') != -1 && domain.values.null) {
                    console.log('ERROR: :typing is specified in domain, but not all parameters declare a type. Verify problem file contains an :objects section.');
                }

                // Load list of applicable combinations of parameter values for each action.
                for (var i in domain.actions) {
                    // Get all applicable parameter combinations for the current action.
                    domain.actions[i].parameterCombinations = StripsManager.parameterCombinations(domain, domain.actions[i]);
                }

                if (callback) {
                    callback(domain, problem);
                }
            });
        });
    },

    predicateCombinations: function(state) {
        // For "Blocks World" problems, combinatorics.permutationCombination(state) is sufficient and faster, but otherwise, baseN(state) gives the full range of possible parameter values.
        // First, convert the values object { block: [ 'a', 'b'], table: ['x', 'y'] } into a flat array [ 'a', 'b', 'x', 'y' ].
        var values = [];
        for (var key in state) {
            for (var i in state[key]) {
                values.push(state[key][i]);
            }
        }

        var cmb = StripsManager.fast ? combinatorics.permutationCombination(values) : combinatorics.baseN(values);

        return cmb.toArray();
    },
    
    parameterCombinations: function(domain, action) {
        // Go through each required parameter, look at the type (if using :typing), and use all combinations of values belonging to that type.
        var cases = [];
        var parameters = action.parameters;

        // Is :typing enabled on the domain?
        if (domain.requirements.indexOf('typing') > -1) {
            // First, get a count of how many parameters we need of each type.
            var error = false;
            var typeCounts = {};
            for (var j in parameters) {
                if (!parameters[j].type) {
                    console.log('ERROR: :typing is specified, but no type found in action "' + action.action + '" for parameter "' + parameters[j].parameter + '"');
                    error = true;
                    break;
                }

                typeCounts[parameters[j].type] = (typeCounts[parameters[j].type] + 1) || 1;
            }

            if (!error) {
                // Next, get the combination values.
                for (var key in typeCounts) {
                    // Get all combination values for this parameter type.
                    var values = domain.values[key];
                    var cmb = combinatorics.baseN(values, 1);

                    cmb.forEach(function(combo) {
                        cases.push(combo);
                    });
                }
            }

            // Get a combination of all possibilities of the discovered parameters.
            var cmb = combinatorics.permutation(cases, parameters.length);

            // Filter the combinations to valid parameter types and unique combos.
            var uniqueCombos = {};
            cases = cmb.filter(function (combo) {
                // Does this combo have valid values for the type? Make sure each value to be set for a parameter index exists in the list of types under the domain.
                var key = '';

                for (var ci in combo) {
                    var value = combo[ci][0];
                    var type = parameters[ci].type;
                    key += value;

                    // Check if this value exists in the list for this type.
                    if (domain.values[type].indexOf(value) == -1) {
                        // The value is not part of this type, that means this combo is invalid.
                        return false;
                    }
                }

                if (uniqueCombos[key]) {
                    // Duplicate combo. Since we only take the first value in any lists as 1 value per parameter, we can end up with duplicates.
                    return false;
                }

                uniqueCombos[key] = 1;

                return true;
            });

            var cases2 = [];
            for (var j in cases) {
                var subCase = [];
                for (var k in cases[j]) {
                    subCase.push(cases[j][k][0]);
                }

                cases2.push(subCase);
            }

            cases = cases2;
        }
        else {
            // Typing not being used, just get all action combinations for the current state.
            cases = StripsManager.predicateCombinations(domain.values);
        }

        return cases;
    },

    andCount: function(precondition) {
        // Returns the count for the number of 'and' matches in a precondition.
        var count = 0;
        
        for (var i in precondition) {
            var action = precondition[i];
            var operation = action.operation || 'and'; // If no operation is specified, default to 'and'. Must explicitly provide 'not' where required.
            
            if (operation == 'and') {
                count++;
            }
        }
        
        return count;
    },
    
    isEqual: function(action1, action2) {
        // Returns true if action1 == action2. Compares name and parameters.
        var result = false;

        // Find matching action name.
        if (action1.action == action2.action && action1.parameters.length == action2.parameters.length) {
            result = true;

            // Find matching parameters.
            for (var k in action1.parameters) {
                // Use the map, if available (in the case of a non-concrete action). Otherwise, use the concrete parameter values.
                var value1 = action1.parameters[k].parameter ? action1.parameters[k].parameter : action1.parameters[k];
                var value2 = action2.parameters[k].parameter ? action2.parameters[k].parameter : action2.parameters[k];

                var parameter1 = action1.map ? action1.map[value1] : value1;
                var parameter2 = action2.map ? action2.map[value2] : value2;

                if (parameter1 != parameter2) {
                    result = false;
                    break;
                }
            }
        }
        
        return result;
    },

    isPreconditionSatisfied: function(state, precondition) {
        // Returns true if the precondition is satisfied in the current state.
        // This function works by making sure all 'and' preconditions exist in the state, and that all 'not' preconditions do not exist in the state.
        var matchCount = 0;
        var andCount = StripsManager.andCount(precondition); // The state needs to contain the actions in action.precondition for 'and'. For 'not', we fail immediately. So, let's count the number of 'and' matches and make sure we satisfy them.

        for (var i = 0; i < precondition.length; i++) {
            // Find a case that contains this action and parameters.
            for (var l in state.actions) {
                var match = true;
                operation = precondition[i].operation || 'and'; // If no operation is specified, default to 'and'. Must explicitly provide 'not' where required.

                // Check if the name and number of parameters match for the current action and precondition.
                if (state.actions[l].action == precondition[i].action && state.actions[l].parameters.length == precondition[i].parameters.length) {
                    // Check if the parameter values match.
                    for (var m in precondition[i].parameters) {
                        if (precondition[i].parameters[m] != state.actions[l].parameters[m]) {
                            match = false;
                        }
                    }
                }
                else {
                    match = false;
                }

                if (match) {
                    // This action exists in the state.
                    if (operation == 'and') {
                        matchCount++;
                    }
                    else {
                        // Not, set to -1 so this action is not saved as applicable.
                        matchCount = -1;
                        break;
                    }
                }
            }
            
            if (matchCount == -1)
                break;
        }
        
        return (matchCount == andCount);
    },

    getApplicableActionInState: function(state, action) {
        // This function returns an applicable concrete action for the given state, or null if the precondition is not satisfied.
        var resolvedAction = null;

        // Does the filled-in precondition exist in the state test cases?
        if (StripsManager.isPreconditionSatisfied(state, action.precondition)) {
            // This action is applicable.
            // Assign a value to each parameter of the effect.
            var populatedEffect = JSON.parse(JSON.stringify(action.effect));
            for (var m in action.effect) {
                var effect = action.effect[m];

                for (var n in effect.parameters) {
                    var parameter = effect.parameters[n];
                    var value = action.map[parameter];
                    
                    if (value) {
                        // Assign this value to all instances of this parameter in the effect.
                        populatedEffect[m].parameters[n] = value;
                    }
                    else {
                        console.log('* ERROR: Value not found for parameter ' + parameter + '.');
                    }
                }
            }
            
            resolvedAction = JSON.parse(JSON.stringify(action));
            resolvedAction.effect = populatedEffect;
            resolvedAction.map = action.map;
        }
        
        return resolvedAction;
    },
    
    applicableActions: function(domain, state) {
        // Returns an array of applicable concrete actions for the current state, using the possible parameter values in domain.values array (Example: values = ['a', 'b', 't1', 't2', 't3']).
        // Test each domain action precondition against the cases. If one holds valid, then that action is applicable in the current state.
        var result = [];

        if (!domain.values || domain.values.length == 0) {
            console.log('ERROR: No parameter values found in domain.values.');
            return;
        }

        for (var i in domain.actions) {
            var action = domain.actions[i]; // op1
            var parameters = action.parameters; // x1, x2, x3
            var populatedAction = JSON.parse(JSON.stringify(action)); // copy for replacing parameters with actual values.
            var parameterMapHash = {};

            // Assign values to the parameters for each test case.
            for (var j in action.parameterCombinations) {
                var testCase = action.parameterCombinations[j];
                var nindex = 0;
                
                var parameterMap = []; // map of parameter values to be populated
                // Initialize default parameter values for this action. We'll set concrete values next.
                for (var j in parameters) {
                    parameterMap[parameters[j].parameter] = testCase[nindex++];
                }

                // Get the action's precondition parameters.
                var testCaseIndex = 0;
                for (var k in action.precondition) {
                    var precondition = action.precondition[k];
                    var populatedPreconditionPart = JSON.parse(JSON.stringify(precondition)); // copy for replacing parameters with actual values.
                    
                    // Found a matching action. So far, so good.
                    var parameterIndex = 0;
                    
                    // Assign a value to each parameter of the precondition.
                    for (var l in precondition.parameters) {
                        var parameter = precondition.parameters[l];
                        var value = parameterMap[parameter];

                        // Assign this value to all instances of this parameter in the precondition.
                        populatedPreconditionPart.parameters[l] = value;
                    }
                    
                    populatedAction.precondition[k] = populatedPreconditionPart;
                    populatedAction.map = parameterMap;
                }

                // Does the filled-in precondition exist in the test cases?
                var applicableAction = StripsManager.getApplicableActionInState(state, populatedAction);
                if (applicableAction) {
                    // This action is applicable in this state. Make sure we haven't already found this one.
                    var isDuplicate = false;
                    for (var rr in result) {
                        var action1 = result[rr];
                        if (StripsManager.isEqual(applicableAction, action1)) {
                            isDuplicate = true;
                            break;
                        }
                    }

                    if (!isDuplicate) {
                        result.push(applicableAction);
                    }
                }
            }
        }

        return result;
    },

    applyAction: function(action, state) {
        // Applies an action on a state and returns the new state. It is assumed that the precondition has already been tested.
        var result = JSON.parse(JSON.stringify(state));

        for (var i in action.effect) {
            var actionOperation = action.effect[i];
            var operation = actionOperation.operation || 'and';
            
            if (operation == 'and') {
                // Make sure this predicate doesn't already exist in the state.
                var isExists = false;
                for (var j in state.actions) {
                    // Find matching action.
                    if (StripsManager.isEqual(state.actions[j], actionOperation)) {
                        isExists = true;
                        break;
                    }
                }

                if (!isExists) {
                    // Add this predicate to the state.
                    result.actions.push(actionOperation);
                }                
            }
            else {
                // Remove this predicate from the state.
                for (var j in state.actions) {
                    // Find matching action.
                    if (StripsManager.isEqual(state.actions[j], actionOperation)) {
                        // This is our target. Find the same item in our result list (since result may now have different indices than state.actions, if new actions were added via 'and').
                        for (var k in result.actions) {
                            if (StripsManager.isEqual(state.actions[j], result.actions[k])) {
                                result.actions.splice(k, 1);
                            }
                        }
                    }
                }
            }
        }

        return result;
    },

    getChildStates: function(domain, state) {
        // Returns the list of child states for the current state, after applying all applicable actions.
        var children = [];

        var actions = StripsManager.applicableActions(domain, state);
        for (var i in actions) {
            var action = actions[i];
            children.push({ state: StripsManager.applyAction(action, state), action: action });
        }

        return children;
    },

    isGoal: function(state, goalState) {
        // Returns true if the state contains the goal conditions.
        var result = true;

        for (var i in goalState.actions) {
            var goalAction = goalState.actions[i];
            var operation = goalAction.operation || 'and';

            if (operation == 'and') {
                // Make sure this action exists in the state.
                var isExists = false;
                for (var j in state.actions) {
                    if (StripsManager.isEqual(state.actions[j], goalAction)) {
                        isExists = true;
                        break;
                    }
                }

                // If we found a match, then this goal action exists. Move on to next tests.
                if (!isExists) {
                    result = false;
                    break;
                }
            }
            else {
                // Make sure this action does not exist in the state.
                var isExists = false;
                for (var j in state.actions) {
                    if (StripsManager.isEqual(state.actions[j], goalAction)) {
                        // This is our target, so it fails the goal test.
                        isExists = true;
                        break;
                    }
                }

                if (isExists) {
                    // Found a match for 'not', so goal fails.
                    result = false;
                    break;
                }
            }
        }

        return result;
    },

    actionToString: function(action) {
        var result = action.action;

        for (var key in action.map) {
            result += ' ' + action.map[key];
        }

        return result;
    },

    stateToString: function(state) {
        var result = '';
        var actionList = [];

        for (var i in state.actions) {
            var action = state.actions[i];

            var actionString = '(' + action.action;
            for (var j in action.parameters) {
                actionString += ' ' + action.parameters[j];
            }
            actionString += ')';

            // Keep a list of actions so we can sort them. This allows two states with different orderings of the same actions to result in the same string.
            actionList.push(actionString);
        }

        for (var i in actionList.sort()) {
            if (i > 0) {
                result += ' ';
            }
            result += actionList[i];
        }

        return result;
    },

    solve: function(domain, problem, isDfs, maxSolutions) {
        // Find solution.
        if (isDfs == null) {
            isDfs = true;
        }
        
        maxSolutions = maxSolutions || 1;

        return isDfs ? StripsManager.solveDfs(domain, problem.states[0], problem.states[1], maxSolutions) :
                       StripsManager.solveBfs(domain, problem.states[0], problem.states[1], maxSolutions);
    },

    solveDfs: function(domain, state, goalState, maxSolutions, visited, depth) {
        // Find all solutions using depth-first-search.
        var solutions = [];

        visited = visited ? JSON.parse(JSON.stringify(visited)) : {};
        depth = depth || 0;
        state = state.state ? state : { state: state }; // format state to mirror child, which includes parent and action in recursion.

        // If this is the initial state, add it to the visited list.
        if (Object.keys(visited).length == 0) {
            visited[StripsManager.stateToString(state.state)] = 1;
        }

        // Check for goal.
        if (StripsManager.isGoal(state.state, goalState)) {
            // Compile solution path.
            var path = [];
            var steps = depth;

            while (state != null && state.parent != null) {
                // Since we move from goal backwards, add this step to the front of the array (rather than the end, otherwise it would be in reverse order).
                path.unshift(StripsManager.actionToString(state.action));
                state = state.parent;
            }

            return [ { steps: steps, path: path } ];
        }
        else {
            // Get child states by applying actions to current state.
            var fringe = StripsManager.getChildStates(domain, state.state);

            if (StripsManager.verbose) {
                console.log('Depth: ' + depth + ', ' + fringe.length + ' child states.');
            }
            
            // Run against each new child state.
            for (var i in fringe) {
                var child = fringe[i];
                child.parent = state;
                var key = StripsManager.stateToString(child.state);

                if (!visited[key]) {
                    visited[key] = 1;
                    var subSolutions = StripsManager.solveDfs(domain, child, goalState, maxSolutions, visited, depth + 1);
                    if (subSolutions.length > 0) {
                        // This branch has a solution(s).
                        for (var j in subSolutions) {
                            solutions.push(subSolutions[j]);

                            if (solutions.length >= maxSolutions) {
                                break;
                            }
                        }

                        if (solutions.length >= maxSolutions) {
                            break;
                        }
                    }
                }
            }
        }

        return solutions;
    },

    solveBfs: function(domain, state, goalState, maxSolutions) {
        // Find first solution using breadth-first-search.
        var fringe = [ { state: state, depth: 0 } ]; // Start with the initial state on the fringe.
        var visited = {};
        var depth = 0;
        var solutions = [];

        while (fringe.length > 0) {
            // Investigate the next state with the lowest depth.
            var current = fringe[0];

            // Remove this state from the fringe.
            fringe.shift();

            // Mark this state as visited.
            visited[StripsManager.stateToString(current.state)] = 1;

            // Check for goal.
            if (StripsManager.isGoal(current.state, goalState)) {
                // Compile solution path.
                var path = [];
                var steps = current.depth;

                while (current != null && current.parent != null) {
                    // Since we move from goal backwards, add this step to the front of the array (rather than the end, otherwise it would be in reverse order).
                    path.unshift(StripsManager.actionToString(current.action));
                    current = current.parent;
                }

                solutions.push({ steps: steps, path: path });

                if (solutions.length >= maxSolutions) {
                    return solutions;
                }
            }
            else {
                // Get child states by applying actions to current state.
                var children = StripsManager.getChildStates(domain, current.state);

                // Add the children to the fringe.
                for (var i in children) {
                    var child = children[i];
                    child.parent = current;
                    child.depth = current.depth + 1;

                    if (!visited[StripsManager.stateToString(child.state)]) {
                        fringe.push(child);
                    }
                }
            }

            if (StripsManager.verbose) {
                console.log('Depth: ' + current.depth + ', ' + fringe.length + ' child states.');
            }
        }

        return solutions;
    }
};

module.exports = StripsManager;
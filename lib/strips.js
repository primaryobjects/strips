var fs = require('fs');
var PEG = require("pegjs");
var util = require('util');
var combinatorics = require('./js-combinatorics/combinatorics.js').Combinatorics;

StripsManager = {
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
        StripsManager.loadGrammar(__dirname + '/grammar/grammar-domain.txt', filePath, function(result) {
            if (callback) {
                callback(result);
            }
        });
    },

    loadProblem: function(filePath, callback) {
        // Applies the PEG.js grammar for a STRIPS PDDL problem file and returns the parsed JSON result.
        StripsManager.loadGrammar(__dirname + '/grammar/grammar-problem.txt', filePath, function(result) {
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
            result.objects = [];
            for (var key in values) {
                result.objects.push(key);
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
                domain.objects = problem.objects;

                if (callback) {
                    callback(domain, problem);
                }
            });
        });
    },

    predicateCombinations: function(state) {
        // For "Blocks World" problems, combinatorics.permutationCombination(state) is sufficient and faster, but otherwise, baseN(state) gives the full range of possible parameter values.
        var cmb = combinatorics.baseN(state);

        return cmb.toArray();
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
                var parameter1 = action1.map ? action1.map[action1.parameters[k]] : action1.parameters[k];
                var parameter2 = action2.map ? action2.map[action2.parameters[k]] : action2.parameters[k];

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
        // Returns an array of applicable concrete actions for the current state, using the possible parameter values in domain.objects array (Example: objects = ['a', 'b', 't1', 't2', 't3']).
        // Test each domain action precondition against the cases. If one holds valid, then that action is applicable in the current state.
        var result = [];

        if (!domain.objects || domain.objects.length == 0) {
            console.log('ERROR: No parameter values found in domain.objects.');
            return;
        }

        // Get all action combinations for the current state.
        var cases = StripsManager.predicateCombinations(domain.objects);

        for (var i in domain.actions) {
            var action = domain.actions[i]; // op1
            var parameters = action.parameters; // x1, x2, x3
            var populatedAction = JSON.parse(JSON.stringify(action)); // copy for replacing parameters with actual values.
            var parameterMapHash = {};

            // Assign values to the parameters for each test case.
            for (var j in cases) {
                var testCase = cases[j];
                var nindex = 0;
                
                var parameterMap = []; // map of parameter values to be populated
                // Initialize default parameter values for this action. We'll set concrete values next.
                for (var j in parameters) {
                    parameterMap[parameters[j]] = testCase[nindex++];
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

    solve: function(domain, problem) {
        // Find solution.
        StripsManager.run(domain, { state: problem.states[0] }, problem.states[1]);
    },

    run: function(domain, state, goalState, visited, depth) {
        visited = visited ? JSON.parse(JSON.stringify(visited)) : {};
        depth = depth || 0;

        // If this is the initial state, add it to the visited list.
        if (Object.keys(visited).length == 0) {
            visited[StripsManager.stateToString(state.state)] = 1;
        }

        // Check for goal.
        if (StripsManager.isGoal(state.state, goalState)) {
            console.log('*** Solution found in ' + depth + ' steps!');

            // Compile solution path.
            while (state != null && state.parent != null) {
                console.log(depth-- + '. ' + StripsManager.actionToString(state.action));
                state = state.parent;
            }
        }
        else {
            // Get child states by applying actions to current state.
            var fringe = StripsManager.getChildStates(domain, state.state);

            // Run against each new child state.
            for (var i in fringe) {
                var child = fringe[i];
                child.parent = state;
                var key = StripsManager.stateToString(child.state);

                if (!visited[key]) {
                    visited[key] = 1;
                    StripsManager.run(domain, child, goalState, visited, depth + 1);
                }
            }
        }
    }
};

module.exports = StripsManager;
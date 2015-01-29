var fs = require('fs');
var PEG = require("pegjs");
var util = require('util');
var combinatorics = require('./node_modules/js-combinatorics/combinatorics.js').Combinatorics;

PlanningManager = {
	load: function(grammarFileName, codeFileName, callback) {
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

	loadDomain: function(callback) {
		// Applies the PEG.js grammar for a STRIPS PDDL domain file and returns the parsed JSON result.
		PlanningManager.load('./grammar/grammar-domain.txt', './grammar/problem1/domain.txt', function(result) {
			if (callback) {
				callback(result);
			}
		});
	},

	loadProblem: function(callback) {
		// Applies the PEG.js grammar for a STRIPS PDDL problem file and returns the parsed JSON result.
		PlanningManager.load('./grammar/grammar-problem.txt', './grammar/problem1/problem.txt', function(result) {
			if (callback) {
				callback(result);
			}
		});
	},
	
	predicateCombinations: function(state) {
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
	
	isPreconditionSatisfied: function(state, precondition) {
		// Returns true if the precondition is satisfied in the current state.
		// This function works by making sure all 'and' preconditions exist in the state, and that all 'not' preconditions do not exist in the state.
		var matchCount = 0;
		var andCount = PlanningManager.andCount(precondition); // The state needs to contain the actions in action.precondition for 'and'. For 'not', we fail immediately. So, let's count the number of 'and' matches and make sure we satisfy them.

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
		if (PlanningManager.isPreconditionSatisfied(state, action.precondition)) {
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
		// Returns an array of applicable concrete actions for the current state.
        // Test each domain precondition against the cases. If one holds valid, then that action is applicable in the current state.
        var result = [];

        // Get all action combinations for the current state.
        var cases = PlanningManager.predicateCombinations(['A', 'B', 'C']); // TODO: LOAD THESE FROM PROBLEM SPACE.
		
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
				var applicableAction = PlanningManager.getApplicableActionInState(state, populatedAction);
				if (applicableAction) {
					// This action is applicable in this state.
					result.push(applicableAction);
				}
			}
        }

        return result;
    }
};

function main() {
	// Load the domain and actions.
	PlanningManager.loadDomain(function(domain) {
		// Load the problem.
		PlanningManager.loadProblem(function(problem) {
            // Get all valid actions for the initial state.
            var actions = PlanningManager.applicableActions(domain, problem.states[0]);

            console.log(util.inspect(actions, true, 100, true));
		});
	});
}

main();
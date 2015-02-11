AI Planning with STRIPS
=======================

Basic AI planning with STRIPS and PDDL. For details, see the [demo](https://github.com/primaryobjects/strips).

Install
-------

```
npm install strips
```

Usage
-----

You'll first need to have a domain and problem file in PDDL format. You can create these yourself (see [examples](https://github.com/primaryobjects/strips/tree/master/examples)) or find them online. The features :strips :typing are supported.

Here is an [example](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld2/problem.txt) that loads a domain and problem from the "Blocks World" domain. This problem involves stacking blocks A, B on one table to a stack AB on another table (where A is on top of B).

### Example

```javascript
var strips = require('strips');

// Load the domain and problem.
strips.load('./examples/blocksworld2/domain.txt', './examples/blocksworld2/problem.txt', function(domain, problem) {
    // Run the problem against the domain.
    var solutions = strips.solve(domain, problem);

    // Display each solution.
    for (var i in solutions) {
        var solution = solutions[i];

        console.log('- Solution found in ' + solution.steps + ' steps!');
        for (var i = 0; i < solution.path.length; i++) {
            console.log((i + 1) + '. ' + solution.path[i]);
        }        
    }
});
```

### Output

```
- Solution found in 3 steps!
1. move a x y
2. move b x y
3. stack a b y
```

Methods
-------

#### load(domainPath, problemPath, callback)

Loads a domain and problem PDDL file and returns a domain and problem object in the callback.

#### solve(domain, problem, isDepthFirstSearch = true, maxSolutions = 1)

Searches for a solution to the given problem by using depth-first-search or breadth-first-search. The default setting uses depth-first-search and returns the first solution found. To return more solutions, set maxSolutions to a higher value. Note, you can write your own solution algorithm by using the methods below.

#### getChildStates(domain, state)

Returns an array of all valid child states from a given parent state. Each child state is returned in the format { state: state, action: action }. State is the child state. Action is the applicable action and parameter values on the parent that produced the child state.

#### applicableActions(domain, state)

Returns a list of applicable actions on the current state. This method uses all possible parameter values and runs each valid action that is defined in the domain against the current state. All actions that satisfy the preconditions are included in the resulting list.

#### applyAction(action, state)

Applies the action on the state and returns the new (child) state. It is assumed that the action's precondition has already been tested.

#### isGoal(state, goalState)

Returns true if the state contains the goal state conditions.

#### isEqual(action1, action2)

Returns true if two actions are equal. Two actions are equal if they contain the same name and parameter values.

#### stateToString(state)

Converts a JSON state object to a string. Since two states may have the same predicates in different orderings, this method sorts the predicates before returning the string object so they'll always look the same.

#### actionToString(action)

Converts an action operation to a string. For example: move a b

Settings
--------

#### strips.fast

By default, strips uses baseN to calculate all possible parameter values for actions. Set this property to true to use permutationCombination instead. This is faster, but may not find all possible solutions.

#### strips.verbose

Set to true to display status information on the console while searching for a solution.

#### strips.grammarDomainPath

Allows changing the default path to the PEG.js domain grammar file. This file is used to enable parsing of the PDDL domain file.

#### strips.grammarProblemPath

Allows changing the default path to the PEG.js problem grammar file. This file is used to enable parsing of the PDDL problem file.

Finding Solutions
-----------------

The default method, strips.solve(...), searches for all solutions using depth-first-search. You can use your own search method by calling the strips methods (listed above) to identify child states and actions yourself. In this way, you can implement A* search, breadth-first-search, or any other type of heuristic solution.

For example, to find all applicable actions for the initial problem state:

```javascript
var strips = require('strips');
var util = require('util');

// Load the domain and problem.
strips.load('./examples/blocksworld2/domain.txt', './examples/blocksworld2/problem.txt', function(domain, problem) {
	// Get all applicable actions for the initial state.
	var actions = strips.applicableActions(domain, problem.states[0]);
	
	// Display the JSON result.
	console.log(util.inspect(actions, true, 100, true));
});
```

Similarly, to see the result of applying the first applicable action against the initial state, you can do the following:

```javascript
// Get all applicable actions for the initial state.
var actions = strips.applicableActions(domain, problem.states[0]);

// Apply first action on the initial state.
var childState = strips.applyAction(actions[0], problem.states[0]);

// Display the JSON result.
console.log(util.inspect(childState, true, 100, true));
```

Here is a similar example that outputs the state and action to the console:

```javascript
// Get all applicable actions for the initial state.
var actions = strips.applicableActions(domain, problem.states[0]);

// Display the current state and action that we're going to apply.
console.log('Current state');
console.log(strips.stateToString(problem.states[0]));
console.log('Applying action');
console.log(strips.actionToString(actions[0]));

// Apply first action on the initial state.
var childState = strips.applyAction(actions[0], problem.states[0]);

// Display the resulting modified state.
console.log('New child state');
console.log(strips.stateToString(childState));
```

Of course, the real power is in designing your own search algorithm using the strips methods. See the [default](https://github.com/primaryobjects/strips/blob/master/strips/strips.js#L440) search routine for an idea of how to use the methods to search.

### A* Search

You can implement your own A* search to find a solution. A* works by using a heuristic to guide it down the path of possible moves in the domain. In this manner, it is much faster than simple breadth-first or depth-first search. It will also find an optimal solution that contains the least number of steps.

Since the strips library exposes its internal methods, you can implement your own search algorithm. Here is an [example](https://github.com/primaryobjects/strips/blob/master/starcraft.js) of an A* search method for the [starcraft](https://github.com/primaryobjects/strips/blob/master/examples/starcraft/domain.txt) domain, to train a [marine](https://github.com/primaryobjects/strips/blob/master/examples/starcraft/marine.txt).

The core idea to a custom search method is to use the strips methods isGoal() and getChildStates() to iterate through all states and actions. Once you have a list of child states, apply your heuristic to calculate a cost for each state. Then sort the states by cost so that A* can choose the next cheapest state to move to. You can see the details in the example.

Have fun!

License
-------

MIT

Copyright (c) 2015 Kory Becker
http://primaryobjects.com/kory-becker

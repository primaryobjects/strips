var strips = require('strips');
strips.verbose = true;

// Load the domain and problem.
strips.load('./examples/starcraft/domain.txt', './examples/starcraft/marine.txt', function(domain, problem) {
    // Use A* search to run the problem against the domain.
    var solutions = solveA(domain, problem);

    // Display solution.
    var solution = solutions[0];
    console.log('- Solution found in ' + solution.steps + ' steps!');
    for (var i = 0; i < solution.path.length; i++) {
        console.log((i + 1) + '. ' + solution.path[i]);
    }        
});

function costMarine(state) {
    // This is our A* heuristic method to calculate the cost of a state.
    // For Starcraft, the heuristic will be how many required buildings have been built. Subtract x from cost for each correct building, with 0 meaning all required buildings have been made and we're done.
    var cost = 10;

    for (var i in state.actions) {
        var action = state.actions[i].action;

        if (action == 'depot') {
            cost -= 5;
        }
        else if (action == 'barracks') {
            cost -= 5;
        }
    }
    
    return cost;
}

function solveA(domain, problem) {
    // Find first solution using A* search. Starting with the initial state, we find all children by applying applicable actions on the current state, calculate the child state costs, and select the next cheapest state to visit.
    var state = problem.states[0];
    var goalState = problem.states[1];
    var depth = 0;
    var fringe = [ { state: state, h: costMarine(state), g: depth } ]; // Start with the initial state on the fringe.
    var visited = {};
    var solutions = [];

    while (fringe.length > 0) {
        // Investigate the next state with the lowest cost.
        var current = fringe[0];

        // Remove this state from the fringe.
        fringe.shift();

        // Mark this state as visited.
        visited[strips.stateToString(current.state)] = 1;

        // Check for goal.
        if (strips.isGoal(current.state, goalState)) {
            // Compile solution path.
            var path = [];
            var steps = current.g;

            while (current != null && current.parent != null) {
                // Since we move from goal backwards, add this step to the front of the array (rather than the end, otherwise it would be in reverse order).
                path.unshift(strips.actionToString(current.action));
                current = current.parent;
            }

            solutions.push({ steps: steps, path: path });

            return solutions;
        }
        else {
            // Get child states by applying actions to current state.
            var children = strips.getChildStates(domain, current.state);

            // Add the children to the fringe.
            for (var i in children) {
                var child = children[i];
                child.parent = current;
                child.g = current.g + 1;
                child.h = costMarine(child.state);
                
                if (!visited[strips.stateToString(child.state)]) {
                    fringe.push(child);
                }
            }
            
            fringe.sort(function(a, b) { return (a.h + a.g) - (b.h + b.g) });
        }

        if (strips.verbose) {
            console.log('Depth: ' + current.g + ', Current cost: ' + (current.h + current.g) + ', ' + fringe.length + ' child states.');
        }
    }

    return solutions;
}

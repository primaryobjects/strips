var strips = require('strips');
strips.verbose = true;

// Load the domain and problem.
strips.load('./examples/dockworkerrobot/domain.txt', './examples/dockworkerrobot/problem.txt', function(domain, problem) {
    // Use A* search to run the problem against the domain.
    var solutions = strips.solve(domain, problem, cost);

    // Display solution.
    var solution = solutions[0];
    console.log('- Solution found in ' + solution.steps + ' steps!');
    for (var i = 0; i < solution.path.length; i++) {
        console.log((i + 1) + '. ' + solution.path[i]);
    }        
});

function cost(state) {
    // This is our A* heuristic method to calculate the cost of a state.
    var cost = 120;

    for (var i in state.actions) {
        var action = state.actions[i].action;

        if (action == 'in') {
            if (state.actions[i].parameters.indexOf('ca') != -1 && state.actions[i].parameters.indexOf('p2') != -1) {
                cost -= 20;
            }
            else if (state.actions[i].parameters.indexOf('cb') != -1 && state.actions[i].parameters.indexOf('q2') != -1) {
                cost -= 20;
            }
            else if (state.actions[i].parameters.indexOf('cc') != -1 && state.actions[i].parameters.indexOf('p2') != -1) {
                cost -= 20;
            }
            else if (state.actions[i].parameters.indexOf('cd') != -1 && state.actions[i].parameters.indexOf('q2') != -1) {
                cost -= 20;
            }
            else if (state.actions[i].parameters.indexOf('ce') != -1 && state.actions[i].parameters.indexOf('q2') != -1) {
                cost -= 20;
            }
            else if (state.actions[i].parameters.indexOf('cf') != -1 && state.actions[i].parameters.indexOf('q2') != -1) {
                cost -= 20;
            }
        }
    }
    
    return cost;
}
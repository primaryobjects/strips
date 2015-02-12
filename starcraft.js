var strips = require('strips');
strips.verbose = true;

// Load the domain and problem.
strips.load('./examples/starcraft/domain.txt', './examples/starcraft/marine.txt', function(domain, problem) {
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
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

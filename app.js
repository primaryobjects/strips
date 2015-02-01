var strips = require('./lib/strips');

// Load the domain and problem.
strips.load('./grammar/blocksworld3/domain.txt', './grammar/blocksworld3/problem2.txt', function(domain, problem) {
    // Run the problem against the domain.
    var path = strips.solve(domain, problem);
    if (path) {
        console.log('* Solution found in ' + path.steps + ' steps!');
        for (var i in path) {
            console.log(path[i].step + '. ' + path[i].action);
        }
    }
});

var strips = require('strips');

// Load the domain and problem.
strips.load('./grammar/blocksworld3/domain.txt', './grammar/blocksworld3/problem.txt', function(domain, problem) {
    // Run the problem against the domain.
    strips.solve(domain, problem);
});

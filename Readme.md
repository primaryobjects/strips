AI Planning with STRIPS
--------

Implementing a basic example of artificial intelligence planning using STRIPS and PDDL.

This program runs a simple problem within a domain and identifies the optimal set of actions to achieve a goal. For example, stacking blocks in a certain way or Towers of Hanoi could both be encoded within the problem and domain to be solved by the AI.

The AI planning works by processing a simple [domain](https://gist.github.com/primaryobjects/22363e71112d716ea183) using a PEG.js grammar sheet and runs the result using a simple STRIPS [problem](https://gist.github.com/primaryobjects/6f39bf5497b7f52cf17a).

The domain and problem PDDL files are parsed via PEG.js, producing a JSON [object](https://gist.github.com/primaryobjects/6cb0d14b3bbef3388b7a) for a given domain. The JSON is then processed to identify applicable actions within a given state of the problem. The actions are then applied to the current state, producing a new set of states. This process is repeated, where applicable actions are identified for the new states, applied, and further new states produced. The resulting tree of possible states and actions may then be traversed using the A* algorithm to locate an optimal set of steps to achieve the goal state, as specified in the problem.

## Example Flow of Program

- Start with initial state
- Identify valid actions for the current state
- Apply actions on current state to produce new states
- Repeat until goal state is found

License
----

MIT

Author
----
Kory Becker
http://www.primaryobjects.com/kory-becker
AI Planning with STRIPS
--------

Implementing a basic example of artificial intelligence planning using STRIPS and PDDL.

This program runs a simple problem within a domain and identifies the optimal set of actions to achieve a goal. For example, stacking blocks in a certain way or Towers of Hanoi could both be encoded within the problem and domain to be solved by the AI.

Several examples from the "[Blocks World]"(http://www.d.umn.edu/~gshute/cs2511/projects/Java/assignment6/blocks/blocks.xhtml) domain are included in this project. The AI is able to successfully plan a series of steps to move a stack of blocks B,A from Table 1 to a stack A,B on Table 3. When only 1 stack is permitted per table, the AI uses Table 2 as an intermediary.

The AI planning works by processing a simple [domain](https://gist.github.com/primaryobjects/22363e71112d716ea183) using a PEG.js grammar sheet and runs the result using a simple STRIPS [problem](https://gist.github.com/primaryobjects/6f39bf5497b7f52cf17a).

The domain and problem PDDL files are parsed via PEG.js, producing a JSON [object](https://gist.github.com/primaryobjects/6cb0d14b3bbef3388b7a) for a given domain. The JSON is then processed to identify applicable actions within a given state of the problem. The actions are then applied to the current state, producing a new set of states. This process is repeated, where applicable actions are identified for the new states, applied, and further new states produced. The resulting tree of possible states and actions may then be traversed using the A* algorithm to locate an optimal set of steps to achieve the goal state, as specified in the problem.

## Example Flow of Program

- Start with initial state.
- Identify valid actions for the current state.
- Apply actions on current state to produce child states.
- Repeat until goal state is found.

## Example Blocks World Problem

- [Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld1/domain.txt)
- [Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld1/problem.txt)
Move blocks a, b from table x to table y. Multiple blocks are permitted on a table. The only available action is "move".

- [Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/domain.txt)
- [Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/problem.txt)
Moves blocks a, b from table x to a stack ab on table y. Multiple blocks are permitted on a table. Available actions include "move", "stack", and "unstack".

- [Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/domain.txt)
- [Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/problem2.txt)
Unstacks blocks ba from table x to a stack ab on table y. Multiple blocks are permitted on a table. Available actions include "move", "stack", and "unstack".

- [Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld3/domain.txt)
- [Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld3/problem.txt)
The fun one! Unstack blocks ba from table 1 to a stack ab on table 3. Only one block or stack is permitted on a table. The AI needs to plan for moving a block temporarily to table 2, while it sets up the correct order for stacking on table 3. Available actions include "move", "stack", and "unstack".

License
----

MIT

Author
----
Kory Becker
http://www.primaryobjects.com/kory-becker
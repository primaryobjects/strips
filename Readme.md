AI Planning with STRIPS
--------

Implementing a basic example of artificial intelligence planning using STRIPS and PDDL.

This program runs a simple problem within a domain and identifies the optimal set of actions to achieve a goal. For example, stacking blocks in a certain way or Towers of Hanoi could both be encoded within the problem and domain to be solved by the AI.

Several examples from the [Blocks World](http://en.wikipedia.org/wiki/Blocks_world) domain are included in this project, in which the AI is able to successfully plan the series of steps to move and stack blocks on a series of tables.

The AI planning works by processing a simple [domain](https://gist.github.com/primaryobjects/22363e71112d716ea183) using a PEG.js grammar sheet and runs the result using a simple STRIPS [problem](https://gist.github.com/primaryobjects/6f39bf5497b7f52cf17a).

The domain and problem PDDL files are parsed via PEG.js, producing a JSON [object](https://gist.github.com/primaryobjects/6cb0d14b3bbef3388b7a) for a given domain. The JSON is then processed to identify applicable actions within a given state of the problem. The actions are then applied to the current state, producing a new set of states. This process is repeated, where applicable actions are identified for the new states, applied, and further new states produced. The resulting tree of possible states and actions may then be traversed using the A* algorithm to locate an optimal set of steps to achieve the goal state, as specified in the problem.

## Example Flow of Program

- Start with initial state.
- Identify valid actions for the current state.
- Apply actions on current state to produce child states.
- Repeat until goal state is found.

## Example Blocks World Problems

[Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld1/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld1/problem.txt)
Move blocks a, b from table x to table y. Multiple blocks are permitted on a table. The only available action is "move".

[Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/problem.txt)
Moves blocks a, b from table x to a stack ab on table y. Multiple blocks are permitted on a table. Available actions include "move", "stack", and "unstack".

[Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld2/problem2.txt)
Unstacks blocks ba from table x to a stack ab on table y. Multiple blocks are permitted on a table. Available actions include "move", "stack", and "unstack".

[Domain](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld3/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld3/problem.txt)
The fun one! Unstack blocks ba from table 1 to a stack ab on table 3. Only one block or stack is permitted on a table. The AI needs to plan for moving a block temporarily to table 2, while it sets up the correct order for stacking on table 3. Available actions include "move", "stack", and "unstack".

## Example Output from Blocks World Problem #3

[Blocks](http://www.d.umn.edu/~gshute/cs2511/projects/Java/assignment6/blocks/blocks.xhtml) are stacked ab on table 1. The [goal](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld3/problem2.txt) is to stack them ab on table 2. Only one block or stack is permitted per table. Here are the solutions.

```
*** Solution found in 6 steps!
6. stack a t3 b t2
5. move a t1 t3
4. move b t3 t2
3. move a t2 t1
2. move b t1 t3
1. unstack a b t1 t2
*** Solution found in 5 steps!
5. stack a t1 b t2
4. move b t3 t2
3. move a t2 t1
2. move b t1 t3
1. unstack a b t1 t2
*** Solution found in 5 steps!
5. stack a t1 b t2
4. move a t3 t1
3. move b t1 t2
2. move a t2 t3
1. unstack a b t1 t2
*** Solution found in 4 steps!
4. stack a t3 b t2
3. move b t1 t2
2. move a t2 t3
1. unstack a b t1 t2
*** Solution found in 4 steps!
4. stack a t1 b t2
3. move a t3 t1
2. move b t1 t2
1. unstack a b t1 t3
*** Solution found in 3 steps!
3. stack a t3 b t2
2. move b t1 t2
1. unstack a b t1 t3
```

## Sussman Anomaly Solution

Here is the AI's [solution](https://github.com/primaryobjects/strips/blob/master/grammar/blocksworld5/problem.txt) for the Blocks World [Sussman Anomaly](http://en.wikipedia.org/wiki/Sussman_Anomaly).

```
*** Solution found in 3 steps!
3. stack3 a b c x
2. stack2 b c x
1. unstack2 c a x
```

## Starcraft!

Just because we can! Here is the Starcraft [domain](https://github.com/primaryobjects/strips/blob/master/grammar/starcraft/domain.txt). The task was to build a barracks.

![Collect Minerals 1](https://raw.githubusercontent.com/primaryobjects/strips/master/grammar/starcraft/images/minerals.jpg)
![Supply Depot](https://raw.githubusercontent.com/primaryobjects/strips/master/grammar/starcraft/images/supply-depot.jpg)
![Collect Minerals 2](https://raw.githubusercontent.com/primaryobjects/strips/master/grammar/starcraft/images/minerals.jpg)
![Barracks](https://raw.githubusercontent.com/primaryobjects/strips/master/grammar/starcraft/images/barracks.jpg)

```
*** Solution found in 8 steps!
8. build-barracks scv sector-a mineral-field-a
7. move scv mineral-field-b sector-a
6. collect-minerals scv mineral-field-b
5. move scv mineral-field-a mineral-field-b
4. build-supply-depot scv mineral-field-a
3. collect-minerals scv mineral-field-a
2. move scv sector-b mineral-field-a
1. move scv sector-a sector-b
```

License
----

MIT

Author
----
Kory Becker
http://www.primaryobjects.com/kory-becker
AI Planning with STRIPS
--------

This project is a demo of using the artificial intelligence automated planning library [strips](https://www.npmjs.com/package/strips), in node.js.

Try it online at https://stripsfiddle.herokuapp.com

```
npm install strips
```

If you're new to STRIPS automated planning, here is a great [tutorial](http://www.primaryobjects.com/2015/11/06/artificial-intelligence-planning-with-strips-a-gentle-introduction/) to get you started.

## Examples

The following examples show how to solve planning problems by identifying the optimal set of actions to achieve a goal. For example, stacking blocks, Towers of Hanoi, and even [Starcraft](https://github.com/primaryobjects/strips#starcraft) can be solved by the AI (see below, it's pretty neat!).

Several examples from the [Blocks World](http://en.wikipedia.org/wiki/Blocks_world) domain are included in this project, in which the AI is able to successfully plan the series of steps to move and stack blocks on a series of tables.

The AI planning works by processing a simple [domain](https://gist.github.com/primaryobjects/22363e71112d716ea183) using a PEG.js grammar sheet and runs the result using a simple STRIPS [problem](https://gist.github.com/primaryobjects/6f39bf5497b7f52cf17a).

The domain and problem PDDL files are parsed via PEG.js, producing a JSON [object](https://gist.github.com/primaryobjects/6cb0d14b3bbef3388b7a) for a given domain. The JSON is then processed to identify applicable actions within a given state of the problem. The actions are then applied to the current state, producing a new set of states. This process is repeated, where applicable actions are identified for the new states, applied, and further new states produced. The resulting tree of possible states and actions may then be traversed using the A* algorithm to locate an optimal set of steps to achieve the goal state, as specified in the problem.

## Example Flow of Program

- Start with initial state.
- Identify valid actions for the current state.
- Apply actions on current state to produce child states.
- Repeat until goal state is found.

## Example Blocks World Problems

[Domain](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld1/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld1/problem.txt)
Move blocks a, b from table x to table y. Multiple blocks are permitted on a table. The only available action is "move".

[Domain](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld2/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld2/problem.txt)
Moves blocks a, b from table x to a stack ab on table y. Multiple blocks are permitted on a table. Available actions include "move", "stack", and "unstack".

[Domain](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld2/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld2/problem2.txt)
Unstacks blocks ba from table x to a stack ab on table y. Multiple blocks are permitted on a table. Available actions include "move", "stack", and "unstack".

[Domain](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld3/domain.txt) | 
[Problem](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld3/problem.txt)
The fun one! Unstack blocks ba from table 1 to a stack ab on table 3. Only one block or stack is permitted on a table. The AI needs to plan for moving a block temporarily to table 2, while it sets up the correct order for stacking on table 3. Available actions include "move", "stack", and "unstack".

## Example Output from Blocks World Problem #3

[Blocks](http://www.d.umn.edu/~gshute/cs2511/projects/Java/assignment6/blocks/blocks.xhtml) are stacked ab on table 1. The [goal](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld3/problem2.txt) is to stack them ab on table 2. Only one block or stack is permitted per table. Here are the solutions.

```
*** Solution found in 6 steps!
1. unstack a b t1 t2
2. move b t1 t3
3. move a t2 t1
4. move b t3 t2
5. move a t1 t3
6. stack a t3 b t2
*** Solution found in 5 steps!
1. unstack a b t1 t2
2. move b t1 t3
3. move a t2 t1
4. move b t3 t2
5. stack a t1 b t2
*** Solution found in 5 steps!
1. unstack a b t1 t2
2. move a t2 t3
3. move b t1 t2
4. move a t3 t1
5. stack a t1 b t2
*** Solution found in 4 steps!
1. unstack a b t1 t2
2. move a t2 t3
3. move b t1 t2
4. stack a t3 b t2
*** Solution found in 4 steps!
1. unstack a b t1 t3
2. move b t1 t2
3. move a t3 t1
4. stack a t1 b t2
*** Solution found in 3 steps!
1. unstack a b t1 t3
2. move b t1 t2
3. stack a t3 b t2
```

## Sussman Anomaly Solution

Here is the AI's [solution](https://github.com/primaryobjects/strips/blob/master/examples/blocksworld5/problem.txt) for the Blocks World [Sussman Anomaly](http://en.wikipedia.org/wiki/Sussman_Anomaly).

```
*** Solution found in 3 steps!
1. unstack2 c a x
2. stack2 b c x
3. stack3 a b c x
```

## Starcraft!

Now, for some fun. Here is the Starcraft [domain](https://github.com/primaryobjects/strips/blob/master/examples/starcraft/domain.txt). The task was to build a [barracks](https://github.com/primaryobjects/strips/blob/master/examples/starcraft/barracks.txt). I originally wanted to build a Battlecruiser, but that was taking way too long (without a heuristic search!).

![Collect Minerals 1](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/minerals.jpg)
![Supply Depot](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/supply-depot.jpg)
![Collect Minerals 2](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/minerals.jpg)
![Barracks](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/barracks.jpg)

```
*** Solution found in 8 steps!
1. move scv sector-a mineral-field-b
2. collect-minerals scv mineral-field-b
3. move scv mineral-field-b sector-b
4. build-supply-depot scv sector-b
5. move scv sector-b mineral-field-a
6. collect-minerals scv mineral-field-a
7. move scv mineral-field-a sector-a
8. build-barracks scv sector-a sector-b
```

One step further, here is the AI's solution for traning a [marine](https://github.com/primaryobjects/strips/blob/master/examples/starcraft/marine.txt).

![Collect Minerals 1](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/minerals.jpg)
![Supply Depot](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/supply-depot.jpg)
![Collect Minerals 2](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/minerals.jpg)
![Barracks](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/barracks.jpg)
![Collect Minerals 3](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/minerals.jpg)
![Train Marine](https://raw.githubusercontent.com/primaryobjects/strips/master/examples/starcraft/images/marine.jpg)

```
- Solution found in 11 steps!
1. move scv sector-a mineral-field-a
2. collect-minerals scv mineral-field-a
3. move scv mineral-field-a sector-b
4. build-supply-depot scv sector-b
5. move scv sector-b mineral-field-b
6. collect-minerals scv mineral-field-b
7. move scv mineral-field-b sector-a
8. build-barracks scv sector-a sector-b
9. move scv sector-a mineral-field-c
10. collect-minerals scv mineral-field-c
11. train-marine scv sector-a
```

License
----

MIT

Author
----
Kory Becker
http://www.primaryobjects.com/kory-becker

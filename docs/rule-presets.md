# Future feature: rule presets

The 2017 code shipped one rule set, but `interesting_rules.js` (removed in Phase 0) kept an
alternative `Cell#newState` that "stabilizes to a static scene". It is preserved here as a
transition table so it can become a selectable preset once rules are data instead of a
`switch` statement.

Each table maps a cell's current state and its **headcount** (sum of the six neighbours'
states, 0–12) to its next state. Any headcount not listed maps to `0`.

## Default (shipped)

| State | Headcount → next state |
| ----- | ---------------------- |
| 0     | 4 → 1                  |
| 1     | 1, 2, 3, 4, 6 → 2      |
| 2     | 1 → 2; 2, 4 → 1        |

## "Static scene" (from `interesting_rules.js`)

| State | Headcount → next state |
| ----- | ---------------------- |
| 0     | 4 → 1                  |
| 1     | 1, 2 → 2; 3, 4 → 1     |
| 2     | 1, 2, 3, 4 → 1         |

## Sketch of the feature

- Represent a rule set as `Record<CellState, Partial<Record<number, CellState>>>`.
- A preset picker in the control bar; switching presets does not reset the grid.
- Unit-test each preset's table directly rather than through rendered output.

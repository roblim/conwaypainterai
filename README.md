# Conway Painter

[![CI](https://github.com/roblim/conwaypainterai/actions/workflows/ci.yml/badge.svg)](https://github.com/roblim/conwaypainterai/actions/workflows/ci.yml)

A hexagonal, three-state cellular automaton you paint on. I built it in 2017 as my first
portfolio project, and in 2026 I'm modernizing it in public, one reviewed phase at a time.

- **Play it:** https://conwaypainter.roblim.com
- **How it was modernized, with before/after evidence:** [MODERNIZATION.md](MODERNIZATION.md)
- **The original 2017 code:** [`v1-2017`](https://github.com/roblim/conwaypainterai/tree/v1-2017)

> The modernization is AI-assisted. I directed it with Claude Code, made the decisions, and
> reviewed every change; see [MODERNIZATION.md](MODERNIZATION.md) for how.

## Running locally

Requires Node 22+ and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev        # dev server
pnpm build      # production build in dist/
pnpm lint       # Biome lint + format check
pnpm bench      # frame-time benchmark against dist/ (see docs/perf.md)
```


## Overview

Conway Painter is a game inspired by Conway's Game of Life (CGOL), a well-known cellular automaton invented by mathematician John Conway. A cellular automaton consists of a regular grid of cells, with each cell having a finite number of states. At set time intervals, the state of each cell is updated according to a set of rules governed by the state of other cells in each cell's "neighborhood".

With Conway Painter, you can interact with the underlying cellular automaton by painting cells on
a canvas that represents the automaton's universe. As you paint on the canvas, cells are brought to life, able to start affecting the states of cells in their neighborhood. The universe can be paused or cleared, and then restarted, allowing you to create different seed shapes to explore the patterns
and behaviors that can emerge. A slider is provided to enable you to adjust the generation time.

In the classic Conway's Game of Life, the universe consists of a regular square grid, with each cell being either "alive" or "dead", and influenced by an eight-cell neighborhood.

Conway Painter departs from its classic counterpart by using a regular hexagonal grid, with each cell having one of three states - 0, 1, or 2 - and is influenced by a six-cell neighborhood. At each time interval, each cell's state is updated according to a new set of rules, based of the sum of cell states in the 6-cell neighborhood (the "headcount"):

- A dead cell (state 0), reanimates to a state 1 cell if the headcount is exactly 4
- A state 1 cell evolves into a state 2 cell if the headcount is 1, 2, 3, 4, or 6, otherwise, it dies (state 0)
- A state 2 cell maintains its state if the headcount is exactly 1, regresses to a
state 1 cell if the headcount is 2 or 4, and dies otherwise (state 0)


![alt text](https://media.giphy.com/media/l0IsIcCi8IB8Qnigg/giphy.gif "Conway Painter")

## Architecture and Technologies

- Vanilla JavaScript for the simulation and UI logic (TypeScript is coming in Phase 2)
- [p5.js](https://p5js.org/) 2.x for rendering the universe and handling painting input
- [Vite](https://vite.dev/) for the dev server and build, [pnpm](https://pnpm.io/) for packages
- [Biome](https://biomejs.dev/) for lint and format, GitHub Actions for CI, Vercel for hosting

#### Modules
- `universe.js`: the hex grid, coordinate conversion, and stepping the simulation
- `cell.js`: per-cell state, neighbor lookup, and the transition rules
- `painter.js`: drawing the grid, cells and brush cursors onto the p5 canvas
- `interface.js`: the control bar (buttons and speed slider)
- `modal.js`: the About dialog

## Challenges

The primary challenge of implementing Conway Painter was in dealing with the hexagonal grid. Due to the offset nature of a hexagonal grid, a typical rectangular coordinate system is unsuitable without modification (offsetting coordinates). Offsetting a rectangular coordinate system is complicated and tedious to manage, so a modified cubic/axial coordinate system was chosen.

Using cubic coordinates was necessary in implementing the neighbor polling logic (how cells determine who is in their neighborhood), but these coordinates are unsuitable for rendering purposes, where pixels are mapped according to a rectangular coordinate system. To deal with this, functions were implemented to interconvert between coordinate systems, properly generate and seed the universe grid, as well as functions to efficiently pull appropriate cells from the two-dimensional array used for implementing the grid.

Citation: https://www.redblobgames.com/grids/hexagons/

```javascript
generateGrid(seed) {
  let q;
  let r;
  let qStart = 1;
  let rStart = 0;
  let grid = [];
  let tempRow = [];

  for (let i = 0; i < this.gridHeight; i++) {
    if (i % 2 === 0) {
      qStart --;
    }
    q = qStart;
    if (i % 2 !== 0) {
      rStart --;
    }
    r = rStart;

    for (let j = 0; j < this.gridWidth; j++) {
      const s = (-q - r);
      tempRow.push(new Cell(q, r, s, this, seed));
      q++;
      r--;
    };
    grid.push(tempRow);
    tempRow = [];
  };
  return grid;
}

hexToPixel(q, s, size) {
  const x = (Math.sqrt(3) * q + Math.sqrt(3) / 2 * s) * size;
  const y = (3 / 2) * s * size;
  const pixelCoord = { x: x, y: y };
  return pixelCoord;
}

pixelToHex(x, y) {
  const q = (x * (Math.sqrt(3) / 3) - (y / 3)) / this.cellSize;
  const s = (y * (2 / 3)) / this.cellSize;
  return this.roundHex(q, s);
}

roundHex(q, s) {
  let r = -q - s
  let rQ = Math.round(q);
  let rR = Math.round(r);
  let rS = Math.round(s);
  const qDiff = Math.abs(rQ - q);
  const rDiff = Math.abs(rR - r);
  const sDiff = Math.abs(rS - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rQ = -rR - rS;
  } else if (rDiff > sDiff) {
    rR = -rQ - rS;
  } else {
    rS = -rQ - rR;
  }
  return { q: rQ, s: rS };
}
```

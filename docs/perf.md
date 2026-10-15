# Performance log

Frame-time measurements taken with [`scripts/bench.mjs`](../scripts/bench.mjs) at the end of
each modernization phase, so performance claims have numbers behind them.

## Results

Main-thread time per frame (lower is better). Median of 3 runs; each run is 600 frames after a
60-frame warm-up.

| Build                      | Mean    | p95     | Achieved FPS | Notes                                    |
| -------------------------- | ------- | ------- | ------------ | ---------------------------------------- |
| `v1-2017` (original)       | 9.07 ms | 15.5 ms | 58.5         | webpack 3 bundle, p5 0.5.14 from CDN      |
| Phase 0 (Vite, p5 2.3.4)   | 4.84 ms | 8.2 ms  | 60.1         | Friendly Error System off in production   |

Both are well under the 16.7 ms budget for 60 fps at this grid size, so achieved FPS is capped by
the display rate. Frame time is the more useful signal for later phases.

## Method

- **Build under test:** a static directory served locally (`dist/` or a checkout of `v1-2017`).
- **Browser:** headless Chromium 141.0.7390.37.
- **Machine:** cloud container, Linux x64, Intel Xeon @ 2.80 GHz, 4 vCPUs. Absolute numbers
  depend on the machine; only compare rows measured on the same machine.
- **Grid:** viewport fixed at 1280×800, giving a 113×74 hex grid (8,362 cells) at the default
  8 px cell size.
- **Seed:** `Math.random` is replaced by a seeded PRNG (mulberry32, seed 42) before any app code
  runs, so the starting universe is reproducible without changing the app.
- **What is timed:** each `requestAnimationFrame` callback, from entry until it returns (or, for
  p5 2.x, whose draw loop is `async`, until its promise settles). That covers `draw()`: the
  simulation step and all canvas drawing commands. It does not include rasterization or
  compositing that the browser does off the main thread.

Run it yourself:

```sh
pnpm build
pnpm bench --label my-run          # writes bench-results/my-run.json
CHROMIUM_PATH=/path/to/chrome pnpm bench   # use a specific Chromium
```

CI runs the benchmark only as a smoke test (30 frames). Shared runners are too noisy to
produce numbers worth recording.

## Caveats

- **The two builds don't simulate identical frames.** p5 itself may draw from `Math.random`
  during startup, and versions differ in how much, so the seeded sequence reaches the grid at a
  different point. Both start from a random grid with the same density, and the work per frame
  barely depends on the pattern: every cell is updated and every live cell drawn.
- **The Phase 1 bug fix will change the dynamics.** Fixing the in-place grid update (see
  `MODERNIZATION.md`) changes how the simulation evolves, so frames after Phase 1 differ from
  frames before it. The comparison stays per-frame cost at the same grid size.
- **Headless, software rendering.** No GPU, so canvas-heavy changes may show bigger gains on
  real hardware than here.

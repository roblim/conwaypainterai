# Modernization log

Conway Painter was my first portfolio project, built in 2017. In 2026 I brought it up to date
in deliberate, reviewable phases, starting with a safety net and ending with architecture and
performance. Each phase is one pull request. This log records what changed, why, and the
evidence.

The original code is tagged [`v1-2017`](https://github.com/roblim/conwaypainterai/tree/v1-2017).

**How this was built:** the modernization was done with Claude Code as an AI pair. I set the
plan and made the decisions (tooling, sequencing, what counts as a bug, what to keep) through a
structured design review before any code changed. I reviewed and merged every PR. Commits
written with the agent carry a `Co-Authored-By: Claude` trailer. And yes, the repo name is a
bit of a joke: everything is "AI" now.

| Phase | Goal                                    | Status      |
| ----- | --------------------------------------- | ----------- |
| 0     | Modern build, cleanup, baseline numbers | In review   |
| 1     | Tests and CI                            | Planned     |
| 2     | TypeScript and dependency updates       | Planned     |
| 3     | Architecture and performance            | Planned     |

## Phase 0: Modern build and baseline

**Why first:** any modern test runner needs a modern build. Writing tests against webpack 3
and Babel 6 would have meant rewiring them immediately. The build swap is mechanical and easy to
check by hand, so it goes first. Tests then protect the riskier TypeScript migration.

**Changes**

- **Build:** webpack 3 + Babel 6 → Vite + pnpm ([ADR 1](docs/adr/0001-vite-and-pnpm.md)).
  `dist/` is no longer committed.
- **p5:** 0.5.14 + p5.dom from a CDN → 2.3.4 from npm ([ADR 2](docs/adr/0002-p5-2x.md)). Touch
  and key handling were ported to the 2.x event model.
- **Removed:** the Universal Analytics tag (Google shut UA down in 2023), jQuery (unused), the
  Font Awesome kit (replaced by an inline Bootstrap Icons sprite), Heroku-era `index.php`, the
  old `CNAME`, unused reference code, and an alternate rule set, which is preserved in
  [docs/rule-presets.md](docs/rule-presets.md) for a future feature.
- **Added:** Vercel Web Analytics, Biome for lint and format, GitHub Actions CI (lint, build,
  benchmark smoke test), weekly grouped Dependabot updates, and an MIT license.
- **Fixed copy:** a 2017 find-and-replace that turned cells being "alive" into "state".

**Deferred on purpose:** three lint rules are warnings rather than errors
(`noAssignInExpressions`, `useIterableCallbackReturn`, `noInnerDeclarations`). Fixing them
changes logic, and that should wait until tests exist.

**Evidence:** a [frame-time benchmark](docs/perf.md) that runs the untouched 2017 build and
the new one under the same conditions.

| Build     | Mean frame time | p95     |
| --------- | --------------- | ------- |
| `v1-2017` | 9.07 ms         | 15.5 ms |
| Phase 0   | 4.84 ms         | 8.2 ms  |

That's roughly half the main-thread time per frame with no app-logic changes. The likely
causes are newer p5 internals and running without the Friendly Error System in production, but
their individual shares haven't been measured.

## Phase 1: Tests and CI (planned)

- **Unit tests (Vitest):** the transition rules, hex ↔ pixel conversion, hex rounding, grid
  generation, neighbor lookup and grid edges.
- **Known suspect:** `Universe#updateCellStates` assigns `this.grid = this.tempGrid`, which
  makes both names point to the same grid from the second generation on. Cells would then
  update in place and read neighbors that have already changed. A failing test will confirm it
  before it's fixed in its own commit.
- **End-to-end smoke tests (Playwright):** Chromium, WebKit and a mobile viewport, through a
  dev-only debug hook.

## Phase 2: TypeScript (planned)

A full migration with `strict` and `noUncheckedIndexedAccess`. Every edge case that setting
exposes (for example, out-of-grid lookups at the border) gets a real fix and a test, never a `!`.

## Phase 3: Architecture and performance (planned)

Scoped once Phases 1 and 2 land, and measured against [docs/perf.md](docs/perf.md).

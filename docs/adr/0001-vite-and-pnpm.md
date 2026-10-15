# 1. Build with Vite and pnpm

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

The 2017 build used webpack 3 with Babel 6, listed as runtime `dependencies`, with no dev
server and the compiled `dist/bundle.js` committed to the repo. p5 and p5.dom came from a CDN as
globals. Neither tool chain is maintained, and nothing could run tests against the source.

## Decision

- **Vite** for the dev server and production build. The app is a static page with one entry
  module, so Vite needs almost no configuration.
- **pnpm**, pinned through `packageManager`, with a committed lockfile.
- **p5 installed from npm** and imported as an ES module instead of loaded as a CDN global.
- **Build output is not committed.** Vercel builds from source.
- **Vitest** for unit tests (Phase 1), since it shares Vite's config and transforms.

## Consequences

- One command each for dev, build and preview. CI can build from a clean checkout.
- Tests and TypeScript (Phase 2) need no extra build tooling.
- The p5 bundle (~1.2 MB minified, ~354 kB gzipped) now ships with the app instead of from a
  CDN. Trimming it to the p5 modules actually used is Phase 3 work.

// Frame-time benchmark for Conway Painter.
//
// Serves a static build, loads it in headless Chromium at a fixed viewport
// (fixed grid size) with Math.random replaced by a seeded PRNG, and times every
// requestAnimationFrame callback (until its promise settles, if it returns one).
// p5 runs draw() inside rAF, so that duration ≈ the main-thread cost of one
// frame. This works without any hooks in the app, which is what lets the same
// script measure the untouched 2017 build.
//
// Usage:
//   node scripts/bench.mjs [--dir dist] [--label phase-0] [--frames 600] [--warmup 60] [--runs 3]
//
// Set CHROMIUM_PATH to use a specific Chromium binary.

import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { arch, cpus, platform } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

const { values: args } = parseArgs({
  options: {
    dir: { type: 'string', default: 'dist' },
    label: { type: 'string', default: 'local' },
    frames: { type: 'string', default: '600' },
    warmup: { type: 'string', default: '60' },
    runs: { type: 'string', default: '3' },
    seed: { type: 'string', default: '42' },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '800' },
  },
});

const frames = Number(args.frames);
const warmup = Number(args.warmup);
const runs = Number(args.runs);
const root = resolve(args.dir);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function serve(dir) {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(dir, urlPath));
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// Runs in the page before any app script.
function instrument({ seed, warmup, frames }) {
  // mulberry32: small, fast, deterministic.
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const samples = [];
  let seen = 0;
  let firstAt = 0;
  let lastAt = 0;
  const nativeRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    nativeRaf((ts) => {
      const start = performance.now();
      const record = () => {
        const end = performance.now();
        seen++;
        if (seen > warmup && samples.length < frames) {
          if (samples.length === 0) firstAt = start;
          samples.push(end - start);
          lastAt = end;
        }
      };
      // p5 2.x hands rAF an async _draw, so the frame's work finishes when its
      // promise settles rather than when the callback returns.
      const result = cb(ts);
      if (result && typeof result.then === 'function') result.then(record, record);
      else record();
    });
  window.__bench = () => (samples.length >= frames ? { samples, wallMs: lastAt - firstAt } : null);
}

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const round = (n) => Math.round(n * 100) / 100;

async function runOnce(browser, url) {
  const page = await browser.newPage({
    viewport: { width: Number(args.width), height: Number(args.height) },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(instrument, { seed: Number(args.seed), warmup, frames });
  await page.goto(url);
  const handle = await page.waitForFunction(() => window.__bench(), null, {
    timeout: 300_000,
    polling: 500,
  });
  const { samples, wallMs } = await handle.jsonValue();
  await page.close();
  if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
  const sorted = [...samples].sort((x, y) => x - y);
  return {
    meanMs: round(samples.reduce((s, x) => s + x, 0) / samples.length),
    p50Ms: round(percentile(sorted, 0.5)),
    p95Ms: round(percentile(sorted, 0.95)),
    fps: round((samples.length / wallMs) * 1000),
  };
}

const server = await serve(root);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const r = await runOnce(browser, url);
    console.log(
      `run ${i + 1}/${runs}: mean ${r.meanMs}ms  p50 ${r.p50Ms}ms  p95 ${r.p95Ms}ms  ${r.fps} fps`,
    );
    results.push(r);
  }
  // Report the median run by mean frame time.
  const median = [...results].sort((x, y) => x.meanMs - y.meanMs)[Math.floor(runs / 2)];
  const report = {
    label: args.label,
    date: new Date().toISOString(),
    viewport: `${args.width}x${args.height}`,
    seed: Number(args.seed),
    frames,
    warmup,
    runs: results,
    median,
    machine: `${platform()} ${arch()}, ${cpus()[0]?.model ?? 'unknown CPU'} x${cpus().length}`,
    browser: `Chromium ${browser.version()} (headless)`,
  };
  mkdirSync('bench-results', { recursive: true });
  const out = `bench-results/${args.label}.json`;
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`median: mean ${median.meanMs}ms  p95 ${median.p95Ms}ms  ${median.fps} fps → ${out}`);
} finally {
  await browser.close();
  server.close();
}

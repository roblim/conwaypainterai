import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // p5 is ~1.2 MB minified and ships as a single chunk. Trimming it to the
    // modules we use is tracked as Phase 3 work; until then, don't warn on it.
    chunkSizeWarningLimit: 1300,
  },
});

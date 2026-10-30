import { defineConfig } from 'vitest/config';

// Relative base so the build works under any path (Vercel, GitHub Pages, a sub-path of the hub).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  test: { include: ['src/**/*.test.ts'] },
});

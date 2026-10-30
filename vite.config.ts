import { defineConfig } from 'vitest/config';

// Relative base so the build works under any path (Vercel, GitHub Pages, a sub-path of the hub).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  // the kit's dist uses extensionless relative imports: let Vite resolve them so a test may render the simulation panel;
  // the simulation tests integrate a minute of life per scenario, so 5 s is too short on a shared CI runner
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    server: { deps: { inline: ['@onigam/lab-kit'] } },
  },
});

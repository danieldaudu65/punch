import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Each API test file starts its own in-memory MongoDB; running files
    // one at a time keeps memory use low on laptops and CI.
    fileParallelism: false,
    testTimeout: 30_000,
    // The first run downloads a MongoDB binary, which can take a while.
    hookTimeout: 180_000,
  },
});

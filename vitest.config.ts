import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    maxWorkers: 4,
    testTimeout: 15000,
    teardownTimeout: 5000,
  },
});

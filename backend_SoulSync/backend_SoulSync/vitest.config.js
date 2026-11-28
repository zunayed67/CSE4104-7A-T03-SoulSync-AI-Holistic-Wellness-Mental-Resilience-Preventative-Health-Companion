import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup/vitest.setup.js'],
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 30000,
    // The first MongoMemoryServer start may download a mongod binary.
    hookTimeout: 180000,
  },
});

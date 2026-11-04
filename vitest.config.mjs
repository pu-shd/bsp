import { defineConfig } from 'vitest/config';

// Vite injects BASE_URL='/' into process.env, clobbering the app's BASE_URL.
// Record the outer value here; tests/setup-env.js restores it in each worker.
const outerBaseUrl = process.env.BASE_URL;

export default defineConfig({
  test: {
    // describe/test/expect/vi as globals, matching the previous Jest setup.
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 second timeout for integration tests
    hookTimeout: 30000,
    // Separate processes per test file keep require.cache mocks isolated.
    pool: 'forks',
    isolate: true,
    globalSetup: ['tests/global-setup.mjs'],
    setupFiles: ['tests/setup-env.js'],
    env: {
      BSP_OUTER_BASE_URL_SET: outerBaseUrl === undefined ? '0' : '1',
      BSP_OUTER_BASE_URL: outerBaseUrl ?? '',
    },
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.js'] } },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.js'],
          // These files share real browsers, Xvfb and ports, and their cleanup
          // kills browsers, so they must not run concurrently.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      include: ['src/**/*.js', 'server.js'],
    },
  },
});

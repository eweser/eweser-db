import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: 'src/setupTests.ts',
    // need to slow down the tests or the server will reject the requests
    maxConcurrency: 2,
    maxThreads: 2,
    minThreads: 1,
    // coverage: {
    //   reporter: ['text', 'json', 'html', 'lcov'],
    // },
  },
});

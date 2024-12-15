import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      name: 'eweser-db',
      entry: resolve(__dirname, 'src/index.ts'),
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['yjs'],
    },
    minify: false, // for now while in development
  },
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

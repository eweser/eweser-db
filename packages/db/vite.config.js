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
      external: [
        //
      ],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: 'src/setupTests.ts',
    maxConcurrency: 3,
    // coverage: {
    //   reporter: ['text', 'json', 'html', 'lcov'],
    // },
  },
});

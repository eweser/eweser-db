import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      name: 'db',
      entry: resolve(__dirname, 'src/index.ts'),
    },
    rollupOptions: {
      // TODO: add matrix-crdt and sdk?
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['matrix-js-sdk'],
    },
  },
  test: {
    setupFiles: 'src/setupTests.ts',
    // coverage: {
    //   reporter: ['text', 'json', 'html', 'lcov'],
    // },
  },
});

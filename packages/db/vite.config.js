import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      name: 'eweser-db',
      entry: resolve(__dirname, 'src/index.ts'),
    },
    rollupOptions: {
      // TODO: add matrix-crdt and sdk?
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['yjs', '@syncedstore/core', 'matrix-crdt', 'matrix-js-sdk', 'y-indexeddb'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: 'src/setupTests.ts',
    // coverage: {
    //   reporter: ['text', 'json', 'html', 'lcov'],
    // },
  },
});

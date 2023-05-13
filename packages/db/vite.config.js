import { resolve } from 'path';
import { defineConfig } from 'vite';

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
  //@ts-expect-error
  test: {
    environment: 'jsdom',
    setupFiles: 'src/setupTests.ts',
    // coverage: {
    //   reporter: ['text', 'json', 'html', 'lcov'],
    // },
  },
});

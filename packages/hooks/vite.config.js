import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'eweser-hooks',
      formats: ['es', 'umd'],
      fileName: (format) => `eweser-hooks.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        '@eweser/db',
        '@syncedstore/react',
        '@syncedstore/core',
        'yjs',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@eweser/db': 'eweser-db',
          '@syncedstore/react': 'syncedstore-react',
        },
      },
    },
  },
});

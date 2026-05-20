import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import * as packageJson from './package.json';
// https://vitejs.dev/config/
export default defineConfig((configEnv) => ({
  plugins: [
    react(),
    dts({
      include: ['src/components/'],
    }) as any,
  ],
  build: {
    ...(process.env.EWESER_EXAMPLES_COMPONENTS_BUILD_WATCH === 'true'
      ? {
          watch: {
            chokidar: {
              usePolling: true,
            },
          },
        }
      : {}),
    lib: {
      entry: resolve('src', 'components/index.ts'),
      name: 'ReactViteLibrary',
      formats: ['es', 'umd'],
      fileName: (format) => `examples-components.${format}.js`,
    },
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.peerDependencies),
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
    },
  },
}));

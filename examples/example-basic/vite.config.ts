/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const port = Number(process.env.EXAMPLE_BASIC_PORT ?? '38110');

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@eweser/db': resolve(__dirname, '../../packages/db/src/index.ts'),
      '@eweser/examples-components': resolve(
        __dirname,
        '../../packages/examples-components/src/components/index.ts'
      ),
      '@eweser/shared': resolve(
        __dirname,
        '../../packages/shared/src/index.ts'
      ),
    },
  },

  build: {
    minify: false,
  },
  define: {
    global: 'window',
  },
  preview: {
    port,
  },
  server: {
    port,
  },
});

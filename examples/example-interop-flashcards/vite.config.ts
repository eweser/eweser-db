/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.EXAMPLE_INTEROP_FLASHCARDS_PORT ?? '38140');

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@eweser/examples-components':
        '../../packages/examples-components/src/components/index.ts',
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

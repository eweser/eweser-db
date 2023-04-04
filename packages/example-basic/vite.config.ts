/// <reference types="vite/client" />
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  build: {
    minify: false,
    rollupOptions: {
      plugins: [nodePolyfills()],
    },
  },
  define: {
    global: 'window',
  },
});

/// <reference types="vite/client" />
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    minify: false,
    rollupOptions: {
      //@ts-expect-error
      plugins: [nodePolyfills()],
    },
  },
  define: {
    global: 'window',
  },
  preview: {
    port: 8300,
  },
  server: {
    port: 8300,
  },
});

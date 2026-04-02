/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.EXAMPLE_BASIC_PORT ?? '38110');

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],

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
